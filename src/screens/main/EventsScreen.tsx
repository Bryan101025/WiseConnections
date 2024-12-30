// src/screens/main/EventsScreen.tsx
import React, { useState, useEffect } from 'react';
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

const EventCard = ({ event, navigation }) => {
  const tabAnimation = new Animated.Value(0);
  
  useEffect(() => {
    Animated.spring(tabAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.eventCard,
        {
          opacity: tabAnimation,
          transform: [{
            translateY: tabAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
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
};

const EventsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, handleError, clearError } = useNetworkError();
  const [error, setError] = useState<string | null>(null);
  const tabAnimation = new Animated.Value(1);

  const animateTabChange = () => {
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
  };

  useEffect(() => {
    animateTabChange();
    fetchEvents();
  }, [activeTab]);

  const fetchEvents = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (activeTab === 'discover') {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('date_time', new Date().toISOString())
          .order('date_time', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } else {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('date_time', new Date().toISOString())
          .eq('event_participants.participant_id', userData.user.id)
          .eq('event_participants.status', 'registered')
          .order('date_time', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching events';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    clearError();
    fetchEvents(true);
  };

  const renderContent = () => {
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
          renderItem={({ item }) => <EventCard event={item} navigation={navigation} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      </Animated.View>
    );
  };

  return (
    <ErrorBoundary>
      <ScreenTemplate>
        <View style={styles.header}>
          <Text style={styles.title}>Events</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
            onPress={() => setActiveTab('discover')}
          >
            <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
              Discover
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'going' && styles.activeTab]}
            onPress={() => setActiveTab('going')}
          >
            <Text style={[styles.tabText, activeTab === 'going' && styles.activeTabText]}>
              Going
            </Text>
          </TouchableOpacity>
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
});

export default EventsScreen;
