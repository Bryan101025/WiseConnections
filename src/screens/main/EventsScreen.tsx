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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

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

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={styles.loader} />
      ) : (
        <FlatList
          data={events}
          renderItem={({ item }) => <EventCard event={item} navigation={navigation} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenTemplate>
  );
};

// ... (keep the existing styles)

export default EventsScreen;
