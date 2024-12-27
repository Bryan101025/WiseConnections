// src/screens/main/EventDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Event, EventParticipant, Profile } from '../../types/database';

type Props = NativeStackScreenProps<any, 'EventDetails'>;

const EventDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [creator, setCreator] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [userParticipation, setUserParticipation] = useState<EventParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningStatus, setJoiningStatus] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Fetch creator details
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', eventData.creator_id)
        .single();

      if (creatorError) throw creatorError;
      setCreator(creatorData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          profiles:participant_id (*)
        `)
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (participantsError) throw participantsError;
      setParticipants(participantsData.map(p => p.profiles));

      // Check user's participation status
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: participationData } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', eventId)
          .eq('participant_id', userData.user.id)
          .single();

        setUserParticipation(participationData);
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    try {
      setJoiningStatus(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          participant_id: userData.user.id,
          status: 'registered'
        });

      if (error) throw error;

      // Update current_participants count
      await supabase
        .from('events')
        .update({ current_participants: (event?.current_participants || 0) + 1 })
        .eq('id', eventId);

      fetchEventDetails(); // Refresh the data
      Alert.alert('Success', 'You have joined the event!');
    } catch (error) {
      Alert.alert('Error', 'Failed to join event');
    } finally {
      setJoiningStatus(false);
    }
  };

  const handleLeaveEvent = async () => {
    try {
      setJoiningStatus(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('participant_id', userData.user.id);

      if (error) throw error;

      // Update current_participants count
      await supabase
        .from('events')
        .update({ current_participants: (event?.current_participants || 0) - 1 })
        .eq('id', eventId);

      fetchEventDetails(); // Refresh the data
      Alert.alert('Success', 'You have left the event');
    } catch (error) {
      Alert.alert('Error', 'Failed to leave event');
    } finally {
      setJoiningStatus(false);
    }
  };

  if (loading) {
    return (
      <ScreenTemplate>
        <ActivityIndicator size="large" color="#007AFF" />
      </ScreenTemplate>
    );
  }

  if (!event || !creator) {
    return (
      <ScreenTemplate>
        <Text>Event not found</Text>
      </ScreenTemplate>
    );
  }

  return (
    <ScreenTemplate>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.activityTag}>
            <Text style={styles.activityText}>{event.activity_type}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Icon name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {new Date(event.date_time).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="location-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="people-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {event.current_participants}/{event.max_participants} participants
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="fitness-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {event.skill_level.charAt(0).toUpperCase() + event.skill_level.slice(1)} level
            </Text>
          </View>
        </View>

        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizer</Text>
          <TouchableOpacity 
            style={styles.creatorRow}
            onPress={() => navigation.navigate('UserProfile', { userId: creator.id })}
          >
            <Text style={styles.creatorName}>
              {creator.first_name} {creator.last_name}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
          {participants.map((participant) => (
            <TouchableOpacity
              key={participant.id}
              style={styles.participantRow}
              onPress={() => navigation.navigate('UserProfile', { userId: participant.id })}
            >
              <Text style={styles.participantName}>
                {participant.first_name} {participant.last_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {userParticipation ? (
          <TouchableOpacity
            style={[styles.button, styles.leaveButton]}
            onPress={handleLeaveEvent}
            disabled={joiningStatus}
          >
            {joiningStatus ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Leave Event</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.joinButton]}
            onPress={handleJoinEvent}
            disabled={joiningStatus || event.current_participants >= event.max_participants}
          >
            {joiningStatus ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {event.current_participants >= event.max_participants
                  ? 'Event Full'
                  : 'Join Event'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.chatButton]}
          onPress={() => navigation.navigate('EventChat', { eventId })}
        >
          <Text style={styles.buttonText}>Event Chat</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  activityTag: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  activityText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  participantRow: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: '#007AFF',
  },
  leaveButton: {
    backgroundColor: '#FF3B30',
  },
  chatButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventDetailsScreen;
          
