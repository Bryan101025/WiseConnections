// src/hooks/usePosts.ts
import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

export interface Post {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export const usePosts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const start = (page - 1) * limit;
      const end = start + limit - 1;

      // Fetch posts with likes status
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles!user_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          ),
          likes:post_likes!left (
            id
          )
        `)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      // Transform the data to include is_liked
      const transformedPosts = data.map(post => ({
        ...post,
        is_liked: post.likes.some((like: any) => like.user_id === userData.user?.id),
        likes: undefined, // Remove the likes array from the final object
      }));

      setPosts(prev => page === 1 ? transformedPosts : [...prev, ...transformedPosts]);
      setHasMore(data.length === limit);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          content,
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

      // Add the new post to the state
      setPosts(prev => [{ ...data, likes_count: 0, comments_count: 0 }, ...prev]);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  const deletePost = async (postId: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove the post from state
      setPosts(prev => prev.filter(post => post.id !== postId));
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete post';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  const refresh = () => fetchPosts(1);

  return {
    posts,
    loading,
    error,
    hasMore,
    fetchPosts,
    createPost,
    deletePost,
    refresh,
  };
};
