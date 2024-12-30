// src/screens/main/EventsScreen.tsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Animated,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { format } from 'date-fns';
import { CacheManager } from '../../utils/cacheManager';
import { MemoryManager } from '../../utils/memoryManager';

type Event = {
  id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
};

type Props = NativeStackScreenProps<any, 'Events'>;

const AnimatedEventCard = memo(({ event, navigation, index }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.eventCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDescription}>{event.description}</Text>
      
      <View style={styles.eventMetadata}>
        <View style={styles.metadataItem}>
          <Icon name="calendar-outline" size={20} color="#666" />
          <Text style={styles.metadataText}>
            {format(new Date(event.date_time), 'MM/dd/yyyy')}
          </Text>
        </View>
        <View style={styles.metadataItem}>
          <Icon name="time-outline" size={20} color="#666" />
          <Text style={styles.metadataText}>
            {format(new Date(event.date_time), 'h:mm a')}
          </Text>
        </View>
        <View style={styles.metadataItem}>
          <Icon name="location-outline" size={20} color="#666" />
          <Text style={styles.metadataText}>{event.location}</Text>
        </View>
      </View>

      <View style={styles.attendingInfo}>
        <Text style={styles.attendingText}>
          {event.current_participants} attending
        </Text>
        <TouchableOpacity 
          style={styles.rsvpButton}
          onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
        >
          <Text style={styles.rsvpButtonText}>RSVP</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const TabButton = memo(({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
));

const EventsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, handleError, clearError } = useNetworkError();
  const [error, setError] = useState<string | null>(null);
  
  const dataCache = useRef(new Map());
  const isMounted = useRef(true);
  const isFetchingRef = useRef(false);
  const tabAnimation = useRef(new Animated.Value(1)).current;

  const getCacheKey = useCallback((tab: string) => 
    `events_${tab}_${new Date().toDateString()}`, []);

  const animateTabChange = useCallback(() => {
    Animated.sequence([
      Animated.timing(tabAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(tabAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchEvents = useCallback(async (isRefreshing = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isRefreshing) {
        setRefreshing(true);
        dataCache.current.clear();
        await CacheManager.clear(getCacheKey(activeTab));
      } else {
        setLoading(true);
      }
      setError(null);

      // Check memory cache first
      if (!isRefreshing && dataCache.current.has(activeTab)) {
        const cachedData = dataCache.current.get(activeTab);
        setEvents(cachedData);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Check persistent cache
      if (!isRefreshing) {
        const cachedData = await CacheManager.get<Event[]>({
          key: getCacheKey(activeTab),
          expiryMinutes: 5,
        });

        if (cachedData) {
          dataCache.current.set(activeTab, cachedData);
          setEvents(cachedData);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let query = supabase
        .from('events')
        .select('*')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

      if (activeTab === 'going') {
        query = query
          .eq('event_participants.participant_id', userData.user.id)
          .eq('event_participants.status', 'registered');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Update both caches
      const eventsData = data || [];
      dataCache.current.set(activeTab, eventsData);
      await CacheManager.set({
        key: getCacheKey(activeTab),
        expiryMinutes: 5,
      }, eventsData);

      if (isMounted.current) {
        setEvents(eventsData);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching events';
      setError(errorMessage);
      handleError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, [activeTab]);

  const handleRefresh = useCallback(() => {
    clearError();
    fetchEvents(true);
  }, [fetchEvents, clearError]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    animateTabChange();
  }, [animateTabChange]);

  useEffect(() => {
    MemoryManager.incrementListeners();
    fetchEvents();

    return () => {
      isMounted.current = false;
      MemoryManager.decrementListeners();
      dataCache.current.clear();
    };
  }, [activeTab]);

  const renderContent = useCallback(() => {
    if (!isOnline) {
      return (
        <ErrorView
          error="No internet connection. Please check your network and try again."
          icon="cloud-offline-outline"
          onRetry={handleRefresh}
        />
      );
    }

    if (loading && !refreshing) {
      return (
        <ScrollView 
          contentContainerStyle={styles.skeletonContainer}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.skeletonCard}>
              <SkeletonPresets.Title />
              <SkeletonPresets.Text />
              <View style={styles.skeletonMetadata}>
                <SkeletonPresets.Text />
                <SkeletonPresets.Text />
                <SkeletonPresets.Text />
              </View>
              <View style={styles.skeletonFooter}>
                <SkeletonPresets.Text />
                <View style={styles.skeletonButton}>
                  <SkeletonPresets.Text />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      );
    }

    if (error) {
      return (
        <ErrorView
          error={error}
          onRetry={handleRefresh}
        />
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon 
            name={activeTab === 'discover' ? 'calendar-outline' : 'bookmark-outline'} 
            size={48} 
            color="#666" 
          />
          <Text style={styles.emptyText}>
            {activeTab === 'discover' 
              ? 'No events available at the moment' 
              : 'You haven't RSVP'd to any events yet'}
          </Text>
        </View>
      );
    }

    return (
      <Animated.View style={{ opacity: tabAnimation }}>
        <FlatList
          data={events}
          renderItem={({ item, index }) => (
            <AnimatedEventCard 
              event={item} 
              navigation={navigation}
              index={index}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          windowSize={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
        />
      </Animated.View>
    );
  }, [isOnline, loading, refreshing, error, events, activeTab, tabAnimation]);

  return (
    <ErrorBoundary>
      <ScreenTemplate>
        <View style={styles.header}>
          <Text style={styles.title}>Events</Text>
        </View>

        <View style={styles.tabContainer}>
          <TabButton
            label="Discover"
            isActive={activeTab === 'discover'}
            onPress={() => handleTabChange('discover')}
          />
          <TabButton
            label="Going"
            isActive={activeTab === 'going'}
            onPress={() => handleTabChange('going')}
          />
        </View>

        {renderContent()}
      </ScreenTemplate>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  eventMetadata: {
    marginBottom: 16,
    gap: 8,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  attendingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  attendingText: {
    fontSize: 14,
    color: '#666',
  },
  rsvpButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsList: {
    padding: 16,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
    skeletonMetadata: {
    marginVertical: 16,
    gap: 8,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  skeletonButton: {
    width: 80,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  // New optimized styles
  animatedContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  touchableHighlight: {
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default memo(EventsScreen);
