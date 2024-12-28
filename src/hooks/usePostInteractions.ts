// src/hooks/usePostInteractions.ts
import { useState } from 'react';
import { supabase } from '../config/supabase';

export const usePostInteractions = () => {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  const toggleLike = async (postId: string) => {
    try {
      setLoading(prev => ({ ...prev, [postId]: true }));
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userData.user.id)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userData.user.id);

        // Decrement likes count
        await supabase.rpc('decrement_post_likes', { post_id: postId });
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: userData.user.id,
          });

        // Increment likes count
        await supabase.rpc('increment_post_likes', { post_id: postId });
      }

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle like';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  const addComment = async (postId: string, content: string) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: userData.user.id,
          content,
        })
        .select(`
          *,
          user:profiles!user_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .single();

      if (error) throw error;

      // Increment comments count
      await supabase.rpc('increment_post_comments', { post_id: postId });

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  return {
    loading,
    error,
    toggleLike,
    addComment,
  };
};
