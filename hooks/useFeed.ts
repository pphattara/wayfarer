// hooks/useFeed.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Post, PostComment } from '../types/social';

const PAGE_SIZE = 20;

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user?: { id: string } | null } }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (currentUserId !== null) loadPage(0, true);
  }, [currentUserId]);

  async function loadPage(pageIndex: number, replace: boolean) {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (replace) setLoading(true);
    else setLoadingMore(true);

    const { data, error } = await supabase
      .from('posts')
      .select(`*, author:users!posts_user_id_fkey(display_name, avatar_url)`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      const annotated = await annotateLikes(data as Post[], currentUserId);
      if (replace) {
        setPosts(annotated);
      } else {
        setPosts((prev) => [...prev, ...annotated]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setPage(0);
    await loadPage(0, true);
  }, [currentUserId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPage(nextPage, false);
  }, [page, loadingMore, hasMore, currentUserId]);

  const likePost = useCallback(async (postId: string) => {
    if (!currentUserId) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + 1, user_has_liked: true }
          : p
      )
    );

    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: currentUserId });

    if (error) {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: Math.max(0, p.likes_count - 1), user_has_liked: false }
            : p
        )
      );
    }
  }, [currentUserId]);

  const unlikePost = useCallback(async (postId: string) => {
    if (!currentUserId) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes_count: Math.max(0, p.likes_count - 1), user_has_liked: false }
          : p
      )
    );

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', currentUserId);

    if (error) {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likes_count: p.likes_count + 1, user_has_liked: true }
            : p
        )
      );
    }
  }, [currentUserId]);

  return { posts, loading, loadingMore, hasMore, refresh, loadMore, likePost, unlikePost };
}

async function annotateLikes(posts: Post[], userId: string | null): Promise<Post[]> {
  if (!userId || posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', ids);
  const likedSet = new Set((data ?? []).map((r: { post_id: string }) => r.post_id));
  return posts.map((p) => ({ ...p, user_has_liked: likedSet.has(p.id) }));
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data } = await supabase
    .from('post_comments')
    .select(`*, author:users!post_comments_user_id_fkey(display_name, avatar_url)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return (data as PostComment[]) ?? [];
}

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, body });
}
