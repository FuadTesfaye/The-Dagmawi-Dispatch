import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

async function run() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    console.log("Fetching your dialogs to find all channels...");
    const dialogs = await client.getDialogs({});
    
    const channels: { title: string; username: string | null; id: string }[] = [];

    for (const dialog of dialogs) {
      if (dialog.isChannel && dialog.entity) {
        const entity = dialog.entity as any;
        // Ignore megagroups (supergroups), we only want broadcast channels
        if (entity.megagroup) continue;

        channels.push({
          title: dialog.title,
          username: entity.username || null,
          id: entity.id ? entity.id.toString() : "",
        });
      }
    }

    console.log(`Found ${channels.length} broadcast channels you are subscribed to.`);
    
    // Save to file
    fs.writeFileSync("channels-list.json", JSON.stringify(channels, null, 2));
    console.log("Saved all your channels to channels-list.json");

    // Let's also check Telegram Folders (Dialog Filters)
    console.log("\nFetching your Telegram Folders (Communities/Filters)...");
    try {
      const filters = await client.invoke(new Api.messages.GetDialogFilters());
      const foldersList = [];

      // Create a map of peer ID to channel username for quick lookup
      const peerToChannel = new Map();
      for (const dialog of dialogs) {
        if (dialog.isChannel && dialog.entity) {
          const entity = dialog.entity as any;
          peerToChannel.set(entity.id.toString(), {
            title: dialog.title,
            username: entity.username || null
          });
        }
      }

      // filters is an array that contains DialogFilter objects
      if (Array.isArray(filters.filters)) {
        for (const filter of filters.filters) {
          if (filter.className === "DialogFilter" || filter.className === "DialogFilterChatlist") {
            const folderName = filter.title;
            const folderChannels = [];
            
            // Include peers
            if (filter.includePeers) {
              for (const peer of filter.includePeers) {
                let peerId = "";
                if (peer.className === "InputPeerChannel") {
                  peerId = peer.channelId.toString();
                } else if (peer.className === "InputPeerChat") {
                  peerId = peer.chatId.toString();
                }
                
                if (peerId && peerToChannel.has(peerId)) {
                  folderChannels.push(peerToChannel.get(peerId));
                }
              }
            }
            
            foldersList.push({
              folderName: folderName,
              channels: folderChannels,
              channelCount: folderChannels.length
            });
          }
        }
        
        fs.writeFileSync("folders-list.json", JSON.stringify(foldersList, null, 2));
        console.log(`Saved ${foldersList.length} folders to folders-list.json`);
      }
    } catch (err) {
      console.log("Could not fetch folders:", err.message);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

run();
