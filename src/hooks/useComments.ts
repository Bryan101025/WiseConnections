// src/hooks/useComments.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export const useComments = (postId: string) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:profiles!user_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching comments');
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content,
          post_id: postId,
          user_id: userData.user.id,
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

      setComments(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error adding comment';
      return { data: null, error: errorMessage };
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Error deleting comment' };
    }
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        fetchComments
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [postId]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refresh: fetchComments,
  };
};
