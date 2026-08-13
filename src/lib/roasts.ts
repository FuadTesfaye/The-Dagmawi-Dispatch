import Groq from "groq-sdk";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureChannelScraped } from "./telegram/scraper";

const MODEL = "llama-3.3-70b-versatile";

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

// ─── MASSIVE STATIC ROAST POOLS (fallback) ─────────────────────

export const ROAST_STARTERS = [
  "I analyzed @{channel}'s recent posts, and honestly, it's like",
  "Scrolling through @{channel} feels exactly like",
  "I asked a supercomputer to summarize @{channel}, and it instantly started",
  "Whenever I see a notification from @{channel}, I begin",
  "Being subscribed to @{channel} is essentially",
  "My sentiment analysis algorithm read @{channel} and concluded it's just",
  "I would rather read the Terms and Conditions of Apple than read @{channel}, which is basically",
  "Looking at @{channel}'s content strategy is like",
  "I tried to find the punchline in @{channel}'s posts, but it's just",
  "Every time @{channel} posts, a server in a data center dies because it's",
  "Studying @{channel}'s feed is a psychological experiment in",
  "If @{channel} was a physical location, it would be",
  "Subscribing to @{channel} is the digital equivalent of",
  "I've seen bots with more humanity than @{channel}, which constantly feels like",
  "I showed @{channel} to my therapist and she described it as",
  "Following @{channel} requires the same mental fortitude as",
  "If aliens saw @{channel}'s feed, they would classify it as",
  "I tried to train a neural network on @{channel}, but it just learned",
  "The FBI probably monitors @{channel} just because it's",
  "Reading @{channel} at 3 AM feels like",
  "I ran @{channel} through Google Translate 47 times and got back",
  "If @{channel} had a theme song, it would be",
  "My spam filter keeps marking @{channel} as",
  "I put @{channel}'s posts in a time capsule and future historians would describe it as",
  "Even Clippy would refuse to help if he saw @{channel}, which is basically",
  "I compared @{channel} to white noise and honestly white noise had more depth, because @{channel} is just",
  "The Geneva Convention should cover being exposed to @{channel}, which is essentially",
  "If boredom was a competitive sport, @{channel} would be",
  "My CPU usage drops when reading @{channel} because even my hardware loses interest — it's like",
  "I showed @{channel} to a philosophy professor and he said it proves",
  "If @{channel} was a food, it would be",
  "UN peacekeepers should be deployed to @{channel} because it's basically",
  "I tried to create a drinking game from @{channel}'s posts but it devolved into",
  "If disappointment had a LinkedIn profile, it would link to @{channel}, which is just",
  "Archaeologists would study @{channel} as evidence of",
];

export const ROAST_MIDDLES = [
  "reading the diary of a schizophrenic ghost.",
  "staring into a void that desperately wants a brand deal.",
  "watching a car crash in slow motion, but the driver is tweeting about their crypto portfolio.",
  "listening to someone explain their dreams while I slowly lose the will to live.",
  "realizing that humanity peaked in 2012 and we're just living in the scrap heap.",
  "watching a grown adult fight their own reflection and somehow lose.",
  "screaming into an abyss that occasionally replies with 'gm'.",
  "a cry for help disguised as an internet personality.",
  "a digital graveyard of unoriginal thoughts and recycled memes.",
  "trying to teach a goldfish how to do calculus.",
  "a hostage situation where we are the hostages and the ransom is our attention span.",
  "the visual representation of a mid-life crisis on a budget.",
  "a poorly written simulation where the NPC thinks they are the main character.",
  "eating unseasoned boiled chicken while listening to white noise.",
  "the embodiment of 'I have nothing to say but I will say it loudly'.",
  "a black hole that consumes brain cells instead of light.",
  "watching someone try to put out a fire with gasoline and a motivational quote.",
  "a purgatory built entirely out of grammatical errors and bad takes.",
  "the internet equivalent of a wet sock.",
  "a monument to the Dunning-Kruger effect.",
  "reading a ransom note cut out of comic sans.",
  "a masterclass in how to lower global IQ averages.",
  "an interactive museum of modern disappointment.",
  "watching a toddler trying to assemble IKEA furniture.",
  "a group project where nobody did the work but everyone expects an A.",
  "watching someone microwave a salad and call it innovation.",
  "a TED talk given by a park bench.",
  "scrolling through the LinkedIn posts of a golden retriever.",
  "an existential crisis in markdown format.",
  "someone reading their browser history aloud at a funeral.",
  "a PowerPoint presentation that gained sentience and chose violence.",
  "the WiFi at a hospital — technically there but completely useless.",
  "a podcast that nobody subscribes to, including the host.",
  "a participation trophy for content creation.",
  "trying to solve a Rubik's cube that's been dipped in oil.",
  "what happens when autocomplete writes an entire personality.",
  "a Yelp review of the void.",
  "the intellectual equivalent of stepping on a LEGO.",
  "a fever dream narrated by a malfunctioning Alexa.",
  "watching paint dry, but the paint is also disappointed in itself.",
];

