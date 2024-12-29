// src/screens/main/EventsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';

type Event = {
  id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  current_participants: number;
};

type Props = NativeStackScreenProps<any, 'Events'>;

const EventCard = ({ event, navigation }) => (
  <View style={styles.eventCard}>
    <Text style={styles.eventTitle}>{event.title}</Text>
    <Text style={styles.eventDescription}>{event.description}</Text>
    
    <View style={styles.eventMetadata}>
      <View style={styles.metadataItem}>
        <Icon name="calendar-outline" size={16} color="#666" />
        <Text style={styles.metadataText}>
          {new Date(event.date_time).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.metadataItem}>
        <Icon name="time-outline" size={16} color="#666" />
        <Text style={styles.metadataText}>
          {new Date(event.date_time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <View style={styles.metadataItem}>
        <Icon name="location-outline" size={16} color="#666" />
        <Text style={styles.metadataText}>{event.location}</Text>
      </View>
    </View>

    <View style={styles.attendingInfo}>
      <Text style={styles.attendingText}>{event.current_participants} attending</Text>
      <TouchableOpacity 
        style={styles.rsvpButton}
        onPress={() => navigation.navigate('EventDetails', { eventId: event.id })}
      >
        <Text style={styles.rsvpButtonText}>RSVP</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const EventsScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('discover');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();

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
          .eq('event_participants.participant_id', userData.user?.id)
          .eq('event_participants.status', 'registered')
          .order('date_time', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
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
      <FlatList
        data={events}
        renderItem={({ item }) => <EventCard event={item} navigation={navigation} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventsList}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchEvents}
      />
    );
  };

  return (
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
    paddingVertical: 12,
    marginRight: 24,
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
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  eventMetadata: {
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  attendingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendingText: {
    fontSize: 14,
    color: '#666',
  },
  rsvpButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventsList: {
    padding: 16,
  },
  // New styles for loading and empty states
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 4,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
