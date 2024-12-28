// src/components/NearbyEventsSection.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNearbyEvents } from '../hooks/useNearbyEvents';
import { EventPreviewCard } from './EventPreviewCard';

export const NearbyEventsSection = () => {
  const navigation = useNavigation();
  const { nearbyEvents, loading, refreshing, error, refresh } = useNearbyEvents();

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load nearby events</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={refresh}
        >
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (nearbyEvents.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Events</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#007AFF"
            colors={['#007AFF']} // Android
            progressBackgroundColor="#ffffff" // Android
          />
        }
      >
        {nearbyEvents.map((event) => (
          <EventPreviewCard
            key={event.id}
            event={event}
            onPress={() => 
              navigation.navigate('EventDetails', { 
                eventId: event.id 
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
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
  errorContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    padding: 8,
  },
  retryText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
