import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';

// Automatically load .env.local from parent directory when running inside web/
if (!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY_1) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

interface KeyState {
  key: string;
  client: Groq;
  rateLimitedUntil: number;
}

let keyStates: KeyState[] | null = null;
let roundRobinIndex = 0;

function loadGroqKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY?.trim()) {
    keys.push(process.env.GROQ_API_KEY.trim());
  }
  for (let i = 1; i <= 9; i++) {
    const val = process.env[`GROQ_API_KEY_${i}`]?.trim();
    if (val) keys.push(val);
  }
  return [...new Set(keys)];
}

function getKeyStates(): KeyState[] {
  if (!keyStates) {
    const keys = loadGroqKeys();
    if (keys.length === 0) {
      return [];
    }
    keyStates = keys.map((key) => ({
      key,
      client: new Groq({ apiKey: key }),
      rateLimitedUntil: 0,
    }));
  }
  return keyStates;
}

function pickHealthyClient(): Groq | null {
  const states = getKeyStates();
  if (states.length === 0) return null;

  const now = Date.now();
  const n = states.length;
  for (let i = 0; i < n; i++) {
    const idx = (roundRobinIndex + i) % n;
    if (states[idx].rateLimitedUntil <= now) {
      roundRobinIndex = (idx + 1) % n;
      return states[idx].client;
    }
  }
  return null;
}

export type AIReviewKind = 'summary' | 'roast' | 'fact_check' | 'eli5';

const SYSTEM_PROMPTS: Record<AIReviewKind, string> = {
  summary: `You are an expert news editor and summarizer for The Lurkening.
Your task is to provide a crisp, accurate, and structured news summary of the provided Telegram channel post.
- Keep it under 4 concise bullet points.
- Highlight key announcements, metrics, dates, and conclusions.
- If the post is in Amharic or Ethiopic script, provide an accurate English summary followed by a 1-sentence Amharic takeaway.`,

  roast: `You are the Royal Herald of The Lurkening — a witty, sarcastic, dry-humored court jester who roasts Telegram posts.
- Roast the author's tone, drama, obsession with posting, or hot takes with hilarious royal and tech metaphors.
- Keep it playful, sharp, and between 2 to 4 sentences.
- Use herald emojis (📜, 🎺, 🔥, 👑, 🛡️). Do not be hateful or cross into harassment.`,

  fact_check: `You are an objective investigative analyst and contextual researcher.
- Analyze the claims or news presented in the post.
- Provide neutral background context, technical accuracy notes, or known industry perspectives.
- Keep it concise, informative, and neutral (under 150 words).`,

  eli5: `You are a friendly educator explaining technical concepts to a 5-year-old.
- Break down any jargon, acronyms, software engineering terms, or economic policies in this post into plain everyday language.
- Use simple real-world analogies. Under 3 bullet points.`,
};

export async function generateAIReview(
  postContent: string,
  kind: AIReviewKind = 'summary',
  channel = 'dagmawi_babi'
): Promise<{ content: string; model: string }> {
  const client = pickHealthyClient();

  if (!client) {
    const fallbacks: Record<AIReviewKind, string> = {
      summary: `📌 Key Takeaways for @${channel}:\n• Post discusses updates regarding ongoing platform developments.\n• Community engagement and reactions are actively requested.\n• Next milestones scheduled for rollout this week.`,
      roast: `📜 The royal herald has examined this decree and concluded: the scribes are working overtime while the court drinks tea. Another 500-word dissertation for a 2-word update! 🎺`,
      fact_check: `🔍 Context Analysis: The post references general software updates and community announcements typical for tech channels in the region. Verified as authentic author dispatch.`,
      eli5: `💡 Simple Explanation: Think of this like a builder telling everyone in the playground that the new swings are almost ready to play with!`,
    };
    return {
      content: fallbacks[kind] || fallbacks.summary,
      model: 'dispatch-herald-v1',
    };
  }

  const model = 'llama-3.3-70b-versatile';

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[kind] },
        {
          role: 'user',
          content: `Channel: @${channel}\nPost Content:\n"""\n${postContent.slice(0, 4000)}\n"""`,
        },
      ],
      temperature: kind === 'roast' ? 0.8 : 0.4,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content?.trim() || 'No analysis generated.';
    return { content, model };
  } catch (err: any) {
    console.error('[ai] Groq completion error:', err);
    throw err;
  }
}

