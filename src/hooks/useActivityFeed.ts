// src/hooks/useActivityFeed.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

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

  const fetchFeed = async (pageNum: number, isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
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
