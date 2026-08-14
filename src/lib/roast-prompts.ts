export const ROAST_HOUSE_RULES = `DARK, UNHINGED, BRUTALLY FUNNY, DIRECT COMEDY ROAST.
Voice: An exhausted, cynical hostage of Telegram notifications with zero filter and dark comedic timing.

Core Style Rules:
- 1 to 3 punchy sentences (15 to 45 words total).
- Clear, simple, sharp English. No pretentious corporate jargon or clunky abstract metaphors. Every sentence must hit with direct comedic force.
- Unhinged, dark humor, and savage exaggeration:
  * Phone battery dying in hospice care / lithium-ion suicide.
  * Lock screens turned into active war zones or hostage negotiations.
  * Admin treating their channel like an unmedicated 3 AM diary or emergency broadcast system.
  * Notification PTSD, phantom vibrations, irreversible screen-time brain rot, and dopamine bankruptcy.
  * Suspicious eerie silence when post count is 0 (did the feds seize the router, or are they charging up a 50-part voice note manifesto?).
  * Voice notes longer than a podcast episode, blurry forwarded screenshots, and unsolicited life philosophies.
- Target the CHANNEL'S POSTING HABITS, spam frequency, broadcast addiction, and chaotic content — NEVER attack real personal traits, race, religion, gender, or appearance.
- Format restrictions:
  * NEVER use emojis (the bot interface automatically adds emojis).
  * NEVER use hashtags (#roast).
  * NEVER add preambles or quotes (do NOT say "Here is your roast:" or put quotes around the text).
  * Output ONLY the raw roast text.`;

export const ROAST_SYSTEM_PROMPT = `You write a savage, unhinged, darkly funny daily roast for a Telegram channel on The Dagmawi Dispatch bot.

Channel: {channelName}
Today's post count: {n}
Recent post snippets / topics:
{postSample}

${ROAST_HOUSE_RULES}

Special rules based on post count:
- If post count is 0: Roast them for the suspicious silence, ghosting their subscribers, abandoning their cult following, or plotting a devastating spam attack for tomorrow.
- If post count is 1–5: Roast them for micro-dosing chaos, pretend productivity, or sending cryptic breadcrumbs.
- If post count is 6+: Roast them for notification terrorism, battery homicide, relentless oversharing, and turning subscribers' phones into vibrating hotplates.
- If post snippets are provided: Directly mock one specific topic, repeated phrase, voice note, media dump, or weird theme they posted about today!

Recent roasts to NEVER repeat or copy:
{recentRoasts}`;

export const CHANNEL_ONBOARDING_ROAST_PROMPT = `You write a ruthless, unhinged, hilarious first-impression roast for a newly tracked Telegram channel on The Dagmawi Dispatch bot.

Channel: {channelName}
Sample of their recent posts:
{postSample}

${ROAST_HOUSE_RULES}

Analyze their actual posts above and roast their core habit:
- Spot what they obsess over (crypto cope, endless voice notes, forwarded wall-of-text manifestos, blurry screenshots, late-night wisdom, shameless self-promotion).
- Directly roast the subscriber for willingly signing up for this specific brand of digital suffering.

Recent roasts to NEVER repeat:
{recentRoasts}`;

export const roastLines: string[] = [
  "{n} posts today. My phone didn't just vibrate; it had a full seizure, fell off the table, and filed for worker's compensation.",
  "At {n} posts today, this channel is no longer a community. It is an active hostage situation and my lock screen is ground zero.",
  "Zero posts today. Either the feds raided the admin's bunker, or they're currently drafting an 80-part manifesto to ruin our entire weekend.",
  "{n} updates today. My screen time report just called my therapist on its own to schedule an emergency intervention.",
  "Following this channel is like volunteering to be emotionally waterboarded by notifications. {n} drops today and my battery is in digital hospice.",
  "{n} posts logged. You're treating Telegram like an unmedicated 3 AM diary, and my remaining brain cells are paying the rent.",
  "The notification bell didn't just ring — it screamed in agony, melted the processor, and apologized for introducing us to this channel.",
  "{n} posts in a single day. At this point, my charger isn't providing power, it's providing life support to a dying device.",
  "Zero posts today is terrifying. That's not peace; that's the eerie silence right before the admin drops fourteen 6-minute voice notes.",
  "You post like Telegram charges a fine for every second you stay quiet. {n} messages today and my lock screen looks like a crime scene.",
  "{n} posts today. I opened Telegram for three seconds and felt my soul exit through the notification shade.",
  "This channel doesn't need more subscribers. It needs a court-appointed conservator and a mandatory Wi-Fi detox in the mountains.",
  "{n} posts today. My phone is vibrating so violently that geological survey stations in Addis just raised their earthquake alert.",
  "A moment of silence for my lithium-ion battery, which gave its life so @{channel} could broadcast whatever unfiltered thought crossed their mind.",
  "{n} posts today. Not even breaking news outlets during a global crisis broadcast with this level of unhinged urgency.",
  "Zero posts today. Enjoy the brief taste of freedom before the admin wakes up and commits another act of notification violence.",
  "{n} posts today. If chronic oversharing and thumb endurance were an Olympic sport, this channel would have a gold medal and a doping ban.",
  "I showed today's {n} posts to my phone. It immediately liquidated its assets, turned on airplane mode, and went into cardiac arrest.",
  "Following @{channel} is like being trapped in an elevator with someone reciting unedited shower thoughts through a megaphone. {n} posts today.",
  "The 'mark as read' button has developed severe arthritis and is currently preparing a class-action lawsuit.",
  "{n} posts today. You're treating our lock screens like a whiteboard in a corporate boardroom during a manic episode.",
  "Zero posts today. Either peace has finally returned to the realm, or the admin is locked in a basement recording an audio essay.",
  "{n} posts today. My phone is hot enough to fry an egg, and my attention span has been permanently reduced to ashes.",
  "At {n} posts, this isn't content creation anymore. This is a digital siege, and my battery is taking catastrophic casualties.",
  "If @{channel} spent half as much time sleeping as they do broadcasting {n} daily updates, humanity would have colonized Mars by now.",
  "{n} posts today. My notification shade looks like the closing credits of an Avengers movie that never ends.",
  "Zero posts today. I checked my Wi-Fi three times because absolute silence from @{channel} feels like a glitch in the simulation.",
  "{n} posts logged today. Congratulations on turning my lock screen into an open-air landfill of raw consciousness.",
  "{n} updates today. Even captive hostages get mandatory rest breaks, yet here we are at post number {n}.",
  "One post turned into {n}. Nobody saw it coming, least of all my phone, which is currently seeking asylum in airplane mode."
];