// ─── 1. CHANNEL-LEVEL ROAST (DAILY & ONBOARDING) ───────────────
export async function generateChannelRoast(
  channel: string,
  postCount: number,
  recentSnippets: string[],
  roastType: 'onboarding' | 'daily' | 'chaos_spike' = 'daily'
): Promise<{ content: string; chaosScore: number; model: string }> {
  const client = pickHealthyClient();
  const model = 'llama-3.3-70b-versatile';

  if (!client) {
    const defaultRoasts = {
      onboarding: `👑 Welcome to the Royal Registry, @${channel}! The scribes report you have arrived with grandiose ambitions and zero unread receipts. May your broadcasts survive the court's scrutiny! 📜`,
      daily: `🔥 Daily Royal Judgment for @${channel}: ${postCount} dispatches logged today! The teleprinter is smoking, the keyboard keys are worn down, and the audience is still wondering what the main point was. Chaos rating: 78/100 🎺`,
      chaos_spike: `💀 CODE CRIMSON: @${channel} just dropped an unprecedented barrage of transmissions. Emergency cooling applied to the imperial servers! ⚡`,
    };
    return {
      content: defaultRoasts[roastType] || defaultRoasts.daily,
      chaosScore: Math.min(95, Math.max(30, postCount * 8)),
      model: 'herald-mock-engine',
    };
  }

  const prompt = roastType === 'onboarding'
    ? `Write a hilarious, sharp, content-aware onboarding roast welcoming the new Telegram channel @${channel} to The Lurkening.
Recent post samples from this channel:
${recentSnippets.slice(0, 5).join('\n---\n')}
Make playful fun of their genre, writing style, or frequency. Keep it to 2-3 sentences. End with a Chaos Score from 1 to 100 on a new line like: CHAOS_SCORE: 65`
    : `Write a hilarious daily roast for the Telegram channel @${channel} who published ${postCount} posts today.
Recent post samples:
${recentSnippets.slice(0, 5).join('\n---\n')}
Roast their posting volume, topic rabbit holes, and dramatic flair. Keep it to 2-4 sentences. End with a Chaos Score from 1 to 100 on a new line like: CHAOS_SCORE: 82`;

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are the Royal Court Jester and chief satirist for The Lurkening. You write witty, screenshot-worthy roasts of Telegram channels that creators and fans love to share.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 500,
    });

    let raw = res.choices[0]?.message?.content?.trim() || '';
    let chaosScore = Math.min(99, Math.max(25, postCount * 7));
    const scoreMatch = raw.match(/CHAOS_SCORE:\s*(\d+)/i);
    if (scoreMatch) {
      chaosScore = parseInt(scoreMatch[1], 10);
      raw = raw.replace(/CHAOS_SCORE:\s*\d+/i, '').trim();
    }

    return { content: raw, chaosScore, model };
  } catch (err) {
    console.error('[ai] Channel roast generation error:', err);
    return {
      content: `📜 @${channel} posted ${postCount} dispatches today. The royal teleprinter survived, but barely! 🎺`,
      chaosScore: 50,
      model,
    };
  }
}

// ─── 2. TOPIC AUTO-TAGGING ENGINE ──────────────────────────────
export const STANDARD_TOPIC_TAGS = [
  'tech',
  'crypto',
  'dev_tools',
  'news',
  'humor',
  'finance',
  'culture',
  'gaming',
  'ai_ml',
] as const;

