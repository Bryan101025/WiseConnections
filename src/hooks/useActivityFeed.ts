// src/hooks/useActivityFeed.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { CacheManager } from '../utils/cacheManager';
import { MemoryManager } from '../utils/memoryManager';

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

const ITEMS_PER_PAGE = 10;

export const useActivityFeed = (activeFilter: FeedType) => {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const feedCache = useRef<Map<number, FeedItem[]>>(new Map());

  const getCacheKey = (pageNum: number) => 
    `feed_${activeFilter}_page${pageNum}_${new Date().toDateString()}`;

  const fetchFeed = useCallback(async (pageNum: number, isRefreshing = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Check memory cache first
      if (!isRefreshing && feedCache.current.has(pageNum)) {
        const cachedData = feedCache.current.get(pageNum);
        if (cachedData) {
          setFeed(prev => pageNum === 1 ? cachedData : [...prev, ...cachedData]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Try to get persistent cached data if not refreshing
      if (!isRefreshing) {
        const cachedData = await CacheManager.get<FeedItem[]>({
          key: getCacheKey(pageNum),
          expiryMinutes: 5,
        });

        if (cachedData) {
          feedCache.current.set(pageNum, cachedData);
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

        // Update both caches
        feedCache.current.set(pageNum, transformedPosts);
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

        // Update both caches
        feedCache.current.set(pageNum, transformedEvents);
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
      isFetchingRef.current = false;
    }
  }, [activeFilter]);

  const handleRefresh = useCallback(async () => {
    feedCache.current.clear();
    await CacheManager.clear(getCacheKey(1));
    pageRef.current = 1;
    await fetchFeed(1, true);
  }, [fetchFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || isFetchingRef.current) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    await fetchFeed(nextPage);
  }, [hasMore, loading, refreshing, fetchFeed]);

  useEffect(() => {
    pageRef.current = 1;
    feedCache.current.clear();
    fetchFeed(1);

    const subscription = supabase
      .channel(`${activeFilter}_feed`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: activeFilter,
        },
        async () => {
          feedCache.current.clear();
          await CacheManager.clear(getCacheKey(1));
          fetchFeed(1);
        }
      )
      .subscribe();

    // Register cleanup with memory manager
    const cleanup = () => {
      feedCache.current.clear();
      setFeed([]);
    };
    MemoryManager.addCleanupCallback(cleanup);

    return () => {
      subscription.unsubscribe();
      MemoryManager.removeCleanupCallback(cleanup);
    };
  }, [activeFilter]);

  return {
    feed,
    loading,
    refreshing,
    hasMore,
    handleRefresh,
    loadMore,
  };
};
