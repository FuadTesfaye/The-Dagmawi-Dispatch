import { writeDb, withReadDb } from "@/db";
import { posts, roastHistory } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ensureChannelScraped } from "./telegram/scraper";
import { createGroqCompletion } from "./groq-pool";
import {
  ROAST_SYSTEM_PROMPT,
  CHANNEL_ONBOARDING_ROAST_PROMPT,
  roastLines,
} from "./roast-prompts";

const MODEL = "llama-3.3-70b-versatile";
const MIN_WORDS = 10;
const MAX_WORDS = 60;
const MAX_SENTENCES = 3;
const RECENT_ROAST_LIMIT = 10;

const inflightRoasts = new Map<string, Promise<string>>();

function getEATDateStr(offsetDays = 0): string {
  const now = new Date();
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  eat.setDate(eat.getDate() + offsetDays);
  return eat.toISOString().split("T")[0];
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function getWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function isTooSimilar(line: string, recent: string[]): boolean {
  const norm = normalizeForCompare(line);
  if (!norm) return true;
  const lineWords = getWords(line);
  if (lineWords.size === 0) return true;

  for (const prev of recent) {
    const prevNorm = normalizeForCompare(prev);
    if (!prevNorm) continue;
    if (norm === prevNorm) return true;

    const prevWords = getWords(prev);
    if (prevWords.size === 0) continue;

    let intersection = 0;
    for (const w of lineWords) {
      if (prevWords.has(w)) intersection++;
    }
    const union = new Set([...lineWords, ...prevWords]).size;
    const jaccard = union > 0 ? intersection / union : 0;
    if (jaccard > 0.65) return true;
  }
  return false;
}

export function sanitizeRoastLine(raw: string): string | null {
  let line = raw.trim();
  if (!line) return null;

  // Strip markdown wrappers, quotes, preambles
  line = line.replace(/^["'`]+|["'`]+$/g, "");
  line = line.replace(/^(roast:|here's your roast:|here is your roast:|first impression:)\s*/i, "");
  line = line.replace(/\*\*/g, "").replace(/\*/g, "");
  line = line.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  line = line.replace(/^["'`]+|["'`]+$/g, "").trim();
  line = line.replace(/\s+/g, " ");

  const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [line];
  line = sentences.slice(0, MAX_SENTENCES).join(" ").trim();

  const words = wordCount(line);
  if (!line || words < MIN_WORDS || words > MAX_WORDS) return null;
  return line;
}

async function getRecentRoasts(channel: string, limit = RECENT_ROAST_LIMIT): Promise<string[]> {
  try {
    const rows = await withReadDb((db) =>
      db
        .select({ line: roastHistory.line })
        .from(roastHistory)
        .where(eq(roastHistory.channel, channel))
        .orderBy(desc(roastHistory.created_at))
        .limit(limit)
        .execute(),
    );
    return rows.map((r) => r.line);
  } catch {
    return [];
  }
}

async function saveRoast(channel: string, line: string, kind: "daily" | "onboarding"): Promise<void> {
  try {
    await writeDb.insert(roastHistory).values({ channel, line, kind }).execute();
    await writeDb.execute(sql`
      DELETE FROM roast_history
      WHERE id IN (
        SELECT id FROM roast_history
        WHERE channel = ${channel}
        ORDER BY created_at DESC
        OFFSET ${RECENT_ROAST_LIMIT}
      )
    `);
  } catch {
    // non-fatal
  }
}

async function getTodayPostCount(channel: string): Promise<number> {
  const localDate = getEATDateStr(0);
  const rows = await withReadDb((db) =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.channel, channel), eq(posts.local_date, localDate)))
      .execute(),
  );
  return rows[0]?.count ?? 0;
}

type PostRow = { text: string | null; media_type: string };

function buildPostSample(recentPosts: PostRow[], limit = 10): string {
  return recentPosts
    .slice(0, limit)
    .map((p) => {
      let content = "";
      if (p.media_type !== "none") content += `[${p.media_type}] `;
      if (p.text) {
        content += p.text.length > 180 ? p.text.substring(0, 180) + "..." : p.text;
      }
      if (!content.trim()) content = "[media post with no text]";
      return content;
    })
    .join("\n---\n");
}

async function fetchRecentPosts(channel: string, limit = 20): Promise<PostRow[]> {
  await ensureChannelScraped(channel);
  return withReadDb((db) =>
    db
      .select({ text: posts.text, media_type: posts.media_type })
      .from(posts)
      .where(eq(posts.channel, channel))
      .orderBy(desc(posts.date))
      .limit(limit)
      .execute(),
  );
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function pickFallbackRoast(n: number, recent: string[], channel = "this channel"): string {
  const cleanChannel = channel.replace(/^@/, "");
  const shuffled = [...roastLines].sort(() => Math.random() - 0.5);
  for (const template of shuffled) {
    const line = template
      .replace(/\{n\}/g, String(n))
      .replace(/\{channel\}/g, cleanChannel);
    if (!isTooSimilar(line, recent)) return line;
  }
  return shuffled[0]
    .replace(/\{n\}/g, String(n))
    .replace(/\{channel\}/g, cleanChannel);
}

async function callGroqRoast(systemPrompt: string, extraUserHint?: string): Promise<string | null> {
  try {
    const completion = await createGroqCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...(extraUserHint ? [{ role: "user" as const, content: extraUserHint }] : []),
      ],
      model: MODEL,
      temperature: 1.05,
      max_tokens: 140,
    });
    return completion.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function generateWithPrompt(
  channel: string,
  template: string,
  n: number,
  kind: "daily" | "onboarding",
  extraVars: Record<string, string> = {},
  prefetchedRecent?: string[],
): Promise<string> {
  const recent = prefetchedRecent ?? (await getRecentRoasts(channel));
  const recentBlock = recent.length > 0 ? recent.join("\n") : "None yet.";

  const prompt = interpolate(template, {
    channelName: `@${channel}`,
    ...extraVars,
    recentRoasts: recentBlock,
    n: String(n),
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const hint =
      attempt === 1
        ? "Make it sharper, darker, more unhinged, and totally different from previous angles. 1-3 punchy sentences."
        : undefined;
    const raw = await callGroqRoast(prompt, hint);
    if (!raw) break;

    const line = sanitizeRoastLine(raw);
    if (line && !isTooSimilar(line, recent)) {
      await saveRoast(channel, line, kind);
      return line;
    }
  }

  const fallback = pickFallbackRoast(n, recent, channel);
  await saveRoast(channel, fallback, kind);
  return fallback;
}

export async function generateDailyRoast(channel: string): Promise<string> {
  const cleanChannel = channel.replace(/^@/, "");
  const inflightKey = `daily:${cleanChannel}`;

  const existing = inflightRoasts.get(inflightKey);
  if (existing) return existing;

  const work = (async () => {
    const [n, recentPosts, recent] = await Promise.all([
      getTodayPostCount(cleanChannel).catch(() => 0),
      fetchRecentPosts(cleanChannel, 8).catch(() => []),
      getRecentRoasts(cleanChannel),
    ]);
    const postSample =
      recentPosts.length > 0 ? buildPostSample(recentPosts, 6) : "No recent posts available.";
    return generateWithPrompt(
      cleanChannel,
      ROAST_SYSTEM_PROMPT,
      n,
      "daily",
      {
        channelName: `@${cleanChannel}`,
        postSample,
      },
      recent,
    );
  })();

  inflightRoasts.set(inflightKey, work);
  try {
    return await work;
  } finally {
    inflightRoasts.delete(inflightKey);
  }
}

export async function generateOnboardingRoast(
  channel: string,
  channelName?: string,
): Promise<string> {
  const cleanChannel = channel.replace(/^@/, "");
  const displayName = channelName ?? `@${cleanChannel}`;

  let postSample = "No posts available yet.";
  let n = 0;
  try {
    const recentPosts = await fetchRecentPosts(cleanChannel, 15);
    n = recentPosts.length;
    if (recentPosts.length > 0) {
      postSample = buildPostSample(recentPosts, 10);
    }
  } catch {
    // use empty postSample
  }

  return generateWithPrompt(cleanChannel, CHANNEL_ONBOARDING_ROAST_PROMPT, n, "onboarding", {
    channelName: displayName,
    postSample,
  });
}

/** @deprecated Use generateDailyRoast */
export async function generatePersonalizedRoast(channel: string): Promise<string> {
  return generateDailyRoast(channel);
}

export function generateStaticRoast(channel: string): string {
  const n = Math.floor(Math.random() * 40) + 1;
  return pickFallbackRoast(n, [], channel);
}

// ─── EXCUSES ────────────────────────────────────────────────────

export const EXCUSES = [
  "Tell them: 'My battery passed away peacefully in its sleep after opening @{channel}. Please respect our privacy during this difficult time.'",
  "Tell them: 'I was trapped in a digital hostage crisis caused by @{channel}'s 40-post spam storm. The negotiators only just got me out.'",
  "Tell them: 'I tried to open @{channel}, but my screen time alert called child protective services on my phone.'",
  "Tell them: 'My doctor diagnosed me with acute notification trauma and ordered an immediate quarantine from @{channel}.'",
  "Tell them: 'I was listening to @{channel}'s latest voice note, but I ran out of oxygen around minute seven.'",
  "Tell them: 'A wild hyena ate my phone before I could read the Dispatch. Betam (very) tragic, but unavoidable.'",
  "Tell them: 'I outsourced reading @{channel} to an AI. The AI had a nervous breakdown and joined a monastery.'",
  "Tell them: 'I stared into the void of @{channel}'s unread messages, and the void asked me to turn on airplane mode.'",
  "Tell them: 'My phone overheated from the sheer volume of @{channel}'s hot takes. The Addis Ababa fire department is currently on scene.'",
  "Tell them: 'I promised myself I would touch grass today instead of doomscrolling @{channel}'s existential crises.'",
  "Tell them: 'I was busy translating @{channel}'s latest 14-part audio message into interpretive dance for emotional closure.'",
  "Tell them: 'The royal scrolls were delayed by rain in Addis, an existential crisis, and my complete lack of willpower.'",
  "Tell them: 'I opened Telegram, saw the wall of text from @{channel}, and my soul detached from my physical body. Ayzosh.'",
  "Tell them: 'I tried to read it, but my thumb developed severe tendonitis on post number twelve.'",
  "Tell them: 'I'm saving @{channel}'s posts for my retirement. I will finally have the 400 uninterrupted hours required to catch up.'",
  "Tell them: 'My phone fell off the nightstand from vibrating so hard and slipped into another dimension.'",
  "Tell them: 'I read the summary, but the sheer chaos wiped my short-term memory. Chigger yellem (no problem).'",
  "Tell them: 'I was on a spiritual silent retreat from @{channel}'s relentless broadcast energy.'",
];

export function generateExcuse(channel: string): string {
  const excuse = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
  return excuse.replace(/@{channel}/g, channel.replace(/^@/, ""));
}

