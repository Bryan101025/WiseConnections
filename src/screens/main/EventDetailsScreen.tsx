// src/screens/main/EventDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
  Alert,
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

type EventDetails = {
  id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  current_participants: number;
  max_participants: number;
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  is_registered?: boolean;
  participants: Array<{
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  }>;
};

type Props = NativeStackScreenProps<any, 'EventDetails'>;

const EventDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, handleError, clearError } = useNetworkError();
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  
  const slideAnimation = new Animated.Value(0);
  const fadeAnimation = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchEventDetails = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!creator_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          ),
          participants:event_participants!inner (
            user:profiles (
              id,
              first_name,
              last_name,
              profile_photo_url
            )
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // Check if user is registered
      const { data: registration } = await supabase
        .from('event_participants')
        .select('id')
        .match({
          event_id: eventId,
          participant_id: userData.user.id,
        })
        .single();

      setEvent({
        ...eventData,
        is_registered: !!registration,
        participants: eventData.participants.map(p => p.user),
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching event details';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegister = async () => {
    if (!event) return;
    
    try {
      setRegistering(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (event.is_registered) {
        // Unregister
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .match({
            event_id: eventId,
            participant_id: userData.user.id,
          });

        if (error) throw error;
      } else {
        // Register
        if (event.current_participants >= event.max_participants) {
          Alert.alert('Event Full', 'This event has reached its maximum capacity.');
          return;
        }

        const { error } = await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            participant_id: userData.user.id,
            status: 'registered',
          });

        if (error) throw error;
      }

      // Refresh event details
      await fetchEventDetails();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? 
        err.message : 
        'Error updating registration';
      Alert.alert('Error', errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  if (!isOnline) {
    return (
      <ErrorView
        error="No internet connection. Please check your network and try again."
        icon="cloud-offline-outline"
        onRetry={() => fetchEventDetails()}
      />
    );
  }

  if (loading && !refreshing) {
    return (
      <ScreenTemplate>
        <ScrollView 
          contentContainerStyle={styles.loadingContainer}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonPresets.Title style={styles.skeletonTitle} />
          <View style={styles.skeletonMetadata}>
            <SkeletonPresets.Text style={styles.skeletonText} />
            <SkeletonPresets.Text style={styles.skeletonText} />
            <SkeletonPresets.Text style={styles.skeletonText} />
          </View>
          <SkeletonPresets.Text style={styles.skeletonDescription} />
          <View style={styles.skeletonParticipants}>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.skeletonParticipant}>
                <SkeletonPresets.Avatar style={styles.skeletonAvatar} />
                <SkeletonPresets.Text style={styles.skeletonName} />
              </View>
            ))}
          </View>
        </ScrollView>
      </ScreenTemplate>
    );
  }

  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={() => fetchEventDetails()}
      />
    );
  }

  if (!event) {
        return (
      <ErrorView
        error="Event not found"
        icon="calendar-outline"
        showRetry={false}
      />
    );
  }

  return (
    <ErrorBoundary>
      <ScreenTemplate>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchEventDetails(true)}
              tintColor="#007AFF"
            />
          }
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnimation,
                transform: [{
                  translateY: slideAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                }],
              },
            ]}
          >
            <Text style={styles.title}>{event.title}</Text>
            
            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Icon name="calendar-outline" size={24} color="#666" />
                <Text style={styles.metadataText}>
                  {format(new Date(event.date_time), 'MM/dd/yyyy')}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Icon name="time-outline" size={24} color="#666" />
                <Text style={styles.metadataText}>
                  {format(new Date(event.date_time), 'h:mm a')}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Icon name="location-outline" size={24} color="#666" />
                <Text style={styles.metadataText}>{event.location}</Text>
              </View>
            </View>

            <View style={styles.organizerContainer}>
              <Text style={styles.sectionTitle}>Organizer</Text>
              <TouchableOpacity
                style={styles.organizerInfo}
                onPress={() => navigation.navigate('Connections', {
                  screen: 'UserProfile',
                  params: { userId: event.creator.id }
                })}
              >
                <Image
                  source={
                    event.creator.profile_photo_url
                      ? { uri: event.creator.profile_photo_url }
                      : require('../../assets/default-avatar.png')
                  }
                  style={styles.organizerPhoto}
                />
                <Text style={styles.organizerName}>
                  {event.creator.first_name} {event.creator.last_name}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>About this Event</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>

            <View style={styles.participantsContainer}>
              <Text style={styles.sectionTitle}>
                Participants ({event.current_participants}/{event.max_participants})
              </Text>
              <View style={styles.participantsList}>
                {event.participants.map((participant) => (
                  <TouchableOpacity
                    key={participant.id}
                    style={styles.participantItem}
                    onPress={() => navigation.navigate('Connections', {
                      screen: 'UserProfile',
                      params: { userId: participant.id }
                    })}
                  >
                    <Image
                      source={
                        participant.profile_photo_url
                          ? { uri: participant.profile_photo_url }
                          : require('../../assets/default-avatar.png')
                      }
                      style={styles.participantPhoto}
                    />
                    <Text style={styles.participantName}>
                      {participant.first_name} {participant.last_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnimation,
            },
          ]}
        >
          <View style={styles.footerContent}>
            <View style={styles.capacityContainer}>
              <Text style={styles.capacityText}>
                {event.max_participants - event.current_participants} spots left
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.registerButton,
                event.is_registered && styles.unregisterButton,
                registering && styles.registeringButton,
              ]}
              onPress={handleRegister}
              disabled={registering}
            >
              <Text style={styles.registerButtonText}>
                {registering 
                  ? 'Updating...' 
                  : event.is_registered 
                    ? 'Cancel RSVP' 
                    : 'RSVP'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScreenTemplate>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 100, // Space for footer
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 24,
  },
  metadataContainer: {
    marginBottom: 24,
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  organizerContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  participantsContainer: {
    marginBottom: 24,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  participantItem: {
    alignItems: 'center',
    width: 80,
  },
  participantPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32, // Extra padding for bottom safe area
  },
    capacityContainer: {
    flex: 1,
    marginRight: 16,
  },
  capacityText: {
    fontSize: 14,
    color: '#666',
  },
  registerButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  unregisterButton: {
    backgroundColor: '#FF3B30',
  },
  registeringButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonTitle: {
    height: 32,
    width: '80%',
    marginBottom: 24,
  },
  skeletonMetadata: {
    marginBottom: 24,
    gap: 12,
  },
  skeletonText: {
    height: 20,
    width: '60%',
  },
  skeletonDescription: {
    height: 100,
    marginBottom: 24,
  },
  skeletonParticipants: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 24,
  },
  skeletonParticipant: {
    alignItems: 'center',
    width: 80,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  skeletonName: {
    height: 14,
    width: 60,
  },
});

export default EventDetailsScreen;


