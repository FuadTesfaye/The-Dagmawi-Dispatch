#!/usr/bin/env bun
import { Command } from "commander";
import { TeleGlanceClient } from "../client/TeleGlanceClient.js";

const program = new Command();

program.name("teleglance").description("CLI for the TeleGlance TypeScript client").version("0.1.0");

program
  .command("channel <username>")
  .description("Fetch channel metadata")
  .action(async (username: string) => {
    const client = new TeleGlanceClient();
    try {
      const channel = await client.getChannel(username);
      console.log(JSON.stringify(channel, null, 2));
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("messages <username>")
  .description("Fetch recent messages")
  .option("-l, --limit <number>", "number of messages", "10")
  .option("--ndjson", "output newline-delimited JSON")
  .action(async (username: string, opts: { limit: string; ndjson?: boolean }) => {
    const client = new TeleGlanceClient();
    try {
      for await (const message of client.iterMessages(username, { limit: Number(opts.limit) })) {
        console.log(opts.ndjson ? JSON.stringify(message) : message);
      }
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command("scrape <username>")
  .description("Scrape all messages from day one and save to data/channels/<username>.json")
  .action(async (username: string) => {
    const client = new TeleGlanceClient();
    let count = 0;
    try {
      process.stdout.write(`Scraping @${username} from the beginning...\n`);
      for await (const msg of client.scrapeAll(username)) {
        count++;
        process.stdout.write(`\r  ${count} messages scraped (latest: #${msg.id} ${new Date(msg.date).toISOString().slice(0, 10)})`);
      }
      console.log(`\nDone. ${count} messages saved to data/channels/${username}.json`);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program.parse();
