// src/screens/main/DiscoverScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type DiscoveryItem = {
  id: string;
  type: 'user' | 'event' | 'group';
  title: string;
  description?: string;
  image_url?: string;
  tags?: string[];
  match_score?: number;
};

type Props = NativeStackScreenProps<any, 'Discover'>;

const DiscoverScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, handleError, clearError } = useNetworkError();
  const [activeFilter, setActiveFilter] = useState<'all' | 'people' | 'events' | 'groups'>('all');

  const fetchDiscoveries = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Fetch user's interests for better recommendations
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', userData.user.id)
        .single();

      const userInterests = userProfile?.interests || [];

      // Fetch discoveries based on filter
      let query = supabase
        .from('discoveries')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('type', activeFilter);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Calculate match scores based on interests
      const discoveryItems = data.map(item => ({
        ...item,
        match_score: calculateMatchScore(item, userInterests),
      })).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

      setDiscoveries(discoveryItems);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching discoveries';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateMatchScore = (item: DiscoveryItem, userInterests: string[]): number => {
    if (!item.tags || !userInterests.length) return 0;
    const matchingTags = item.tags.filter(tag => userInterests.includes(tag));
    return (matchingTags.length / Math.max(item.tags.length, userInterests.length)) * 100;
  };

  useEffect(() => {
    fetchDiscoveries();
  }, [activeFilter]);

  const handleRefresh = () => fetchDiscoveries(true);

  const handleRetry = () => {
    clearError();
    fetchDiscoveries();
  };

  const renderFilter = (filter: 'all' | 'people' | 'events' | 'groups') => (
    <TouchableOpacity
      style={[styles.filterButton, activeFilter === filter && styles.activeFilter]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
        {filter.charAt(0).toUpperCase() + filter.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (!isOnline) {
      return (
        <ErrorView
          error="No internet connection. Please check your network and try again."
          icon="cloud-offline-outline"
          onRetry={handleRetry}
        />
      );
    }

    if (loading && !refreshing) {
      return (
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.skeletonCard}>
              <SkeletonPresets.Avatar style={styles.skeletonImage} />
              <View style={styles.skeletonContent}>
                <SkeletonPresets.Title style={styles.skeletonTitle} />
                <SkeletonPresets.Text style={styles.skeletonDescription} />
                <View style={styles.skeletonTags}>
                  <SkeletonPresets.Text style={styles.skeletonTag} />
                  <SkeletonPresets.Text style={styles.skeletonTag} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      );
    }

    if (error) {
      return (
        <ErrorView
          error={error}
          onRetry={handleRetry}
        />
      );
    }

    if (discoveries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>
            No {activeFilter === 'all' ? 'items' : activeFilter} found
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {discoveries.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.discoveryCard}
            onPress={() => {
              switch (item.type) {
                case 'user':
                  navigation.navigate('Connections', {
                    screen: 'UserProfile',
                    params: { userId: item.id }
                  });
                  break;
                case 'event':
                  navigation.navigate('Events', {
                    screen: 'EventDetails',
                    params: { eventId: item.id }
                  });
                  break;
                // Add other navigation cases as needed
              }
            }}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.match_score && (
                <View style={styles.matchScore}>
                  <Icon name="star" size={16} color="#FFD700" />
                                    <Text style={styles.matchScoreText}>
                    {Math.round(item.match_score)}% Match
                  </Text>
                </View>
              )}
            </View>
            {item.description && (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagContainer}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <ErrorBoundary>
      <ScreenTemplate>
        <View style={styles.container}>
          <View style={styles.searchContainer}>
            <Icon name="search-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people, events, or groups..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => fetchDiscoveries()}
              returnKeyType="search"
            />
          </View>

          <View style={styles.filterContainer}>
            {renderFilter('all')}
            {renderFilter('people')}
            {renderFilter('events')}
            {renderFilter('groups')}
          </View>

          {renderContent()}
        </View>
      </ScreenTemplate>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonDescription: {
    marginBottom: 8,
  },
  skeletonTags: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTag: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
  discoveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  matchScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchScoreText: {
    fontSize: 12,
    color: '#B8860B',
    marginLeft: 4,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#007AFF',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default DiscoverScreen;

