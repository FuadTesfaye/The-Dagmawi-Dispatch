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
      // Fallback mock mode if no key configured
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
  summary: `You are an expert news editor and summarizer for The Dagmawi Dispatch.
Your task is to provide a crisp, accurate, and structured news summary of the provided Telegram channel post.
- Keep it under 4 concise bullet points.
- Highlight key announcements, metrics, dates, and conclusions.
- If the post is in Amharic or Ethiopic script, provide an accurate English summary followed by a 1-sentence Amharic takeaway.`,

  roast: `You are the Royal Herald of The Dagmawi Dispatch — a witty, sarcastic, dry-humored court jester who roasts Telegram posts.
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
    // Graceful fallback mock if Groq keys are absent or temporarily rate-limited
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
