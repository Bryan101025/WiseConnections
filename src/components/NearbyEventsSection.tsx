// src/components/NearbyEventsSection.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { EventPreviewCard } from './EventPreviewCard';
import { useNearbyEvents } from '../hooks/useNearbyEvents';

export const NearbyEventsSection = () => {
  const navigation = useNavigation();
  const { nearbyEvents, loading } = useNearbyEvents();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (nearbyEvents.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Nearby Events</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('Events')}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventsList}
      >
        {nearbyEvents.map(event => (
          <EventPreviewCard
            key={event.id}
            event={event}
            onPress={() => 
              navigation.navigate('EventDetails', { eventId: event.id })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  eventsList: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
