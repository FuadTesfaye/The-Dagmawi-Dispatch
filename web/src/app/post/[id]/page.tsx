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
      setError('Invalid Post Reference');
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
          setError('Dispatch not found in broadsheet records');
        }
      })
      .catch(() => setError('Failed to load dispatch'))
      .finally(() => setLoading(false));
  }, [postId, channel]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-[#a39e93] font-teletype">
        <Loader2 className="w-6 h-6 animate-spin text-[#d97706]" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center broadsheet-card p-8 flex flex-col items-center gap-4 font-teletype">
        <h2 className="text-sm font-bold text-[#f4f0e6] uppercase">[ {error || 'DISPATCH NOT FOUND'} ]</h2>
        <Link
          href="/"
          className="stamp-btn"
        >
          RETURN TO BROADSHEET FEED
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto font-teletype">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-[#a39e93] hover:text-[#f4f0e6] transition-colors self-start font-bold uppercase"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>← RETURN TO BROADSHEET FEED</span>
      </Link>

      {/* Main Post Card */}
      <PostCard post={post} />

      {/* Embedded Real-time Discussion Section */}
      <div className="broadsheet-card p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#262936] pb-2">
          <h3 className="font-bold text-xs text-[#f4f0e6] uppercase">
            § COURT TESTIMONY & INQUEST RECORD
          </h3>
          <span className="text-[10px] text-[#a39e93]">DISPATCH #{post.id}</span>
        </div>

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
