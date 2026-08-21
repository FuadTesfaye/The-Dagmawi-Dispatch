export interface User {
  id: string;
  telegramUserId: string;
  username: string | null;
  displayName: string;
  photoUrl: string | null;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
  lastLoginAt: string;
}

export interface TrackedChannel {
  id: string; // e.g. 'dagmawi_babi'
  name: string;
  description: string | null;
  avatarUrl: string | null;
  subscriberCount: number;
  isVerified: boolean;
  authorTelegramId?: string | null;
  isSubscribed?: boolean;
  isMuted?: boolean;
  postCount?: number;
  createdAt: string;
}

export interface ForwardFrom {
  name: string;
  channel?: string;
  postId?: number;
  url?: string;
}

export interface ReplyTo {
  id?: number;
  channel?: string;
  authorName?: string;
  text?: string;
  url?: string;
}

export interface PostTag {
  id: string;
  channel: string;
  postId: number;
  tag: string;
  confidence: number;
  createdAt: string;
}

export interface Post {
  channel: string;
  id: number;
  date: string;
  localDate: string;
  text: string | null;
  mediaType: string;
  hasCaptionOnly: boolean;
  permalink: string | null;
  rawJson?: any;
  viewsCount?: number;
  createdAt?: string;
  channelInfo?: TrackedChannel;
  forwardFrom?: ForwardFrom;
  replyTo?: ReplyTo;
  reactions?: Record<string, number>;
  userReactions?: string[];
  commentCount?: number;
  aiReviewCount?: number;
  tags?: string[];
}

export interface Comment {
  id: string;
  channel: string;
  postId: number;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    displayName: string;
    username: string | null;
    photoUrl: string | null;
    role: string;
  };
}

export interface PostReaction {
  channel: string;
  postId: number;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface AIReview {
  id: string;
  channel: string;
  postId: number;
  kind: 'summary' | 'roast' | 'fact_check' | 'eli5';
  content: string;
  modelUsed?: string | null;
  createdAt: string;
}

// ─── 1. CHANNEL ROAST (DAILY & ONBOARDING) ─────────────────────
export interface ChannelRoast {
  id: string;
  channel: string;
  roastType: 'onboarding' | 'daily' | 'chaos_spike';
  content: string;
  postCount: number;
  chaosScore: number;
  modelUsed?: string | null;
  createdAt: string;
}

// ─── 2. ROAST BATTLES ─────────────────────────────────────────
export interface RoastBattle {
  id: string;
  channelA: string;
  channelB: string;
  title: string;
  description?: string | null;
  weekNumber: number;
  year: number;
  channelAVotes: number;
  channelBVotes: number;
  channelARoast?: string | null;
  channelBRoast?: string | null;
  status: 'active' | 'completed' | 'upcoming';
  winnerChannel?: string | null;
  userVote?: 'A' | 'B' | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

// ─── 3. CROSS-CHANNEL DAILY DIGEST ─────────────────────────────
export interface DigestSubscription {
  userId: string;
  channelId: string;
  deliveryTime: string;
  isEnabled: boolean;
  channelName?: string;
  channelAvatar?: string | null;
  createdAt: string;
}

export interface CrossChannelDigest {
  date: string;
  headline: string;
  overviewSummary: string;
  channelHighlights: {
    channel: string;
    channelName: string;
    postCount: number;
    topStory: string;
    chaosRating: string;
  }[];
  generatedAt: string;
  modelUsed: string;
}

// ─── 4. WEEKLY LEADERBOARDS ───────────────────────────────────
export interface WeeklyLeaderboardEntry {
  id: string;
  weekNumber: number;
  year: number;
  category: 'top_commentator' | 'streak_champion' | 'most_active_channel' | 'chaos_lord';
  rank: number;
  entityId: string;
  entityName: string;
  entityAvatar: string | null;
  score: number;
  badge?: string | null;
}

// ─── 5. PUBLIC ROADMAP & FEATURE VOTING ───────────────────────
export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: 'utility' | 'fun' | 'creator' | 'general';
  upvoteCount: number;
  status: 'open' | 'planned' | 'in_progress' | 'shipped';
  createdBy?: string | null;
  creatorName: string;
  hasUpvoted?: boolean;
  createdAt: string;
}

// ─── 6. CREATOR REPORT CARD ───────────────────────────────────
export interface CreatorReportCard {
  channel: string;
  channelName: string;
  period: string;
  totalPosts: number;
  totalViews: number;
  avgViewsPerPost: number;
  topPostingHour: string | number;
  mostActiveDay: string;
  topTopics: { topic: string; percentage: number }[];
  roastSummary: string;
  consistencyScore: number;
  sentimentBreakdown: { positive: number; neutral: number; chaos: number };
}

// ─── 7. WRAPPED RECAP ─────────────────────────────────────────
export interface WrappedRecap {
  channel: string;
  channelName: string;
  period: string; // e.g. "August 2026"
  totalPosts: number;
  totalWordsWritten: number;
  mostUnhingedDay: { date: string; postCount: number; highlight: string };
  topTopic: string;
  roastHighlight: string;
  communityReactionLeader: string;
  verdictTitle: string;
}

export interface ModerationReport {
  id: string;
  userId: string | null;
  targetType: 'post' | 'comment';
  channel: string;
  postId: number | null;
  commentId: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
  user?: {
    displayName: string;
    username: string | null;
  };
}

export interface RealtimeEvent {
  type: 'new_comment' | 'reaction_update' | 'new_ai_review' | 'battle_vote' | 'feature_upvote';
  channel: string;
  postId?: number;
  data: any;
  timestamp: string;
}
