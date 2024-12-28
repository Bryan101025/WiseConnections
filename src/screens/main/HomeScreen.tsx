// src/screens/main/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { NearbyEventsSection } from '../../components/NearbyEventsSection';
import { ActivityFeedFilter } from '../../components/ActivityFeedFilter';
import { PostCard } from '../../components/PostCard';
import { EventCard } from '../../components/EventCard';
import { supabase } from '../../config/supabase';

type FeedType = 'posts' | 'events';

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FeedType>('posts');
  const { 
    feed, 
    loading, 
    refreshing, 
    handleRefresh, 
    loadMore,
    updateFeedItem,
    removeFeedItem,
    addFeedItem,
  } = useActivityFeed(activeFilter);

  useEffect(() => {
    // Set up real-time subscriptions
    const postsChannel = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          if (activeFilter === 'posts') {
            // Fetch complete post data with user info
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
                  addFeedItem({
                    ...data,
                    type: 'post',
                    likes_count: 0,
                    comments_count: 0,
                    is_liked: false,
                  });
                }
              });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          if (activeFilter === 'posts') {
            updateFeedItem(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          if (activeFilter === 'posts') {
            removeFeedItem(payload.old.id);
          }
        }
      )
      .subscribe();

    // Subscribe to events changes
    const eventsChannel = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          if (activeFilter === 'events') {
            if (payload.eventType === 'INSERT') {
              addFeedItem({ ...payload.new, type: 'event' });
            } else if (payload.eventType === 'UPDATE') {
              updateFeedItem(payload.new);
            } else if (payload.eventType === 'DELETE') {
              removeFeedItem(payload.old.id);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to interactions (likes and comments)
    const interactionsChannel = supabase
      .channel('public:interactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
        },
        () => {
          if (activeFilter === 'posts') {
            handleRefresh();
          }
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
          if (activeFilter === 'posts') {
            handleRefresh();
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      postsChannel.unsubscribe();
      eventsChannel.unsubscribe();
      interactionsChannel.unsubscribe();
    };
  }, [activeFilter]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Wise Connections</Text>
        <Text style={styles.subtitle}>Connecting 55+ in Myrtle Beach</Text>

        <NearbyEventsSection />

        <ActivityFeedFilter
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            if (isEndReached && !loading) {
              loadMore();
            }
          }}
          scrollEventThrottle={16}
        >
          {feed.map(item => (
            item.type === 'post' ? (
              <PostCard 
                key={item.id} 
                post={item}
              />
            ) : (
              <EventCard 
                key={item.id} 
                event={item}
              />
            )
          ))}
          {loading && (
            <ActivityIndicator style={styles.loader} color="#007AFF" />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  loader: {
    padding: 20,
  },
});

export default HomeScreen;
