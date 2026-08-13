import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { summarizeDay, SUMMARY_LANGUAGE } from "../src/lib/summarize";

async function run() {
  try {
    const summary = await summarizeDay("mike_endale", "2026-08-11", SUMMARY_LANGUAGE, true);
    console.log("SUCCESS:");
    console.log(summary);
  } catch (err) {
    console.error("FAILED:", err);
  }
}
run();
