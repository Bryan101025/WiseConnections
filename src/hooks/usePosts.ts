// src/hooks/usePosts.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { NotificationTriggers } from '../services/NotificationTriggers';
import { OfflineQueue } from '../utils/offlineQueue';
import NetInfo from '@react-native-community/netinfo';



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

    // Check network status
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      // Create optimistic post
      const optimisticPost: Post = {
        id: `temp_${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        is_liked: false,
        user: {
          id: userData.user.id,
          first_name: userData.user.first_name,
          last_name: userData.user.last_name,
          profile_photo_url: userData.user.profile_photo_url,
        },
      };

      // Add to offline queue
      await OfflineQueue.addToQueue({
        type: 'create_post',
        data: {
          content,
          user_id: userData.user.id,
        },
      });

      // Update UI optimistically
      setPosts(prev => [optimisticPost, ...prev]);
      return { data: optimisticPost, error: null };
    }

    // If online, proceed with normal creation
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

    const handleLike = async (postId: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Check network status
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      // Add to offline queue
      await OfflineQueue.addToQueue({
        type: 'like_post',
        data: {
          post_id: postId,
          user_id: userData.user.id,
        },
      });

      // Update UI optimistically
      setPosts(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, likes_count: post.likes_count + 1, is_liked: true }
            : post
        )
      );
      return;
    }

    // If online, proceed with normal like
    const { error: likeError } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userData.user.id,
      });

    if (likeError) throw likeError;

    await NotificationTriggers.createLikeNotification(postId, userData.user.id);
    
    setPosts(prev => 
      prev.map(post => 
        post.id === postId 
          ? { ...post, likes_count: post.likes_count + 1, is_liked: true }
          : post
      )
    );
  } catch (error) {
    console.error('Error handling like:', error);
  }
};

  const handleComment = async (postId: string, content: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    // Check network status
    const networkState = await NetInfo.fetch();
    
    if (!networkState.isConnected) {
      // Add to offline queue
      await OfflineQueue.addToQueue({
        type: 'create_comment',
        data: {
          post_id: postId,
          user_id: userData.user.id,
          content,
        },
      });

      // Update UI optimistically
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );
      return;
    }

    // If online, proceed with normal comment creation
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userData.user.id,
        content,
      })
      .select()
      .single();

    if (commentError) throw commentError;

    await NotificationTriggers.createCommentNotification(
      postId,
      comment.id,
      userData.user.id
    );

    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      )
    );
  } catch (error) {
    console.error('Error handling comment:', error);
  }
};

  return {
    posts,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    createPost,
    deletePost,
    handleLike,
    handleComment
  };
};
