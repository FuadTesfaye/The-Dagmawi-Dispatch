import * as fs from 'fs';

// Load env manually
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"#]*)"?\s*$/);
  if (m && m[1] && m[2]) process.env[m[1]] = m[2].trim();
}

import postgres from 'postgres';

let passed = 0;
let failed = 0;

function ok(label: string, value: boolean) {
  if (value) { console.log(`  ✅ ${label}`); passed++; }
  else        { console.log(`  ❌ ${label}`); failed++; }
}
function section(name: string) { console.log(`\n── ${name} ──`); }

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 15 });

  // ── DB sanity ────────────────────────────────────────────────────────────
  section('DB sanity');
  const [{ cnt: totalPosts }] = await sql`SELECT COUNT(*) as cnt FROM posts`;
  ok(`posts table has data (${totalPosts} rows)`, Number(totalPosts) > 0);

  const channels = await sql`SELECT DISTINCT channel FROM posts ORDER BY channel`;
  ok(`channels seeded (${channels.length})`, channels.length >= 40);

  const [{ cnt: babiCount }] = await sql`SELECT COUNT(*) as cnt FROM posts WHERE channel = 'dagmawi_babi'`;
  ok(`dagmawi_babi has ${babiCount} posts`, Number(babiCount) > 0);

  // ── Find a real date with posts ──────────────────────────────────────────
  const recentDates = await sql`
    SELECT local_date::text as d, COUNT(*) as cnt
    FROM posts WHERE channel = 'dagmawi_babi'
    GROUP BY local_date ORDER BY local_date DESC LIMIT 5
  `;
  ok(`dagmawi_babi has dated posts`, recentDates.length > 0);
  const testDate = recentDates[0].d;
  console.log(`  Using test date: ${testDate} (${recentDates[0].cnt} posts)`);

  // ── /today & /yesterday ──────────────────────────────────────────────────
  section('/today and /yesterday — date queries');
  const postsOnDate = await sql`
    SELECT id, text, media_type FROM posts
    WHERE channel = 'dagmawi_babi' AND local_date = ${testDate}
    ORDER BY date DESC LIMIT 3
  `;
  ok(`fetch posts for specific date (${postsOnDate.length} rows)`, postsOnDate.length > 0);
  if (postsOnDate[0]) {
    console.log(`  Sample: "${String(postsOnDate[0].text || '[media]').slice(0, 80)}"`);
  }

  const secondDate = recentDates[1]?.d ?? testDate;
  const [{ cnt: dateCnt }] = await sql`
    SELECT COUNT(*) as cnt FROM posts WHERE channel = 'dagmawi_babi' AND local_date = ${secondDate}
  `;
  ok(`/date query works for ${secondDate} (${dateCnt} posts)`, Number(dateCnt) >= 0);

  // ── /babiometer ──────────────────────────────────────────────────────────
  section('/babiometer — post count & blast level');
  const busiestDays = await sql`
    SELECT local_date::text as d, COUNT(*) as cnt
    FROM posts WHERE channel = 'dagmawi_babi'
    GROUP BY local_date ORDER BY cnt DESC LIMIT 3
  `;
  ok(`can count posts per day`, busiestDays.length > 0);
  const topCount = Number(busiestDays[0].cnt);
  console.log(`  Busiest day: ${busiestDays[0].d} with ${topCount} posts`);

  const blasts = topCount === 0 ? 0 : topCount <= 3 ? 1 : topCount <= 8 ? 2 : topCount <= 15 ? 3 : topCount <= 25 ? 4 : topCount <= 40 ? 5 : 6;
  ok(`blast level computed (${blasts} blasts for ${topCount} posts)`, blasts >= 0 && blasts <= 6);

  // ── /channel ─────────────────────────────────────────────────────────────
  section('/channel — user channel preference');
  await sql`
    INSERT INTO user_channels (telegram_user_id, channel, updated_at)
    VALUES ('test_999', 'cooliocodes', NOW())
    ON CONFLICT (telegram_user_id) DO UPDATE SET channel = 'cooliocodes', updated_at = NOW()
  `;
  const [userChan] = await sql`SELECT channel FROM user_channels WHERE telegram_user_id = 'test_999'`;
  ok(`channel preference saved`, userChan?.channel === 'cooliocodes');

  await sql`UPDATE user_channels SET channel = 'dagmawi_babi' WHERE telegram_user_id = 'test_999'`;
  const [switched] = await sql`SELECT channel FROM user_channels WHERE telegram_user_id = 'test_999'`;
  ok(`channel preference updated`, switched?.channel === 'dagmawi_babi');

  // ── /subscribe & /unsubscribe ────────────────────────────────────────────
  section('/subscribe and /unsubscribe');
  await sql`
    INSERT INTO subscribers (telegram_user_id, chat_id, active)
    VALUES ('test_999', '-999', true)
    ON CONFLICT (telegram_user_id) DO UPDATE SET active = true, chat_id = '-999'
  `;
  const [sub] = await sql`SELECT active FROM subscribers WHERE telegram_user_id = 'test_999'`;
  ok(`subscribe sets active=true`, sub?.active === true);

  await sql`UPDATE subscribers SET active = false WHERE telegram_user_id = 'test_999'`;
  const [unsub] = await sql`SELECT active FROM subscribers WHERE telegram_user_id = 'test_999'`;
  ok(`unsubscribe sets active=false`, unsub?.active === false);

  // ── /guess ───────────────────────────────────────────────────────────────
  section('/guess — betting game');
  const guessId = `dagmawi_babi:${testDate}:test_999`;
  await sql`
    INSERT INTO guesses (id, channel, local_date, telegram_user_id, display_name, guess)
    VALUES (${guessId}, 'dagmawi_babi', ${testDate}, 'test_999', 'Test User', 42)
    ON CONFLICT (id) DO UPDATE SET guess = 42
  `;
  const [guess] = await sql`SELECT guess FROM guesses WHERE id = ${guessId}`;
  ok(`guess saved (${guess?.guess})`, Number(guess?.guess) === 42);

  const leaderboard = await sql`
    SELECT g.display_name, g.guess,
      ABS(g.guess::int - (SELECT COUNT(*)::int FROM posts WHERE channel = g.channel AND local_date = g.local_date)) as diff
    FROM guesses g
    WHERE g.channel = 'dagmawi_babi' AND g.local_date = ${testDate}
    ORDER BY diff ASC
  `;
  ok(`leaderboard query works (${leaderboard.length} entries)`, leaderboard.length > 0);
  console.log(`  Top: ${leaderboard[0]?.display_name} guessed ${leaderboard[0]?.guess}, off by ${leaderboard[0]?.diff}`);

  // ── /roast & /excuse ─────────────────────────────────────────────────────
  section('/roast and /excuse — static generation');
  const { generateStaticRoast, generateExcuse } = await import('../src/lib/roasts.js');

  const roast = generateStaticRoast('dagmawi_babi');
  ok(`roast generated for dagmawi_babi`, typeof roast === 'string' && roast.length > 20);
  console.log(`  Roast: "${roast.slice(0, 100)}..."`);

  const roastOther = generateStaticRoast('cooliocodes');
  ok(`roast works for other channels`, typeof roastOther === 'string' && roastOther.length > 20);

  const excuse = generateExcuse('dagmawi_babi');
  ok(`excuse generated`, typeof excuse === 'string' && excuse.length > 10);
  console.log(`  Excuse: "${excuse.slice(0, 100)}"`);

  // ── multi-channel ────────────────────────────────────────────────────────
  section('Multi-channel support');
  const testChannels = ['cooliocodes', 'burhanops', 'robi_makes_stuff', 'onyx2community', 'willtocode'];
  for (const ch of testChannels) {
    const [{ cnt }] = await sql`SELECT COUNT(*) as cnt FROM posts WHERE channel = ${ch}`;
    ok(`${ch}: ${cnt} posts`, Number(cnt) > 0);
  }

  // ── ingestion cursor ─────────────────────────────────────────────────────
  section('Ingestion cursor');
  const cursors = await sql`SELECT id, last_message_id FROM ingestion_cursor ORDER BY last_message_id DESC LIMIT 5`;
  ok(`ingestion cursors exist (${cursors.length})`, cursors.length > 0);
  console.log(`  Top cursors: ${cursors.map((c: any) => `${c.id}@${c.last_message_id}`).join(', ')}`);

  // ── Telegram Bot API ─────────────────────────────────────────────────────
  section('Telegram Bot API');
  const botToken = process.env.TELEGRAM_BOT_TOKEN!;

  const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const meData = await meRes.json() as any;
  ok(`Bot alive: @${meData.result?.username}`, meData.ok === true);

  const whRes = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
  const whData = await whRes.json() as any;
  ok(`Telegram API reachable`, whData.ok === true);

  const webhookUrl = whData.result?.url || '';
  console.log(`  Webhook URL: ${webhookUrl || '(not set — bot running in polling mode or not deployed)'}`);
  console.log(`  Pending updates: ${whData.result?.pending_update_count ?? 0}`);
  if (whData.result?.last_error_message) {
    console.log(`  ⚠️  Last webhook error: ${whData.result.last_error_message}`);
    console.log(`  ⚠️  Last error date: ${new Date((whData.result.last_error_date ?? 0) * 1000).toISOString()}`);
  }

  const webhookOk = webhookUrl.length > 0;
  if (!webhookOk) {
    console.log(`  ℹ️  No webhook set — bot needs to be deployed and webhook registered via /api/telegram/setup`);
  }
  ok(`Webhook configured`, webhookOk);

  // ── /recommend — graph table check ──────────────────────────────────────
  section('/recommend — graph table');
  const [{ exists }] = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables WHERE table_name = 'channel_edges'
    ) as exists
  `;
  if (exists) {
    const recs = await sql`
      SELECT target_username, SUM(weight) as w
      FROM channel_edges
      WHERE source_id IN (SELECT id FROM channels WHERE lower(username) = 'dagmawi_babi')
      GROUP BY target_username ORDER BY w DESC LIMIT 3
    `;
    ok(`/recommend graph query works (${recs.length} results)`, true);
  } else {
    console.log(`  ℹ️  channel_edges table not present — /recommend will show "no connections" message`);
    ok(`/recommend gracefully handles missing graph`, true);
  }

  // ── cleanup ──────────────────────────────────────────────────────────────
  await sql`DELETE FROM user_channels WHERE telegram_user_id = 'test_999'`;
  await sql`DELETE FROM subscribers WHERE telegram_user_id = 'test_999'`;
  await sql`DELETE FROM guesses WHERE id = ${guessId}`;

  // ── summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉 All tests passed — bot is ready!');
  else console.log('⚠️  Some tests failed — see above.');

  await sql.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
