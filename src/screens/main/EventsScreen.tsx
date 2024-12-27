// src/screens/main/EventsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';

type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attending_count: number;
};

const EventsScreen = ({ navigation }) => {
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
        // Fetch nearby events
        const { data, error } = await supabase
          .from('events')
          .select('*, event_participants(count)')
          .gte('date_time', new Date().toISOString())
          .order('date_time', { ascending: true });
        
        if (error) throw error;
        setEvents(data || []);
      } else {
        // Fetch events user is going to
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

  const renderEventCard = ({ item }: { item: Event }) => (
    <View style={styles.eventCard}>
      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventDescription}>{item.description}</Text>
      
      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Icon name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {new Date(item.date_time).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {new Date(item.date_time).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="people-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{item.current_participants} attending</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.rsvpButton}
        onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
      >
        <Text style={styles.rsvpButtonText}>RSVP</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenTemplate>
      <Text style={styles.title}>Events</Text>
      
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

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
        />
      )}
    </ScreenTemplate>
  );
};
const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  eventDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  rsvpButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  rsvpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventsScreen;
