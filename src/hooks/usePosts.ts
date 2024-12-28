// src/hooks/usePosts.ts
import { useState, useEffect } from 'react';
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const start = (page - 1) * limit;
      const end = start + limit - 1;

      // Fetch posts with user info and like status
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
            id,
            user_id
          )
        `)
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;

      // Transform data to include is_liked status
      const transformedPosts = data.map(post => ({
        ...post,
        is_liked: post.likes.some(like => like.user_id === userData.user?.id),
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
      setPosts(prev => [{
        ...data,
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
      }, ...prev]);

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

  useEffect(() => {
    fetchPosts();

    // Set up real-time subscriptions
    const postSubscription = supabase
      .channel('posts-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete post data with user info
            supabase
              .from('posts')
              .select(`
                *,
                user:profiles!user_id (
                  id,
                  first_name,
                  last_name,
                  profile_photo_url
                )
              `)
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setPosts(prev => [{
                    ...data,
                    likes_count: 0,
                    comments_count: 0,
                    is_liked: false,
                  }, ...prev]);
                }
              });
          } else if (payload.eventType === 'UPDATE') {
            setPosts(prev => 
              prev.map(post => 
                post.id === payload.new.id 
                  ? { ...post, ...payload.new } 
                  : post
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => 
              prev.filter(post => post.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Subscribe to likes and comments changes
    const interactionsSubscription = supabase
      .channel('interactions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
        },
        () => {
          // Refresh posts when likes change
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        () => {
          // Refresh posts when comments change
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      postSubscription.unsubscribe();
      interactionsSubscription.unsubscribe();
    };
  }, []);

  const refresh = () => fetchPosts(1);
  const loadMore = () => fetchPosts(Math.ceil(posts.length / 10) + 1);

  return {
    posts,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    createPost,
    deletePost,
  };
};
