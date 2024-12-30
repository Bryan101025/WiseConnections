// src/screens/main/DiscoverScreen.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import { format } from 'date-fns';
import { CacheManager } from '../../utils/cacheManager';
import { MemoryManager } from '../../utils/memoryManager';

const ALL_INTERESTS = [
  'Reading',
  'Gardening',
  'Golf',
  'Beach Walks',
  'Cooking',
  'Painting',
  'Fitness',
  'Travel',
];

interface UpcomingEvent {
  id: string;
  title: string;
  date_time: string;
}

interface RecommendedUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  interests: string[];
}

const OptimizedImage = memo(({ uri, style }) => {
  if (!uri) {
    return (
      <FastImage
        style={style}
        source={require('../../assets/default-avatar.png')}
        resizeMode={FastImage.resizeMode.cover}
      />
    );
  }

  return (
    <FastImage
      style={style}
      source={{
        uri,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      }}
      resizeMode={FastImage.resizeMode.cover}
    />
  );
});

const InterestChip = memo(({ interest, isSelected, onToggle }) => (
  <TouchableOpacity
    style={[
      styles.interestChip,
      isSelected && styles.selectedInterestChip
    ]}
    onPress={() => onToggle(interest)}
  >
    <Text style={[
      styles.interestText,
      isSelected && styles.selectedInterestText
    ]}>
      {interest}
    </Text>
  </TouchableOpacity>
));

const EventCard = memo(({ event, onPress }) => (
  <TouchableOpacity
    style={styles.eventCard}
    onPress={onPress}
  >
    <Text style={styles.eventTitle}>{event.title}</Text>
    <View style={styles.eventDateContainer}>
      <Icon name="calendar-outline" size={16} color="#666" />
      <Text style={styles.eventDate}>
        {format(new Date(event.date_time), 'MM/dd/yyyy h:mm a')}
      </Text>
    </View>
  </TouchableOpacity>
));

const UserCard = memo(({ user, selectedInterests, onPress }) => (
  <TouchableOpacity
    style={styles.userCard}
    onPress={onPress}
  >
    <OptimizedImage
      uri={user.profile_photo_url}
      style={styles.userAvatar}
    />
    <View style={styles.userInfo}>
      <Text style={styles.userName}>
        {user.first_name} {user.last_name}
      </Text>
      <Text style={styles.userInterests}>
        Interests: {user.interests
          .filter(interest => selectedInterests.includes(interest))
          .join(', ')}
      </Text>
    </View>
  </TouchableOpacity>
));

const DiscoverScreen = ({ navigation }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, handleError, clearError } = useNetworkError();
  const [error, setError] = useState<string | null>(null);
  
  const dataCache = useRef(new Map());
  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const getCacheKey = (type: string) => `discover_${type}_${new Date().toDateString()}`;

  const fetchWithCache = async (type: string, fetchFn: () => Promise<any>) => {
    const cacheKey = getCacheKey(type);
    
    // Check memory cache
    if (dataCache.current.has(cacheKey)) {
      return dataCache.current.get(cacheKey);
    }

    // Check persistent cache
    const cachedData = await CacheManager.get({
      key: cacheKey,
      expiryMinutes: 5,
    });

    if (cachedData) {
      dataCache.current.set(cacheKey, cachedData);
      return cachedData;
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Update both caches
    dataCache.current.set(cacheKey, data);
    await CacheManager.set({
      key: cacheKey,
      expiryMinutes: 5,
    }, data);

    return data;
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const profile = await fetchWithCache('profile', async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', userData.user.id)
          .single();

        if (error) throw error;
        return data;
      });

      if (isMounted.current && profile?.interests) {
        setSelectedInterests(profile.interests);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  }, []);

  const fetchUpcomingEvents = useCallback(async () => {
    try {
      const events = await fetchWithCache('events', async () => {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, date_time')
          .in('tags', selectedInterests)
          .gte('date_time', new Date().toISOString())
          .order('date_time', { ascending: true })
          .limit(5);

        if (error) throw error;
        return data;
      });

      if (isMounted.current) {
        setUpcomingEvents(events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  }, [selectedInterests]);

  const fetchRecommendedUsers = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const users = await fetchWithCache('users', async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_photo_url, interests')
          .neq('id', userData.user.id)
          .filter('interests', 'cs', `{${selectedInterests.join(',')}}`)
          .limit(5);

        if (error) throw error;
        return data;
      });

      if (isMounted.current) {
        setRecommendedUsers(users || []);
      }
    } catch (err) {
      console.error('Error fetching recommended users:', err);
    }
  }, [selectedInterests]);

  const fetchData = useCallback(async (isRefreshing = false) => {
    try {
      setError(null);
      if (isRefreshing) {
        setRefreshing(true);
        dataCache.current.clear();
        await Promise.all([
          CacheManager.clear(getCacheKey('profile')),
          CacheManager.clear(getCacheKey('events')),
          CacheManager.clear(getCacheKey('users')),
        ]);
      } else {
        setLoading(true);
      }

      await Promise.all([
        fetchUserProfile(),
        fetchUpcomingEvents(),
        fetchRecommendedUsers(),
      ]);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      handleError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchUserProfile, fetchUpcomingEvents, fetchRecommendedUsers]);

  useEffect(() => {
    MemoryManager.incrementListeners();
    fetchData();

    return () => {
      isMounted.current = false;
      MemoryManager.decrementListeners();
      dataCache.current.clear();
    };
  }, []);

  useEffect(() => {
    if (selectedInterests.length > 0) {
      fetchUpcomingEvents();
      fetchRecommendedUsers();
    }
  }, [selectedInterests]);

  const toggleInterest = useCallback((interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  }, []);

  const handleRefresh = useCallback(() => {
    clearError();
    fetchData(true);
  }, [fetchData, clearError]);

  if (!isOnline) {
    return (
      <ErrorView
        error="No internet connection. Please check your network and try again."
        icon="cloud-offline-outline"
        onRetry={() => fetchData()}
      />
    );
  }

  if (loading && !refreshing) {
    return (
      <ScreenTemplate>
        <View style={styles.loadingContainer}>
          <SkeletonPresets.Title style={styles.skeletonTitle} />
          <View style={styles.skeletonInterests}>
            {[1, 2, 3, 4].map((_, index) => (
              <SkeletonPresets.Text 
                key={index}
                style={styles.skeletonInterest}
              />
            ))}
          </View>
          <SkeletonPresets.Title style={styles.skeletonSectionTitle} />
          <SkeletonPresets.Card style={styles.skeletonCard} />
        </View>
      </ScreenTemplate>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenTemplate>
        <Animated.ScrollView
          style={[styles.container, { opacity: fadeAnim }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Select Your Interests</Text>
          <View style={styles.interestsContainer}>
            {ALL_INTERESTS.map((interest) => (
              <InterestChip
                key={interest}
                interest={interest}
                isSelected={selectedInterests.includes(interest)}
                onToggle={toggleInterest}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => navigation.navigate('Events', {
                screen: 'EventDetails',
                params: { eventId: event.id }
              })}
            />
          ))}

          <Text style={styles.sectionTitle}>Recommended Connections</Text>
          {recommendedUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              selectedInterests={selectedInterests}
              onPress={() => navigation.navigate('Connections', {
                screen: 'UserProfile',
                params: { userId: user.id }
              })}
            />
          ))}
        </Animated.ScrollView>
      </ScreenTemplate>
    </ErrorBoundary>
  );
};

// ... styles remain the same ...

export default memo(DiscoverScreen);
