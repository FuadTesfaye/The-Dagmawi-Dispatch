import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { generatePersonalizedRoast } from "../src/lib/roasts";

const channels = ["selfmadecoder", "Fuadbuild", "dagmawi_babi"];

async function main() {
  for (const channel of channels) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔥 ROAST FOR @${channel}`);
    console.log("=".repeat(60));
    
    try {
      const roast = await generatePersonalizedRoast(channel);
      console.log(roast);
    } catch (err) {
      console.error(`Error roasting ${channel}:`, err);
    }
    
    console.log("");
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
