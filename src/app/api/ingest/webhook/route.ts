import { NextRequest, NextResponse } from 'next/server';
import { writeDb } from '@/db';
import { posts, ingestionCursor } from '@/db/schema';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const channelPost = update.channel_post || update.message;
    if (!channelPost || !channelPost.chat) {
      return NextResponse.json({ ok: true, ignored: 'no channel post' });
    }

    const channelUsername = (channelPost.chat.username || String(channelPost.chat.id)).replace(/^@/, '');
    const messageId = channelPost.message_id;
    const postDate = new Date(channelPost.date * 1000);

    // Calculate EAT (UTC+3)
    const eatDate = new Date(postDate.getTime() + 3 * 60 * 60 * 1000);
    const localDateStr = eatDate.toISOString().split('T')[0];

    const text = channelPost.text || channelPost.caption || '';
    let mediaType = 'none';
    if (channelPost.photo) mediaType = 'photo';
    else if (channelPost.video) mediaType = 'video';
    else if (channelPost.document) mediaType = 'document';

    const hasCaptionOnly = mediaType !== 'none' && !!channelPost.caption;
    const permalink = channelPost.chat.username ? `https://t.me/${channelUsername}/${messageId}` : null;

    // Insert post into database
    await writeDb
      .insert(posts)
      .values({
        channel: channelUsername,
        id: messageId,
        date: postDate,
        localDate: localDateStr,
        text,
        mediaType,
        hasCaptionOnly,
        permalink,
        rawJson: channelPost,
      })
      .onConflictDoNothing({ target: [posts.channel, posts.id] });

    // Update cursor
    await writeDb
      .insert(ingestionCursor)
      .values({
        id: channelUsername,
        lastMessageId: messageId,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ingestionCursor.id,
        set: {
          lastMessageId: messageId,
          lastSyncedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, channel: channelUsername, id: messageId });
  } catch (err: any) {
    console.error('[api/ingest/webhook] Error handling telegram post update:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
