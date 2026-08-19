'use client';

import React, { useState, useEffect, use } from 'react';
import { Post } from '@/lib/types';
import { PostCard } from '@/components/post-card';
import { CommentDrawer } from '@/components/comment-drawer';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function SinglePostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const postId = parseInt(resolvedParams.id, 10);
  const searchParams = useSearchParams();
  const channel = searchParams.get('channel') || 'dagmawi_babi';

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNaN(postId)) {
      setError('Invalid Post ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/posts/${postId}?channel=${channel}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.post) {
          setPost(data.post);
        } else {
          setError('Post not found in kingdom archives');
        }
      })
      .catch(() => setError('Failed to load post'))
      .finally(() => setLoading(false));
  }, [postId, channel]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-amber-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center glass-panel rounded-3xl p-8 flex flex-col items-center gap-4">
        <span className="text-4xl">📜</span>
        <h2 className="text-lg font-bold text-zinc-100">{error || 'Post not found'}</h2>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-amber-500 text-zinc-950 font-bold text-xs"
        >
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Feed</span>
      </Link>

      {/* Main Post Card */}
      <PostCard post={post} />

      {/* Embedded Real-time Discussion Section */}
      <div className="glass-panel rounded-3xl p-6 border border-zinc-800 flex flex-col gap-4">
        <h3 className="text-sm font-extrabold text-zinc-100">
          Royal Discussion Thread
        </h3>

        {/* Embedded Comment Drawer view */}
        <CommentDrawer
          isOpen={true}
          onClose={() => {}}
          postId={post.id}
          channel={post.channel}
        />
      </div>
    </div>
  );
}
