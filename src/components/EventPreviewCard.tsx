// src/components/EventPreviewCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import type { NearbyEvent } from '../hooks/useNearbyEvents';

interface EventPreviewCardProps {
  event: NearbyEvent;
  onPress: () => void;
}

export const EventPreviewCard = ({ event, onPress }: EventPreviewCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title} numberOfLines={1}>
        {event.title}
      </Text>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Icon name="calendar-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {format(new Date(event.date_time), 'MMM d, h:mm a')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="location-outline" size={14} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="navigate-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {event.distance.toFixed(1)} miles away
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="people-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {event.current_participants}/{event.max_participants} attending
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.learnMoreButton} onPress={onPress}>
        <Text style={styles.learnMoreText}>Learn More</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  detailsContainer: {
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
    flex: 1,
  },
  learnMoreButton: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  learnMoreText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },
});
