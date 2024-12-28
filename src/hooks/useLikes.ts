// src/hooks/useLikes.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { CacheManager } from '../utils/cacheManager';

interface UseLikesProps {
  postId: string;
  initialLikeCount?: number;
  initialIsLiked?: boolean;
}

interface LikeState {
  likeCount: number;
  isLiked: boolean;
}

export const useLikes = ({ 
  postId, 
  initialLikeCount = 0, 
  initialIsLiked = false 
}: UseLikesProps) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCacheKey = () => `post_like_${postId}`;

  // Initialize from cache
  useEffect(() => {
    const initFromCache = async () => {
      const cached = await CacheManager.get<LikeState>({
        key: getCacheKey(),
        expiryMinutes: 60, // Cache likes for 1 hour
      });

      if (cached) {
        setLikeCount(cached.likeCount);
        setIsLiked(cached.isLiked);
      }
    };

    initFromCache();
  }, [postId]);

  const updateCache = async (newLikeCount: number, newIsLiked: boolean) => {
    await CacheManager.set({
      key: getCacheKey(),
      expiryMinutes: 60,
    }, {
      likeCount: newLikeCount,
      isLiked: newIsLiked,
    });
  };

  const toggleLike = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Optimistic update
      const newIsLiked = !isLiked;
      const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;
      
      setIsLiked(newIsLiked);
      setLikeCount(newLikeCount);

      // Update cache optimistically
      await updateCache(newLikeCount, newIsLiked);

      if (newIsLiked) {
        // Like the post
        const { error: likeError } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: userData.user.id,
          });

        if (likeError) throw likeError;

        // Increment likes count
        await supabase.rpc('increment_post_likes', { post_id: postId });
      } else {
        // Unlike the post
        const { error: unlikeError } = await supabase
          .from('post_likes')
          .delete()
          .match({
            post_id: postId,
            user_id: userData.user.id,
          });

        if (unlikeError) throw unlikeError;

        // Decrement likes count
        await supabase.rpc('decrement_post_likes', { post_id: postId });
      }

      return { error: null };
    } catch (err) {
      // Revert optimistic update on error
      const revertedIsLiked = !isLiked;
      const revertedLikeCount = revertedIsLiked ? likeCount + 1 : likeCount - 1;
      
      setIsLiked(revertedIsLiked);
      setLikeCount(revertedLikeCount);
      
      // Revert cache
      await updateCache(revertedLikeCount, revertedIsLiked);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update like';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .match({
          post_id: postId,
          user_id: userData.user.id,
        })
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      const newIsLiked = !!data;
      setIsLiked(newIsLiked);

      // Get updated like count
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (postError) throw postError;
      const newLikeCount = postData.likes_count;
      setLikeCount(newLikeCount);

      // Update cache with verified data
      await updateCache(newLikeCount, newIsLiked);
    } catch (err) {
      console.error('Error checking like status:', err);
    }
  };

  const subscribeToLikes = () => {
    const subscription = supabase
      .channel(`post_likes:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${postId}`,
        },
        async () => {
          // Clear cache when real-time update received
          await CacheManager.clear(getCacheKey());
          checkLikeStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      CacheManager.clear(getCacheKey());
    };
  }, [postId]);

  return {
    likeCount,
    isLiked,
    loading,
    error,
    toggleLike,
    checkLikeStatus,
    subscribeToLikes,
  };
};
