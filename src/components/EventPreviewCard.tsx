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

interface EventPreviewCardProps {
  event: {
    id: string;
    title: string;
    date_time: string;
    location: string;
    distance?: number;
  };
  onPress: () => void;
}

export const EventPreviewCard = ({ event, onPress }: EventPreviewCardProps) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.title} numberOfLines={1}>
        {event.title}
      </Text>
      
      <View style={styles.detailsContainer}>
        <View style={styles.detail}>
          <Icon name="calendar-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {format(new Date(event.date_time), 'MMM d, h:mm a')}
          </Text>
        </View>

        <View style={styles.detail}>
          <Icon name="location-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {event.location}
          </Text>
        </View>

        {event.distance && (
          <View style={styles.detail}>
            <Icon name="navigate-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              {event.distance.toFixed(1)} miles
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 250,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsContainer: {
    gap: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
});
