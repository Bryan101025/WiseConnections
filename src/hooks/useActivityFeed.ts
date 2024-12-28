// src/hooks/useActivityFeed.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

type FeedType = 'posts' | 'events';

type FeedItem = {
  id: string;
  type: FeedType;
  content?: string;
  title?: string;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  likes_count?: number;
  comments_count?: number;
};

export const useActivityFeed = (activeFilter: FeedType) => {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchFeed = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (activeFilter === 'posts') {
        const { data: posts, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            likes_count,
            comments_count,
            user:profiles!user_id (
              id,
              first_name,
              last_name,
              profile_photo_url
            )
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        if (error) throw error;

        const formattedPosts = posts.map(post => ({
          ...post,
          type: 'posts' as FeedType
        }));

        setFeed(prev => isRefreshing ? formattedPosts : [...prev, ...formattedPosts]);
      } else {
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .gte('date_time', new Date().toISOString())
          .order('date_time', { ascending: true })
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        if (error) throw error;

        const formattedEvents = events.map(event => ({
          ...event,
          type: 'events' as FeedType
        }));

        setFeed(prev => isRefreshing ? formattedEvents : [...prev, ...formattedEvents]);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setPage(1);
    await fetchFeed(true);
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    setPage(1);
    setFeed([]);
    fetchFeed();
  }, [activeFilter]);

  useEffect(() => {
    fetchFeed();
  }, [page]);

  return {
    feed,
    loading,
    refreshing,
    handleRefresh,
    loadMore,
  };
};
