import { NextRequest, NextResponse } from 'next/server';
import { getReadDb, writeDb } from '@/db';
import { featureRequests, featureUpvotes } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    const db = getReadDb();

    let features = await db
      .select()
      .from(featureRequests)
      .orderBy(desc(featureRequests.upvoteCount));

    if (features.length === 0) {
      // Seed the initial roadmap items directly from the roadmap plan
      const defaultFeatures = [
        {
          title: 'Cross-Channel Daily Digest',
          description: 'Receive one unified morning briefing summarizing all your followed Telegram channels in a single AI synthesized post.',
          category: 'utility',
          upvoteCount: 48,
          status: 'shipped' as const,
          creatorName: 'The Royal Council',
        },
        {
          title: 'Telegram Roast Battles',
          description: 'Pit two tracked channels against each other in a weekly community voting duel: "who posted more chaos this week".',
          category: 'fun',
          upvoteCount: 39,
          status: 'shipped' as const,
          creatorName: 'Fuad Tesfaye',
        },
        {
          title: 'Full-Text Telegram Archive Search',
          description: 'Query historical transmissions across all indexed channels with instant keyword highlighting and date filters.',
          category: 'utility',
          upvoteCount: 34,
          status: 'shipped' as const,
          creatorName: 'Dagmawi Babi Fan Club',
        },
        {
          title: 'Topic Tags & Feed Taxonomy',
          description: 'Auto-classify dispatches into Tech, Crypto, Dev Tools, News, and Humor so readers can filter cross-channel feeds.',
          category: 'utility',
          upvoteCount: 29,
          status: 'shipped' as const,
          creatorName: 'Archive Scribes',
        },
        {
          title: 'Weekly Community Leaderboards',
          description: 'Weekly reset rankings celebrating the sharpest commentators, longest reading streaks, and active wire champions.',
          category: 'fun',
          upvoteCount: 22,
          status: 'shipped' as const,
          creatorName: 'Royal Teleprinter',
        },
        {
          title: 'Creator Analytics & Report Card',
          description: 'Dedicated private dashboard for channel authors displaying peak posting hours, viral engagement, and AI sentiment analysis.',
          category: 'creator',
          upvoteCount: 19,
          status: 'planned' as const,
          creatorName: 'Content Guild',
        },
        {
          title: 'Spotify-Style Monthly Wrapped Recap',
          description: 'Monthly visual summary card per channel: most unhinged day, top topic, roast highlights, and reaction trophies.',
          category: 'fun',
          upvoteCount: 16,
          status: 'planned' as const,
          creatorName: 'Broadsheet Enthusiast',
        },
      ];

      const inserted = await writeDb
        .insert(featureRequests)
        .values(defaultFeatures)
        .returning();

      features = inserted;
    }

    // Check user's upvotes if logged in
    let userUpvotes = new Set<string>();
    if (user) {
      const upvoteRows = await db
        .select({ featureId: featureUpvotes.featureId })
        .from(featureUpvotes)
        .where(eq(featureUpvotes.userId, user.id));

      userUpvotes = new Set(upvoteRows.map((u) => u.featureId));
    }

    const formatted = features.map((f) => ({
      ...f,
      hasUpvoted: userUpvotes.has(f.id),
    }));

    return NextResponse.json({ features: formatted });
  } catch (err: any) {
    console.error('[roadmap] Error fetching roadmap:', err);
    return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    const body = await req.json();
    const { title, description, category = 'utility' } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const [newFeature] = await writeDb
      .insert(featureRequests)
      .values({
        title: title.slice(0, 250),
        description: description.slice(0, 1000),
        category,
        upvoteCount: 1,
        status: 'open',
        createdBy: user?.id || null,
        creatorName: user?.displayName || 'Anonymous Scribe',
      })
      .returning();

    // Auto upvote by creator
    if (user) {
      await writeDb
        .insert(featureUpvotes)
        .values({
          featureId: newFeature.id,
          userId: user.id,
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true, feature: newFeature });
  } catch (err: any) {
    console.error('[roadmap] Error submitting feature:', err);
    return NextResponse.json({ error: 'Failed to submit feature request' }, { status: 500 });
  }
}
