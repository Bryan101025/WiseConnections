// src/screens/main/DiscoverScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import { format } from 'date-fns';

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

const DiscoverScreen = ({ navigation }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, handleError, clearError } = useNetworkError();
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', userData.user.id)
        .single();

      if (profileError) throw profileError;
      if (profile?.interests) {
        setSelectedInterests(profile.interests);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date_time')
        .in('tags', selectedInterests)
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true })
        .limit(5);

      if (eventsError) throw eventsError;
      setUpcomingEvents(events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchRecommendedUsers = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, interests')
        .neq('id', userData.user.id)
        .filter('interests', 'cs', `{${selectedInterests.join(',')}}`)
        .limit(5);

      if (usersError) throw usersError;
      setRecommendedUsers(users || []);
    } catch (err) {
      console.error('Error fetching recommended users:', err);
    }
  };

  const fetchData = async (isRefreshing = false) => {
    try {
      setError(null);
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      await Promise.all([
        fetchUserProfile(),
        fetchUpcomingEvents(),
        fetchRecommendedUsers(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedInterests.length > 0) {
      fetchUpcomingEvents();
      fetchRecommendedUsers();
    }
  }, [selectedInterests]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleRefresh = () => fetchData(true);

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
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <Text style={styles.title}>Select Your Interests</Text>
          <View style={styles.interestsContainer}>
            {ALL_INTERESTS.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  selectedInterests.includes(interest) && styles.selectedInterestChip
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[
                  styles.interestText,
                  selectedInterests.includes(interest) && styles.selectedInterestText
                ]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          {upcomingEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => navigation.navigate('Events', {
                screen: 'EventDetails',
                params: { eventId: event.id }
              })}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
                            <View style={styles.eventDateContainer}>
                <Icon name="calendar-outline" size={16} color="#666" />
                <Text style={styles.eventDate}>
                  {format(new Date(event.date_time), 'yyyy-MM-dd at HH:mm')}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>Recommended Connections</Text>
          {recommendedUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={styles.userCard}
              onPress={() => navigation.navigate('Connections', {
                screen: 'UserProfile',
                params: { userId: user.id }
              })}
            >
              <Image
                source={
                  user.profile_photo_url
                    ? { uri: user.profile_photo_url }
                    : require('../../assets/default-avatar.png')
                }
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
          ))}
        </ScrollView>
      </ScreenTemplate>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  interestChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 4,
  },
  selectedInterestChip: {
    backgroundColor: '#000000',
  },
  interestText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedInterestText: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  eventDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userInterests: {
    fontSize: 14,
    color: '#666',
  },
  skeletonTitle: {
    height: 28,
    width: '60%',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  skeletonInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  skeletonInterest: {
    height: 36,
    width: 100,
    borderRadius: 18,
    margin: 4,
  },
  skeletonSectionTitle: {
    height: 24,
    width: '40%',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  skeletonCard: {
    height: 100,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
});

export default DiscoverScreen;
