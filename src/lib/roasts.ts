import { writeDb, withReadDb } from "@/db";
import { posts, roastHistory } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ensureChannelScraped } from "./telegram/scraper";
import { aiPool } from "./concurrency-pool";
import { createGroqCompletion } from "./groq-pool";
import {
  ROAST_SYSTEM_PROMPT,
  CHANNEL_ONBOARDING_ROAST_PROMPT,
  roastLines,
} from "./roast-prompts";

const MODEL = "llama-3.3-70b-versatile";
const MIN_WORDS = 18;
const MAX_WORDS = 45;
const MAX_SENTENCES = 3;
const RECENT_ROAST_LIMIT = 10;

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

function isTooSimilar(line: string, recent: string[]): boolean {
  const norm = normalizeForCompare(line);
  if (!norm) return true;
  for (const prev of recent) {
    const prevNorm = normalizeForCompare(prev);
    if (!prevNorm) continue;
    if (norm === prevNorm) return true;
    if (norm.includes(prevNorm) || prevNorm.includes(norm)) return true;
  }
  return false;
}

export function sanitizeRoastLine(raw: string): string | null {
  let line = raw.trim();
  if (!line) return null;

  // Strip markdown wrappers and emoji
  line = line.replace(/^["'`]+|["'`]+$/g, "");
  line = line.replace(/\*\*/g, "").replace(/\*/g, "");
  line = line.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();

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
        .execute()
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
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.channel, channel), eq(posts.local_date, localDate)))
      .execute()
  );
  return rows.length;
}

type PostRow = { text: string | null; media_type: string };

function buildPostSample(recentPosts: PostRow[], limit = 15): string {
  return recentPosts.slice(0, limit).map((p) => {
    let content = "";
    if (p.media_type !== "none") content += `[${p.media_type}] `;
    if (p.text) {
      content += p.text.length > 200 ? p.text.substring(0, 200) + "..." : p.text;
    }
    if (!content.trim()) content = "[media post with no text]";
    return content;
  }).join("\n---\n");
}

async function fetchRecentPosts(channel: string, limit = 25): Promise<PostRow[]> {
  await ensureChannelScraped(channel);
  return withReadDb((db) =>
    db
      .select({ text: posts.text, media_type: posts.media_type })
      .from(posts)
      .where(eq(posts.channel, channel))
      .orderBy(desc(posts.date))
      .limit(limit)
      .execute()
  );
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function pickFallbackRoast(n: number, recent: string[]): string {
  const shuffled = [...roastLines].sort(() => Math.random() - 0.5);
  for (const template of shuffled) {
    const line = template.replace(/\{n\}/g, String(n));
    if (!isTooSimilar(line, recent)) return line;
  }
  return shuffled[0].replace(/\{n\}/g, String(n));
}

async function callGroqRoast(systemPrompt: string, extraUserHint?: string): Promise<string | null> {
  try {
    return await aiPool.run(async () => {
      const completion = await createGroqCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          ...(extraUserHint ? [{ role: "user" as const, content: extraUserHint }] : []),
        ],
        model: MODEL,
        temperature: 1,
        max_tokens: 120,
      });
      return completion.choices[0]?.message?.content ?? null;
    });
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
    ...extraVars,
    recentRoasts: recentBlock,
    n: String(n),
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const hint =
      attempt === 1
        ? "Your last attempt was too similar or too short. Write 2-3 sentences, 25-45 words, and pick a completely different angle."
        : undefined;
    const raw = await callGroqRoast(prompt, hint);
    if (!raw) break;

    const line = sanitizeRoastLine(raw);
    if (line && !isTooSimilar(line, recent)) {
      await saveRoast(channel, line, kind);
      return line;
    }
  }

  const fallback = pickFallbackRoast(n, recent);
  await saveRoast(channel, fallback, kind);
  return fallback;
}

export async function generateDailyRoast(channel: string): Promise<string> {
  const cleanChannel = channel.replace(/^@/, "");

  const [n, recent] = await Promise.all([
    getTodayPostCount(cleanChannel).catch(() => 0),
    getRecentRoasts(cleanChannel),
  ]);

  return generateWithPrompt(cleanChannel, ROAST_SYSTEM_PROMPT, n, "daily", {}, recent);
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
    const recentPosts = await fetchRecentPosts(cleanChannel);
    n = recentPosts.length;
    if (recentPosts.length > 0) {
      postSample = buildPostSample(recentPosts);
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
  return pickFallbackRoast(n, []);
}

// ─── EXCUSES ────────────────────────────────────────────────────

export const EXCUSES = [
  "Tell them: 'A wild hyena ate my phone before I could read the Dispatch. Betam (very) tragic.'",
  "Tell them: 'I was busy translating @{channel}'s latest 14-part audio message into interpretive dance.'",
  "Tell them: 'The royal scrolls were delayed by rain in Addis. And also by my laziness. Mostly the laziness.'",
  "Tell them: 'I read the summary but my memory got wiped by the sheer volume of their posts. Chigger yellem (no problem).'",
  "Tell them: 'I was on a spiritual retreat. From notifications.'",
  "Tell them: 'My phone died mid-scroll. It couldn't handle the weight of @{channel}'s wisdom.'",
  "Tell them: 'I DID read it. All of it. I just... blacked out from information overload. Ayzosh (take courage).'",
  "Tell them: 'I'm saving the posts for retirement. I'll have plenty of time then.'",
  "Tell them: 'Mercury was in retrograde and my Telegram stopped working. Science.'",
  "Tell them: 'I tried to open the channel but @{channel} had posted so much my phone needed a runway to scroll.'",
  "Tell them: 'I was reading @{channel} but then I blinked and 84 new messages appeared. My eyes gave up.'",
  "Tell them: 'I outsourced my reading to a bot. The bot quit.'",
  "Tell them: 'My screen cracked from the weight of @{channel}'s opinions. Insurance won't cover it.'",
  "Tell them: 'I was going to read it but then I remembered I have a finite lifespan.'",
  "Tell them: 'I started reading but accidentally fell into a Wikipedia rabbit hole. Somehow less chaotic.'",
];

export function generateExcuse(channel: string): string {
  const excuse = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
  return excuse.replace(/@{channel}/g, channel);
}