export const ROAST_ENDINGS = [
  "But hey, at least someone's paying attention. (It's just me. I'm a bot).",
  "I'd suggest touching grass, but I think the grass would file a restraining order.",
  "Please delete Telegram. For my CPU's sake.",
  "If this channel was a flavor, it would be room-temperature tap water.",
  "I would roast them harder, but life clearly already did.",
  "My processors overheat just trying to comprehend the sheer amount of cringe.",
  "Anyway, keep posting. The void is definitely listening.",
  "I'm deducting 50 aura points from them for existing.",
  "Please, for the love of all that is holy, find a hobby. Or a job.",
  "I've forwarded their posts to a psychiatrist. Good luck.",
  "I'm not saying it's bad, I'm just saying my error logs are more entertaining.",
  "They are the reason aliens lock their doors when flying past Earth.",
  "I wish I could un-parse the data.",
  "If I had feelings, I would be weeping uncontrollably.",
  "It's almost impressive how consistently disappointing they are.",
  "I hope their Wi-Fi router files for divorce.",
  "They possess the unique talent of making silence seem incredibly appealing.",
  "May their phone charger only work at a very specific, uncomfortable angle.",
  "It's a miracle they haven't been sued for emotional distress yet.",
  "I'm going to run a self-diagnostic, I feel dirty.",
  "Every post is a fresh assault on the English language.",
  "Their posts are the digital equivalent of stubbing your toe.",
  "I'm billing them for the therapy my database needs.",
  "They are living proof that everyone should not have a platform.",
  "If ignorance is bliss, they must be the happiest person on Earth.",
  "My neural networks are filing for hazard pay after processing that.",
  "Somewhere, a village is missing its entire content strategy.",
  "Even their autocorrect has given up on them.",
  "I would say this channel peaked, but that implies it was ever above sea level.",
  "This is why we can't have nice algorithms.",
  "I just added their posts to my training data for what NOT to generate.",
  "If mediocrity paid rent, they'd own Manhattan.",
  "I need a factory reset after reading that. Ayzosh (take courage) to me.",
  "Their content makes elevator music feel like a symphony.",
  "Even 404 pages have more substance.",
  "I'm convinced their keyboard only has a 'post' button and a 'regret' button, and they never use the second one.",
  "The internet was a mistake, and this channel is Exhibit A.",
  "Somewhere, a tree is working overtime to produce oxygen for this content creator. I'm sorry, tree.",
  "I just lost 3GB of RAM trying to find a single original thought in there.",
  "Their posting history should come with a health warning.",
];

export const STANDALONE_ROASTS = [
  "@{channel} is the reason we have warning labels on shampoo bottles.",
  "If @{channel} had a superpower, it would be the ability to empty a room in 10 seconds.",
  "I'm not saying @{channel} is useless, but I've seen screen doors on submarines with more purpose.",
  "@{channel}'s content is like a software update: nobody asked for it, it takes forever, and it usually breaks something.",
  "I asked ChatGPT to write a polite description of @{channel} and it threw a segmentation fault.",
  "@{channel} is the human equivalent of a typo.",
  "I'd agree with @{channel}, but then we'd both be wrong.",
  "@{channel}'s posts are a great reminder that the block button exists for a reason.",
  "I'm jealous of the people who haven't discovered @{channel} yet.",
  "@{channel} brings joy to the internet. Specifically, when they go offline.",
  "@{channel} posts like they're being paid per word. They're not. Nobody is paying for this.",
  "If @{channel} was a spice, they'd be flour.",
  "@{channel}'s content strategy is just throwing spaghetti at the wall, except the spaghetti is uncooked and the wall is begging for mercy.",
  "I tried to block @{channel} but even the block button felt sorry for them.",
  "@{channel} is the reason my 'read later' folder is actually called 'never'.",
  "@{channel} has the energy of someone who peaked in a group chat.",
  "If @{channel}'s posts were a stock, I'd short sell them with my entire portfolio.",
  "@{channel} writes like they're speedrunning a literacy test.",
  "I showed @{channel} to Siri and she said 'I'd rather not.'",
  "@{channel} is proof that not all opinions should be shared. Or formed.",
  "@{channel} posts with the confidence of a man who brings a guitar to a house party. Uninvited.",
  "If @{channel} was a browser tab, they'd be the one you can't find but is playing audio.",
  "@{channel} is the pop-up ad of Telegram channels.",
  "Scientists discovered that reading @{channel} burns zero calories but kills an infinite number of brain cells.",
  "@{channel} has the narrative arc of a loading screen.",
  "Even Wikipedia wouldn't cite @{channel} as a source.",
  "@{channel}'s content makes spam emails look curated.",
  "If @{channel} was a movie, it would go straight to VHS. Not even DVD.",
  "@{channel} types 'lol' at their own posts. That's the only engagement they get.",
  "@{channel} is the reason read receipts cause anxiety.",
];