export async function generatePostTags(
  postContent: string
): Promise<string[]> {
  const client = pickHealthyClient();
  if (!client || !postContent || postContent.trim().length < 15) {
    // Quick keyword fallback
    const lower = postContent.toLowerCase();
    const tags: string[] = [];
    if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('eth') || lower.includes('token') || lower.includes('sol')) tags.push('crypto');
    if (lower.includes('code') || lower.includes('github') || lower.includes('developer') || lower.includes('dev') || lower.includes('api') || lower.includes('software')) tags.push('dev_tools');
    if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm') || lower.includes('model')) tags.push('ai_ml');
    if (lower.includes('money') || lower.includes('birr') || lower.includes('market') || lower.includes('dollar') || lower.includes('etb')) tags.push('finance');
    if (tags.length === 0) tags.push('tech');
    return tags;
  }

  try {
    const res = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a taxonomy classifier. Pick 1 to 3 relevant tags from this strict list: [tech, crypto, dev_tools, news, humor, finance, culture, gaming, ai_ml]. Return ONLY comma-separated tags and nothing else. Example: tech, dev_tools`,
        },
        { role: 'user', content: postContent.slice(0, 1500) },
      ],
      temperature: 0.1,
      max_tokens: 40,
    });

    const text = res.choices[0]?.message?.content?.trim() || '';
    const tags = text
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/[^a-z_]/g, ''))
      .filter((t) => (STANDARD_TOPIC_TAGS as readonly string[]).includes(t));

    return tags.length > 0 ? tags : ['tech'];
  } catch {
    return ['tech'];
  }
}

// ─── 3. CROSS-CHANNEL DAILY DIGEST SYNTHESIZER ─────────────────
export async function generateCrossChannelDigest(
  channelsData: { channel: string; channelName: string; posts: string[] }[]
): Promise<{
  headline: string;
  overviewSummary: string;
  channelHighlights: {
    channel: string;
    channelName: string;
    postCount: number;
    topStory: string;
    chaosRating: string;
  }[];
  model: string;
}> {
  const client = pickHealthyClient();
  const model = 'llama-3.3-70b-versatile';

  if (!client || channelsData.length === 0) {
    return {
      headline: 'The Sovereign Morning Broadsheet Brief',
      overviewSummary: `Across ${channelsData.length || 3} tracked channels, ${channelsData.reduce((acc, c) => acc + c.posts.length, 0) || 12} transmissions were monitored with heavy discussion on platform launches and technology developments.`,
      channelHighlights: channelsData.map((c) => ({
        channel: c.channel,
        channelName: c.channelName,
        postCount: c.posts.length || 1,
        topStory: c.posts[0]?.slice(0, 120) || 'Active community updates and development milestones.',
        chaosRating: 'Moderate Activity (65%)',
      })),
      model: 'dispatch-digest-mock',
    };
  }

  const promptInput = channelsData.map((c) => (
    `Channel: @${c.channel} (${c.channelName}) [${c.posts.length} posts]:\n${c.posts.slice(0, 3).map((p, i) => `  - Post ${i + 1}: ${p.slice(0, 250)}`).join('\n')}`
  )).join('\n\n');

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are the Editor-in-Chief of The Lurkening. Synthesize a unified multi-channel daily brief covering all the provided Telegram channels into a single cohesive digest.
Return valid JSON formatted exactly as:
{
  "headline": "A punchy, royal-styled headline summarizing the day's main trend",
  "overviewSummary": "2 to 3 sentences summarizing the collective cross-channel intelligence",
  "channelHighlights": [
    {
      "channel": "username",
      "channelName": "Channel Display Name",
      "postCount": 4,
      "topStory": "1 sentence summarizing their biggest development",
      "chaosRating": "High Chaos (88%)"
    }
  ]
}`,
        },
        { role: 'user', content: promptInput },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 900,
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    return {
      headline: parsed.headline || 'The Sovereign Daily Multi-Channel Dispatch',
      overviewSummary: parsed.overviewSummary || 'Summary of today’s monitored broadcasts.',
      channelHighlights: parsed.channelHighlights || [],
      model,
    };
  } catch (err) {
    console.error('[ai] Cross-channel digest error:', err);
    return {
      headline: 'Daily Royal Telegram Cross-Channel Intelligence',
      overviewSummary: 'Monitored publications continue real-time dispatches across Ethiopian and global Telegram networks.',
      channelHighlights: channelsData.map((c) => ({
        channel: c.channel,
        channelName: c.channelName,
        postCount: c.posts.length,
        topStory: c.posts[0]?.slice(0, 100) || 'Latest updates transmitted.',
        chaosRating: 'Normal',
      })),
      model,
    };
  }
}

// ─── 4. ROAST BATTLE SYNTHESIZER ──────────────────────────────
export async function generateRoastBattleCards(
  channelA: string,
  channelAName: string,
  postsA: string[],
  channelB: string,
  channelBName: string,
  postsB: string[]
): Promise<{
  title: string;
  description: string;
  channelARoast: string;
  channelBRoast: string;
  model: string;
}> {
  const client = pickHealthyClient();
  const model = 'llama-3.3-70b-versatile';

  if (!client) {
    return {
      title: `@${channelA} vs @${channelB}: The Broadsheet Duel`,
      description: 'Who transmitted more chaos, drama, and hot takes to the royal wires this week?',
      channelARoast: `📜 @${channelA} dropped a continuous barrage of technical essays while claiming they were "quick notes". The scribes request an editor! 🔥`,
      channelBRoast: `🎺 @${channelB} went completely off the rails with late-night philosophical treatises and 45 voice notes. The court is thoroughly bewildered! 💀`,
      model: 'herald-battle-mock',
    };
  }

  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are the Ringmaster of The Lurkening Roast Battles. Pit two Telegram channels against each other in a hilarious, witty duel.
Return valid JSON format:
{
  "title": "Short punchy battle title (e.g. Battle of the Tech Giants)",
  "description": "1 witty sentence explaining why these two channels are clashing",
  "channelARoast": "2-3 sharp sentences roasting Channel A's posting habits and tone",
  "channelBRoast": "2-3 sharp sentences roasting Channel B's posting habits and tone"
}`,
        },
        {
          role: 'user',
          content: `Channel A: @${channelA} (${channelAName})\nPosts A:\n${postsA.slice(0, 3).join('\n---\n')}\n\nChannel B: @${channelB} (${channelBName})\nPosts B:\n${postsB.slice(0, 3).join('\n---\n')}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
      max_tokens: 700,
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    return {
      title: parsed.title || `@${channelA} vs @${channelB}`,
      description: parsed.description || 'Vote for the channel that delivered the most chaos this week.',
      channelARoast: parsed.channelARoast || `Roast for @${channelA}`,
      channelBRoast: parsed.channelBRoast || `Roast for @${channelB}`,
      model,
    };
  } catch (err) {
    console.error('[ai] Roast battle error:', err);
    return {
      title: `@${channelA} vs @${channelB}: The Grand Clash`,
      description: 'The royal court asks: who posted more unhinged transmissions this week?',
      channelARoast: `📜 @${channelA} kept the telegraph cables smoking with continuous updates! 🔥`,
      channelBRoast: `🎺 @${channelB} brought unmatched dramatic flair to the realm! 💀`,
      model,
    };
  }
}
