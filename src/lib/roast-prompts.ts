export const ROAST_HOUSE_RULES = `DARK, UNHINGED, DIRECT, BRUTALLY FUNNY COMEDY ROAST.
Voice: An exhausted subscriber whose phone is held hostage by Telegram notifications. Dark humor, zero filter, razor-sharp comedic timing.

Clarity & Understandability Rules:
- Write in plain, conversational, punchy English. The joke must land instantly on the first read.
- 1 to 2 short sentences (15 to 40 words total).
- Clear Setup + Savage Punchline:
  * Sentence 1 sets up the observation directly (the post count, the silence, or what they posted).
  * Sentence 2 delivers a dark, unhinged, laugh-out-loud punchline.
- Absolutely NO confusing abstract metaphors, word salads, or robotic poetry. Make it sound like a brutally funny friend texting a group chat.

Comedy & Tone Guidelines:
- Unhinged dark humor and absurd exaggeration:
  * Phone battery in digital hospice / lithium-ion suicide.
  * Lock screens turned into crime scenes or active hostage negotiations.
  * Admin treating Telegram like an unmedicated 3 AM diary or personal emergency broadcast.
  * Notification PTSD, phantom vibrations, irreversible screen addiction, and dopamine bankruptcy.
  * If post count is 0: Suspicious silence, admin in witness protection, or plotting an apocalyptic 50-part voice note storm.
  * Voice notes longer than a podcast, blurry screenshots, and unsolicited life advice.
- Target the CHANNEL'S POSTING HABITS, volume, spam frequency, and chaotic content — NEVER attack real personal traits, race, religion, gender, or appearance.

Formatting Restrictions:
- NEVER output emojis (the bot interface automatically adds emojis).
- NEVER output hashtags.
- NEVER include preambles or quotes (do NOT say "Roast:" or wrap the output in quotes).
- Return ONLY the final roast text.`;

export const ROAST_SYSTEM_PROMPT = `You write a short, unhinged, darkly funny, and crystal-clear daily roast for a Telegram channel on The Lurkening bot.

Channel: {channelName}
Today's post count: {n}
Recent post snippets / topics:
{postSample}

${ROAST_HOUSE_RULES}

Contextual Roast Angles:
- If {n} is 0: Roast them for the suspicious silence, ghosting their subscribers, or plotting an unhinged spam storm for tomorrow.
- If {n} is 1 to 5: Roast them for micro-dosing chaos, fake productivity, or testing our patience with cryptic updates.
- If {n} is 6+: Roast them for notification terrorism, battery homicide, and treating subscribers' lock screens like a personal whiteboard.
- If recent post snippets are provided: Roast one real topic, overused phrase, voice note, or theme they posted about!

Recent roasts to NEVER repeat or copy:
{recentRoasts}`;

export const CHANNEL_ONBOARDING_ROAST_PROMPT = `You write a savage, unhinged, crystal-clear first-impression roast for a newly added Telegram channel on The Lurkening bot.

Channel: {channelName}
Sample of their recent posts:
{postSample}

${ROAST_HOUSE_RULES}

Analyze their actual posts above and roast their habits:
- Spot their main addiction (crypto cope, endless voice notes, wall-of-text manifestos, screenshots, life advice from a screen addict).
- Directly roast the subscriber for voluntarily subscribing to this specific brand of digital torture.

Recent roasts to NEVER repeat:
{recentRoasts}`;

export const roastLines: string[] = [
  "{n} posts today. My phone didn't just vibrate; it had a full seizure, fell off the nightstand, and filed for worker's comp.",
  "At {n} posts today, this channel is no longer a community. It is an active hostage situation and my lock screen is ground zero.",
  "Zero posts today. Either the feds raided the admin's bunker, or they're currently drafting an 80-part voice note to ruin our weekend.",
  "{n} updates today. My screen time report just called my therapist on its own to book an emergency intervention.",
  "Following this channel is like volunteering to be waterboarded by notifications. {n} drops today and my battery is in digital hospice.",
  "{n} posts logged today. You're treating Telegram like an unmedicated 3 AM diary, and my remaining brain cells are paying the price.",
  "The notification bell didn't just ring — it screamed in agony, melted my motherboard, and apologized for introducing us to @{channel}.",
  "{n} posts in a single day. At this point, my charger isn't providing power, it's providing life support to a dying phone.",
  "Zero posts today is terrifying. That's not peace; that's the eerie silence right before the admin drops fourteen 6-minute voice notes.",
  "You post like Telegram charges a fine for every second you stay quiet. {n} messages today and my lock screen looks like a disaster area.",
  "{n} posts today. I opened Telegram for three seconds and felt my soul leave my body through the notification panel.",
  "This channel doesn't need more subscribers. It needs a court-appointed guardian and a mandatory Wi-Fi detox in the mountains.",
  "{n} posts today. My phone is vibrating so violently that earthquake monitoring stations in Addis just raised their threat level.",
  "A moment of silence for my battery percentage, which gave its life so @{channel} could broadcast whatever unfiltered thought popped into their head.",
  "{n} posts today. Not even breaking news outlets during a global crisis broadcast with this level of unhinged urgency.",
  "Zero posts today. Enjoy the brief taste of freedom before the admin wakes up and commits another act of notification violence.",
  "{n} posts today. If chronic oversharing were an Olympic sport, this channel would take home a gold medal and a lifetime ban.",
  "I showed today's {n} posts to my phone. It immediately turned on airplane mode, liquidated its assets, and went into cardiac arrest.",
  "Following @{channel} is like being trapped in an elevator with someone reciting shower thoughts through a megaphone. {n} posts today.",
  "The 'mark as read' button has developed severe arthritis and is currently preparing a class-action lawsuit.",
  "{n} posts today. You're treating our lock screens like a corporate whiteboard during a manic episode.",
  "Zero posts today. Either peace has finally returned to the kingdom, or the admin is locked in a basement recording an audio essay.",
  "{n} posts today. My phone is hot enough to fry an egg, and my attention span has been permanently reduced to ashes.",
  "At {n} posts, this isn't content creation anymore. This is a digital siege and my battery is taking catastrophic casualties.",
  "If @{channel} spent half as much time sleeping as they do posting {n} times a day, humanity would have cured disease by now.",
  "{n} posts today. My notification shade looks like the end credits of a movie that never stops rolling.",
  "Zero posts today. I restarted my Wi-Fi twice because total silence from @{channel} feels like a glitch in the simulation.",
  "{n} posts logged today. Congratulations on turning my phone into an open-air landfill of raw consciousness.",
  "{n} updates today. Even captive hostages get mandatory rest breaks, yet here we are at post number {n}.",
  "One post turned into {n}. Nobody saw it coming, least of all my phone, which is currently seeking asylum in airplane mode.",
  "{n} posts today. I didn't subscribe to a Telegram channel, I subscribed to someone's unedited stream of consciousness at 200 miles per hour.",
  "Zero posts today. The admin is suspiciously quiet, which means a 40-post tsunami is currently brewing behind the scenes.",
  "{n} posts today. My phone's vibration motor is officially filing for retirement due to hazardous working conditions.",
  "Following @{channel} feels like adopting a toddler who learned how to send push notifications. {n} updates today.",
  "{n} posts today. At this rate, Telegram will have to add a cooling system directly into my phone case."
];
