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
  isSubscribed?: boolean;
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
  type: 'new_comment' | 'reaction_update' | 'new_ai_review';
  channel: string;
  postId: number;
  data: any;
  timestamp: string;
}