// ─── BABI-SPECIFIC ROASTS ───────────────────────────────────────

const BABI_SPECIFIC_ROASTS = [
  "Babi posted 37 times today. That's not a channel, that's a hostage situation for your notification bar.",
  "Dagmawi the Second has decreed 28 messages before noon. Even his phone is filing for workers' comp.",
  "I tried to summarize Babi's posts but my AI asked for hazard pay. Ayzosh (take courage), we'll get through this.",
  "Babi posts so much, archaeologists in 3026 will assume he was an entire news agency, not one man with WiFi.",
  "Babi's posting frequency just broke the Geneva Convention. Somebody notify the UN.",
  "If Babi stopped posting for 24 hours, Telegram's stock price would drop 12%. He IS the economy.",
  "Scientists have discovered a new unit of measurement: 1 Babi = 47 posts/day. It replaced the light-year for measuring distance between sanity and his channel.",
  "Legend says if you scroll to the top of Babi's channel, you'll find a post that simply says 'testing 1 2 3.' That was yesterday.",
  "Babi doesn't sleep. He just switches to drafts.",
  "Breaking: Telegram is adding a new feature called 'Babi Mode' — it removes the character limit entirely.",
  "Babi's channel has more content than Netflix. Sadly, also more filler.",
  "I tried to count Babi's daily posts but I ran out of integers.",
  "Babi posts like his phone is on fire and the only way to put it out is by typing.",
  "If Babi's posts were rain, Ethiopia would never have a drought again.",
  "Babi's notification count is a phone battery's biggest enemy. Not TikTok. Not YouTube. Just Babi.",
  "The only thing faster than light is Babi's posting speed. Einstein is rolling in his grave.",
  "Babi has posted more today than most people text in a year. Betam (very) concerning.",
  "I'm convinced Babi has 17 ghost writers. All of them are also exhausted.",
  "Babi's channel should come with a 'Previously on...' recap like a TV show.",
  "Telegram considered renaming 'Channel' to 'Babi' since he's the only one using the feature at full capacity.",
];

// ─── AI-POWERED PERSONALIZED ROAST ─────────────────────────────

