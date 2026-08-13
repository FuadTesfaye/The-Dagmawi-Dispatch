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
  "Reading @{channel} at 3 AM feels like"
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
  "a group project where nobody did the work but everyone expects an A."
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
  "If ignorance is bliss, they must be the happiest person on Earth."
];

export const STANDALONE_ROASTS = [
  "@{channel} is the reason we have warning labels on shampoo bottles.",
  "If @{channel} had a superpower, it would be the ability to empty a room in 10 seconds.",
  "I’m not saying @{channel} is useless, but I’ve seen screen doors on submarines with more purpose.",
  "@{channel}'s content is like a software update: nobody asked for it, it takes forever, and it usually breaks something.",
  "I asked ChatGPT to write a polite description of @{channel} and it threw a segmentation fault.",
  "@{channel} is the human equivalent of a typo.",
  "I'd agree with @{channel}, but then we’d both be wrong.",
  "@{channel}'s posts are a great reminder that the block button exists for a reason.",
  "I'm jealous of the people who haven't discovered @{channel} yet.",
  "@{channel} brings joy to the internet. Specifically, when they go offline."
];

export function generateRoast(channel: string): string {
  const isBabi = channel.toLowerCase() === "dagmawi_babi";

  // 15% chance to return a standalone roast
  if (Math.random() < 0.15) {
    const babiSpecific = [
      "Babi posted 37 times today. That's not a channel, that's a hostage situation for your notification bar.",
      "Dagmawi the Second has decreed 28 messages before noon. Even his phone is filing for workers' comp.",
      "I tried to summarize Babi's posts but my AI asked for hazard pay. Ayzosh (take courage), we'll get through this.",
      "Babi posts so much, archaeologists in 3026 will assume he was an entire news agency, not one man with WiFi.",
      "Babi's posting frequency just broke the Geneva Convention. Somebody notify the UN.",
      "If Babi stopped posting for 24 hours, Telegram's stock price would drop 12%. He IS the economy.",
      "Scientists have discovered a new unit of measurement: 1 Babi = 47 posts/day. It replaced the light-year for measuring distance between sanity and his channel.",
      "Legend says if you scroll to the top of Babi's channel, you'll find a post that simply says 'testing 1 2 3.' That was yesterday.",
      "Babi doesn't sleep. He just switches to drafts.",
      "Breaking: Telegram is adding a new feature called 'Babi Mode' — it removes the character limit entirely."
    ];

    if (isBabi && Math.random() < 0.5) {
      return babiSpecific[Math.floor(Math.random() * babiSpecific.length)];
    }

    const roast = STANDALONE_ROASTS[Math.floor(Math.random() * STANDALONE_ROASTS.length)];
    return roast.replace(/@{channel}/g, `@${channel}`);
  }

  // 85% chance to generate a procedural 3-part roast
  const start = ROAST_STARTERS[Math.floor(Math.random() * ROAST_STARTERS.length)];
  const middle = ROAST_MIDDLES[Math.floor(Math.random() * ROAST_MIDDLES.length)];
  const end = ROAST_ENDINGS[Math.floor(Math.random() * ROAST_ENDINGS.length)];

  const fullRoast = `${start} ${middle} \n\n${end}`;
  return fullRoast.replace(/@{channel}/g, `@${channel}`);
}

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
];

export function generateExcuse(channel: string): string {
  const excuse = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
  return excuse.replace(/@{channel}/g, channel);
}
