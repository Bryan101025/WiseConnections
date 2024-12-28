// src/hooks/useLikes.ts
import { useState } from 'react';
import { supabase } from '../config/supabase';

interface UseLikesProps {
  postId: string;
  initialLikeCount?: number;
  initialIsLiked?: boolean;
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

  const toggleLike = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Optimistic update
      const newIsLiked = !isLiked;
      setIsLiked(newIsLiked);
      setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);

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
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update like';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Check if user has liked the post
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

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      setIsLiked(!!data);

      // Get updated like count
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (postError) throw postError;
      setLikeCount(postData.likes_count);
    } catch (err) {
      console.error('Error checking like status:', err);
    }
  };

  // Subscribe to real-time updates for likes
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
        () => {
          checkLikeStatus();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

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

// Example usage in a component:
/*
const PostLikes = ({ postId, initialLikeCount, initialIsLiked }) => {
  const {
    likeCount,
    isLiked,
    loading,
    toggleLike,
    subscribeToLikes,
  } = useLikes({
    postId,
    initialLikeCount,
    initialIsLiked,
  });

  useEffect(() => {
    const unsubscribe = subscribeToLikes();
    return () => unsubscribe();
  }, [postId]);

  return (
    <TouchableOpacity
      onPress={toggleLike}
      disabled={loading}
    >
      <Icon
        name={isLiked ? "heart" : "heart-outline"}
        size={20}
        color={isLiked ? "#FF3B30" : "#666"}
      />
      <Text>{likeCount}</Text>
    </TouchableOpacity>
  );
};
*/