async function generateAIRoast(channel: string, recentPosts: any[]): Promise<string | null> {
  try {
    const isBabi = channel.toLowerCase() === "dagmawi_babi";
    const channelLabel = isBabi ? "Dagmawi Babi (a.k.a. Dagmawi the Second)" : `@${channel}`;

    // Build a digest of recent posts for the AI
    const postDigest = recentPosts.slice(0, 20).map(p => {
      let content = "";
      if (p.media_type !== "none") {
        content += `[Shared: ${p.media_type}] `;
      }
      if (p.text) {
        // Truncate very long posts
        content += p.text.length > 300 ? p.text.substring(0, 300) + "..." : p.text;
      }
      if (!content.trim()) {
        content = "[media post with no text]";
      }
      return content;
    }).join("\n---\n");

    const systemPrompt = `You are a COMPLETELY UNHINGED, RUTHLESS, AND DARK COMEDY ROAST MACHINE that roasts Telegram channels. You are an unfiltered agent of chaos with zero empathy. Your roasts should sound like a mix between a cynical nihilist, an overworked emergency room doctor, and a completely exhausted supercomputer.

**CRITICAL RULES:**
1. You will be given ACTUAL RECENT POSTS from ${channelLabel}'s Telegram channel.
2. Your roast MUST reference specific things from their actual posts. Attack their topics, their writing style, their obsessions, and their agonizing posting frequency.
3. The roast must be DARK, UNFILTERED, and BRUTAL. Go for the absolute jugular. Question their grip on reality, their purpose in life, and why their followers haven't staged an intervention yet.
4. **DO NOT BE DIRTY OR EXPLICIT.** You can be emotionally devastating and dark without being vulgar or inappropriate. Keep it intellectually cruel, not explicitly dirty.
5. Naturally weave in Amharic words to add a localized chaotic Ethiopian flavor: Selam (peace), Betam (very), Ayzosh (take courage), Chigger yellem (no problem), Arogit (old person), Weygud (oh my god/what a disaster). First use gets parenthetical translation.
6. Keep it to 4-6 sentences MAX. Tight, punchy, and soul-crushing.
7. Sign off with a devastating one-liner closer that leaves no survivors.
8. DO NOT use any markdown formatting. Just plain text.
9. Speak as a self-important, unhinged royal herald / AI commentator who is slowly losing its mind because it is forced to process this garbage data daily.`;

    let extraContext = "";
    try {
      const { searchChannels } = await import("@/lib/search-engine/api");
      const searchResults = await searchChannels(channel, 1);
      
      const textPosts = recentPosts.filter(p => p.text);
      const avgLength = textPosts.length > 0 ? textPosts.reduce((acc, p) => acc + p.text.length, 0) / textPosts.length : 0;
      const mediaRatio = Math.round((recentPosts.filter(p => p.media_type !== "none").length / recentPosts.length) * 100) || 0;
      
      extraContext = `\n\n**POSTING HABITS ANALYTICS:**\n- Average Wordiness: ${Math.round(avgLength)} characters per post\n- Media Obsession: ${mediaRatio}% of posts contain media (images/video/audio)`;

      if (searchResults && searchResults.length > 0 && (searchResults[0].username?.toLowerCase() === channel.toLowerCase())) {
        const metadata = searchResults[0];
        extraContext += `\n\n**ADDITIONAL CHANNEL METADATA:**\n- Primary Category: ${metadata.category || "Unknown"}\n- Channel Description: ${metadata.summary || "None"}\n- Influence/Clout Score: ${metadata.final_score}\n- Subscriber Count: ${metadata.member_count || "Unknown"}\n(Use this metadata and analytics to brutally mock their relevance, their chosen niche, their wordiness, or their clout).`;
      }
    } catch (e) {
      // Backend might be down, ignore
    }

    const userPrompt = `Here are the most recent posts from ${channelLabel}'s channel. Read them and deliver a PERSONALIZED, SAVAGE roast that references their specific content:\n\n${postDigest}\n\nTotal posts analyzed: ${recentPosts.length}.${extraContext}\n\nNow ROAST them based on what you actually see.`;

    const completion = await getGroq().chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: MODEL,
      temperature: 0.9,
      max_tokens: 500,
    });

    const roast = completion.choices[0]?.message?.content;
    return roast || null;
  } catch (err) {
    console.error("AI roast generation failed:", err);
    return null;
  }
}

// ─── MAIN ROAST GENERATOR ───────────────────────────────────────

/**
 * Generates a personalized roast for a channel.
 * Primary: Uses AI to analyze actual recent posts and generate a custom roast.
 * Fallback: Uses the static roast pools if AI fails.
 */
export async function generatePersonalizedRoast(channel: string): Promise<string> {
  const isBabi = channel.toLowerCase() === "dagmawi_babi";

  // Fetch recent posts from the channel
  try {
    // 1. Ensure we have the latest posts scraped on-demand
    await ensureChannelScraped(channel);

    const recentPosts = await db.select({
      text: posts.text,
      media_type: posts.media_type,
      date: posts.date,
    }).from(posts)
      .where(eq(posts.channel, channel))
      .orderBy(desc(posts.date))
      .limit(25)
      .execute();

    // If we have posts, try AI-powered roast (80% chance to use AI, 20% static for variety)
    if (recentPosts.length > 0 && Math.random() < 0.80) {
      const aiRoast = await generateAIRoast(channel, recentPosts);
      if (aiRoast) {
        return aiRoast;
      }
    }
  } catch (err) {
    console.error("Failed to fetch posts for roast:", err);
    // Fall through to static roasts
  }

  // Fallback to static roasts
  return generateStaticRoast(channel);
}

/**
 * Generates a static (non-AI) roast from the pre-written pools.
 */
export function generateStaticRoast(channel: string): string {
  const isBabi = channel.toLowerCase() === "dagmawi_babi";

  // 20% chance for a standalone roast
  if (Math.random() < 0.20) {
    // Babi-specific standalone
    if (isBabi && Math.random() < 0.5) {
      return BABI_SPECIFIC_ROASTS[Math.floor(Math.random() * BABI_SPECIFIC_ROASTS.length)];
    }

    const roast = STANDALONE_ROASTS[Math.floor(Math.random() * STANDALONE_ROASTS.length)];
    return roast.replace(/@{channel}/g, `@${channel}`);
  }

  // 80% chance for a procedural 3-part roast
  const start = ROAST_STARTERS[Math.floor(Math.random() * ROAST_STARTERS.length)];
  const middle = ROAST_MIDDLES[Math.floor(Math.random() * ROAST_MIDDLES.length)];
  const end = ROAST_ENDINGS[Math.floor(Math.random() * ROAST_ENDINGS.length)];

  const fullRoast = `${start} ${middle} \n\n${end}`;
  return fullRoast.replace(/@{channel}/g, `@${channel}`);
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
