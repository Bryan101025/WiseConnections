// src/components/ActivityFeedFilter.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type FeedType = 'posts' | 'events';

interface ActivityFeedFilterProps {
  activeFilter: FeedType;
  onFilterChange: (filter: FeedType) => void;
}

export const ActivityFeedFilter = ({ activeFilter, onFilterChange }: ActivityFeedFilterProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFilter === 'posts' && styles.activeFilter
        ]}
        onPress={() => onFilterChange('posts')}
      >
        <Text style={[
          styles.filterText,
          activeFilter === 'posts' && styles.activeFilterText
        ]}>
          Posts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFilter === 'events' && styles.activeFilter
        ]}
        onPress={() => onFilterChange('events')}
      >
        <Text style={[
          styles.filterText,
          activeFilter === 'events' && styles.activeFilterText
        ]}>
          Events
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 4,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeFilterText: {
    color: '#000',
  },
});
