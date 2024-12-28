// src/hooks/useActivityFeed.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { CacheManager } from '../utils/cacheManager';

type FeedType = 'posts' | 'events';

interface BaseFeedItem {
  id: string;
  created_at: string;
  type: FeedType;
}

interface PostFeedItem extends BaseFeedItem {
  type: 'posts';
  content: string;
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

interface EventFeedItem extends BaseFeedItem {
  type: 'events';
  title: string;
  description: string;
  date_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
}

type FeedItem = PostFeedItem | EventFeedItem;

export const useActivityFeed = (activeFilter: FeedType) => {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 10;

  const getCacheKey = (pageNum: number) => 
    `feed_${activeFilter}_page${pageNum}_${new Date().toDateString()}`;

  const fetchFeed = async (pageNum: number, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Try to get cached data if not refreshing
      if (!isRefreshing) {
        const cachedData = await CacheManager.get<FeedItem[]>({
          key: getCacheKey(pageNum),
          expiryMinutes: 5, // Cache expires after 5 minutes
        });

        if (cachedData) {
          setFeed(prev => pageNum === 1 ? cachedData : [...prev, ...cachedData]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const start = (pageNum - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      if (activeFilter === 'posts') {
        const { data: posts, error: postsError } = await supabase
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

        if (postsError) throw postsError;

        const transformedPosts: PostFeedItem[] = posts.map(post => ({
          ...post,
          type: 'posts',
          is_liked: post.likes.some(like => like.user_id === userData.user?.id),
          likes: undefined,
        }));

        // Cache the transformed posts
        await CacheManager.set({
          key: getCacheKey(pageNum),
          expiryMinutes: 5,
        }, transformedPosts);

        setFeed(prev => pageNum === 1 ? transformedPosts : [...prev, ...transformedPosts]);
        setHasMore(posts.length === ITEMS_PER_PAGE);

      } else {
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .gte('date_time', new Date().toISOString())
          .order('date_time', { ascending: true })
          .range(start, end);

        if (eventsError) throw eventsError;

        const transformedEvents: EventFeedItem[] = events.map(event => ({
          ...event,
          type: 'events',
        }));

        // Cache the transformed events
        await CacheManager.set({
          key: getCacheKey(pageNum),
          expiryMinutes: 5,
        }, transformedEvents);

        setFeed(prev => pageNum === 1 ? transformedEvents : [...prev, ...transformedEvents]);
        setHasMore(events.length === ITEMS_PER_PAGE);
      }

    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchFeed(1);

    // Set up real-time subscription
    const subscription = supabase
      .channel(`${activeFilter}_feed`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: activeFilter,
        },
        async (payload) => {
          // Clear cache when data changes
          await CacheManager.clear(getCacheKey(1));
          fetchFeed(1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeFilter]);

  const handleRefresh = async () => {
    // Clear cache when manually refreshing
    await CacheManager.clear(getCacheKey(1));
    setPage(1);
    await fetchFeed(1, true);
  };

  const loadMore = async () => {
    if (!hasMore || loading || refreshing) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchFeed(nextPage);
  };

  return {
    feed,
    loading,
    refreshing,
    hasMore,
    handleRefresh,
    loadMore,
  };
};
