// hooks/useFollow.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useFollow(targetUserId: string) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user?: { id: string } | null } }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!currentUserId || !targetUserId) return;
    checkFollow();
  }, [currentUserId, targetUserId]);

  async function checkFollow() {
    setLoading(true);
    const { data, error } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();
    setIsFollowing(!error && data !== null);
    setLoading(false);
  }

  const follow = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('followers')
      .insert({ follower_id: currentUserId, following_id: targetUserId });
    if (!error) setIsFollowing(true);
  }, [currentUserId, targetUserId]);

  const unfollow = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);
    if (!error) setIsFollowing(false);
  }, [currentUserId, targetUserId]);

  const toggle = useCallback(() => {
    return isFollowing ? unfollow() : follow();
  }, [isFollowing, follow, unfollow]);

  return { isFollowing, loading, follow, unfollow, toggle };
}

/**
 * Returns a list of suggested users to follow — users the current user doesn't
 * already follow, excluding themselves.
 */
export async function fetchFollowSuggestions(
  currentUserId: string,
  limit = 10
): Promise<{ id: string; display_name: string; avatar_url: string | null }[]> {
  const { data } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .neq('id', currentUserId)
    .limit(limit);

  return data ?? [];
}
