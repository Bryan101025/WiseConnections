// src/screens/main/HomeScreen.tsx
import React, { useState } from 'react';
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

type FeedType = 'posts' | 'events';

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FeedType>('posts');
  const { 
    feed, 
    loading, 
    refreshing, 
    handleRefresh, 
    loadMore 
  } = useActivityFeed(activeFilter);

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
              <PostCard key={item.id} post={item} />
            ) : (
              <EventCard key={item.id} event={item} />
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
