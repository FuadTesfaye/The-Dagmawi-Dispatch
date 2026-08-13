import "dotenv/config";

const LOCAL_URL = "http://localhost:3002/api/telegram";

async function simulateCommand(command: string) {
  const update = {
    update_id: Math.floor(Math.random() * 1000000),
    message: {
      message_id: Math.floor(Math.random() * 1000000),
      from: { id: 123456789, is_bot: false, first_name: "TestUser" },
      chat: { id: 123456789, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text: command,
      entities: [{ offset: 0, length: command.split(" ")[0].length, type: "bot_command" }],
    },
  };
  console.log(`\n━━━ Sending: ${command} ━━━`);
  await fetch(LOCAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  // Wait a bit to let the server process
  await new Promise(r => setTimeout(r, 2000));
}

async function run() {
  console.log("Waiting 2s for server warmup...");
  await new Promise(r => setTimeout(r, 2000));
  
  await simulateCommand("/channel @selfmadecoder");
  await simulateCommand("/today");
  await simulateCommand("/yesterday");
  await simulateCommand("/babiometer");
  await simulateCommand("/guess 15");
  await simulateCommand("/roast");
  await simulateCommand("/excuse");
  
  console.log("\n━━━ ALL TESTS COMPLETE ━━━");
}

run().catch(console.error);
