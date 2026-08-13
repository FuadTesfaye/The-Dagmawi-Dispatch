import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";
import path from "path";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

const TARGET_CHANNEL = process.argv[2] || "OnyxDesignx";
const MESSAGE_LIMIT = parseInt(process.argv[3]) || 2000;

interface ValidatedChannel {
  username: string;
  title: string;
  id: string;
  type: "broadcast" | "group";
  participantsCount: number | null;
  discoveredFrom: string;
}

const NOISE_LIST = new Set([
  "gmail", "google", "youtube", "linkedin", "instagram", "twitter", "facebook",
  "github", "bot", "support", "admin", "c", "s", "joinchat", "addlist",
  "telegram", "contest", "tme", "http", "https", "www", "com", "hiddensender"
]);

async function run() {
  if (!apiId || !apiHash || !sessionString) {
    console.error("❌ Missing Telegram credentials in .env.local!");
    process.exit(1);
  }

  console.log(`🔍 Extracting Telegram community starting at @${TARGET_CHANNEL}...`);

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    const channelMap = new Map<string, ValidatedChannel>();
    const candidateUsernames = new Set<string>();

    // Step 1: Resolve primary entity
    const primaryEntity = await client.getEntity(TARGET_CHANNEL);
    console.log(`📌 Primary Target: ${(primaryEntity as any).title} (@${TARGET_CHANNEL})`);

    const fullChannel = await client.invoke(
      new Api.channels.GetFullChannel({ channel: primaryEntity })
    );

    const chatsToScan = [TARGET_CHANNEL];

    if (fullChannel.fullChat.linkedChatId) {
      try {
        const linkedEntity = await client.getEntity(fullChannel.fullChat.linkedChatId);
        if ("username" in linkedEntity && linkedEntity.username) {
          console.log(`🔗 Found linked community discussion group: @${linkedEntity.username}`);
          chatsToScan.push(linkedEntity.username);
        }
      } catch (e: any) {
        console.log(`Could not resolve linked chat: ${e.message}`);
      }
    }

    // Step 2: Fetch message history via RPC GetHistory to extract full channel metadata from Telegram RPC chat cache
    const uniqueScanChats = Array.from(new Set(chatsToScan.map(c => c.toLowerCase())));

    for (const chatHandle of uniqueScanChats) {
      console.log(`\n💬 Scanning message history & chat entities for @${chatHandle}...`);
      let offsetId = 0;
      let totalFetched = 0;

      while (totalFetched < MESSAGE_LIMIT) {
        const limit = Math.min(100, MESSAGE_LIMIT - totalFetched);
        try {
          const res: any = await client.invoke(
            new Api.messages.GetHistory({
              peer: chatHandle,
              limit,
              offsetId,
              offsetDate: 0,
              addOffset: 0,
              maxId: 0,
              minId: 0,
              hash: BigInt(0) as any,
            })
          );

          // Extract all Channel entities returned in RPC response chats
          if (res.chats && Array.isArray(res.chats)) {
            for (const chat of res.chats) {
              if (chat.className === "Channel" && chat.username) {
                const username = chat.username.trim();
                const lower = username.toLowerCase();
                if (!NOISE_LIST.has(lower) && !channelMap.has(lower)) {
                  channelMap.set(lower, {
                    username: username,
                    title: chat.title || username,
                    id: chat.id.toString(),
                    type: chat.megagroup ? "group" : "broadcast",
                    participantsCount: chat.participantsCount || null,
                    discoveredFrom: `rpc_chats_${chatHandle}`
                  });
                }
              }
            }
          }

          if (!res.messages || res.messages.length === 0) break;
          totalFetched += res.messages.length;
          offsetId = res.messages[res.messages.length - 1].id;

          // Extract mentions from message text
          for (const msg of res.messages) {
            if (msg.className !== "Message" || !msg.message) continue;
            const mentions = msg.message.match(/@([a-zA-Z0-9_]{4,})/g);
            if (mentions) {
              mentions.forEach((m: string) => {
                const u = m.replace("@", "").toLowerCase();
                if (!NOISE_LIST.has(u) && !channelMap.has(u)) {
                  candidateUsernames.add(u);
                }
              });
            }
          }

          if (totalFetched % 500 === 0) {
            console.log(`   Fetched ${totalFetched} messages in @${chatHandle} (Discovered ${channelMap.size} channels so far)...`);
          }
        } catch (err: any) {
          console.error(`Error scanning @${chatHandle}:`, err.message);
          break;
        }
      }
    }

    console.log(`\n⚡ Direct RPC Extraction found ${channelMap.size} verified Telegram channels!`);

    // Step 3: Validate candidate text mentions (top 40 candidate mentions with graceful timeout/flood handling)
    const candidates = Array.from(candidateUsernames).filter(u => !channelMap.has(u)).slice(0, 40);
    if (candidates.length > 0) {
      console.log(`\n🧪 Validating ${candidates.length} additional text mentions...`);
      for (const username of candidates) {
        if (channelMap.has(username)) continue;
        try {
          const entity = await client.getEntity(username);
          if (entity.className === "Channel" && (entity as any).username) {
            const ch = entity as any;
            channelMap.set(username, {
              username: ch.username,
              title: ch.title,
              id: ch.id.toString(),
              type: ch.megagroup ? "group" : "broadcast",
              participantsCount: ch.participantsCount || null,
              discoveredFrom: "text_mention"
            });
            console.log(`  ✅ [@${ch.username}] "${ch.title}" (${ch.megagroup ? "group" : "broadcast"})`);
          }
        } catch (e: any) {
          if (e.errorMessage && e.errorMessage.startsWith("FLOOD_WAIT_")) {
            console.log(`  ⚠️ Hit rate limit on username resolution. Proceeding with ${channelMap.size} verified channels.`);
            break;
          }
        }
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Step 4: Save outputs cleanly inside data/channels/
    const validatedChannels = Array.from(channelMap.values());

    const channelsDir = path.join(process.cwd(), "data", "channels");
    if (!fs.existsSync(channelsDir)) {
      fs.mkdirSync(channelsDir, { recursive: true });
    }

    const jsonContent = JSON.stringify(validatedChannels, null, 2);
    const usernamesList = validatedChannels.map(c => c.username);
    const usernamesJson = JSON.stringify(usernamesList, null, 2);

    // Write to data/channels/
    fs.writeFileSync(path.join(channelsDir, "onyx_community_channels.json"), jsonContent);
    fs.writeFileSync(path.join(channelsDir, "onyx_channels.json"), jsonContent);
    fs.writeFileSync(path.join(channelsDir, "onyx_usernames.json"), usernamesJson);

    // Also write to root & data/ for backward compatibility
    fs.writeFileSync("onyx_community_channels.json", jsonContent);
    const dataDir = path.join(process.cwd(), "data");
    fs.writeFileSync(path.join(dataDir, "onyx_community_channels.json"), jsonContent);

    console.log(`\n🎉 Extraction finished! Found ${validatedChannels.length} total channels in the Onyx community.`);
    console.log(`   Saved JSON channel metadata to: ${path.join(channelsDir, "onyx_community_channels.json")}`);
    console.log(`   Saved JSON channel metadata to: ${path.join(channelsDir, "onyx_channels.json")}`);
    console.log(`   Saved JSON usernames list to: ${path.join(channelsDir, "onyx_usernames.json")}`);

  } catch (err) {
    console.error("Critical error:", err);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

run();
