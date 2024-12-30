// src/screens/main/ConnectionsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnections } from '../../hooks/useConnections';
import Icon from 'react-native-vector-icons/Ionicons';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';

const SegmentedControl = ({ selectedIndex, onChange }) => {
  const slideAnimation = new Animated.Value(selectedIndex);

  useEffect(() => {
    Animated.spring(slideAnimation, {
      toValue: selectedIndex,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  }, [selectedIndex]);

  return (
    <View style={styles.segmentedControl}>
      <Animated.View
        style={[
          styles.segmentSlider,
          {
            transform: [{
              translateX: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [2, (styles.segmentedControl.width / 2) - 2],
              }),
            }],
          },
        ]}
      />
      <TouchableOpacity 
        style={styles.segment}
        onPress={() => onChange(0)}
      >
        <Text style={[
          styles.segmentText,
          selectedIndex === 0 && styles.selectedSegmentText
        ]}>
          My Connections
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.segment}
        onPress={() => onChange(1)}
      >
        <Text style={[
          styles.segmentText,
          selectedIndex === 1 && styles.selectedSegmentText
        ]}>
          Recommended
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const ConnectionCard = ({ user, isRecommended, onConnect, onMessage, index }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Image
          style={styles.avatar}
          source={
            user.profile_photo_url 
              ? { uri: user.profile_photo_url }
              : require('../../assets/default-avatar.png')
          }
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.first_name} {user.last_name}
          </Text>
          {user.location && (
            <Text style={styles.locationText}>
              <Icon name="location-outline" size={14} color="#666" />
              {' '}{user.location}
            </Text>
          )}
        </View>
      </View>

      {user.bio && (
        <Text style={styles.bioText} numberOfLines={2}>
          {user.bio}
        </Text>
      )}
      <View style={styles.interestTags}>
        {user.interests?.slice(0, 3).map(interest => (
          <View key={interest} style={styles.tag}>
            <Text style={styles.tagText}>{interest}</Text>
          </View>
        ))}
        {user.interests?.length > 3 && (
          <Text style={styles.moreInterests}>
            +{user.interests.length - 3} more
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        {isRecommended ? (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={onConnect}
          >
            <Icon name="person-add-outline" size={18} color="#FFF" />
            <Text style={styles.buttonText}>Connect</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.connectedActions}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={onMessage}
            >
              <Icon name="chatbubble-outline" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConnect}
              style={styles.disconnectLink}
            >
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const ConnectionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState(0);
  const { 
    myConnections, 
    recommended, 
    loading, 
    error,
    connect, 
    disconnect, 
    refresh 
  } = useConnections();
  const { isOnline, handleError, clearError } = useNetworkError();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    clearError();
    await refresh();
    setRefreshing(false);
  };

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);

  if (!isOnline) {
    return (
      <ErrorView
        error="No internet connection. Please check your network and try again."
        icon="cloud-offline-outline"
        onRetry={handleRefresh}
      />
    );
  }

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <ScrollView style={styles.cardsList}>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.skeletonCard}>
              <View style={styles.skeletonHeader}>
                <SkeletonPresets.Avatar style={styles.skeletonAvatar} />
                <View style={styles.skeletonInfo}>
                  <SkeletonPresets.Text style={styles.skeletonName} />
                  <SkeletonPresets.Text style={styles.skeletonLocation} />
                </View>
              </View>
              <SkeletonPresets.Text style={styles.skeletonBio} />
              <View style={styles.skeletonTags}>
                {[1, 2, 3].map((_, tagIndex) => (
                  <SkeletonPresets.Text 
                    key={tagIndex} 
                    style={styles.skeletonTag} 
                  />
                ))}
              </View>
              <SkeletonPresets.Text style={styles.skeletonButton} />
            </View>
          ))}
        </ScrollView>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {selectedTab === 0 ? (
          <View style={styles.cardsList}>
            {myConnections.map((connection, index) => (
              <ConnectionCard
                key={connection.id}
                user={connection.connected_user}
                isRecommended={false}
                onConnect={() => disconnect(connection.connected_user.id)}
                onMessage={() => navigation.navigate('Chat', { 
                  userId: connection.connected_user.id,
                  userName: `${connection.connected_user.first_name} ${connection.connected_user.last_name}`
                })}
                index={index}
              />
            ))}
            {myConnections.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="people-outline" size={48} color="#666" />
                <Text style={styles.emptyStateTitle}>No Connections Yet</Text>
                <Text style={styles.emptyStateText}>
                  Check out our recommendations to connect with others who share your interests.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.cardsList}>
            {recommended.map((user, index) => (
              <ConnectionCard
                key={user.id}
                user={user}
                isRecommended={true}
                onConnect={() => connect(user.id)}
                index={index}
              />
            ))}
            {recommended.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="search-outline" size={48} color="#666" />
                <Text style={styles.emptyStateTitle}>No Recommendations</Text>
                <Text style={styles.emptyStateText}>
                  We'll notify you when we find people with similar interests.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <Text style={styles.title}>Connections</Text>
          
          <SegmentedControl
            selectedIndex={selectedTab}
            onChange={setSelectedTab}
          />

          {renderContent()}
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    margin: 16,
    borderRadius: 8,
    padding: 2,
    height: 36,
    width: '100%',
    position: 'relative',
  },
  segmentSlider: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
    selectedSegmentText: {
    color: '#000',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  cardsList: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  bioText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  moreInterests: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    alignSelf: 'center',
  },
  cardActions: {
    marginTop: 8,
  },
  connectedActions: {
    alignItems: 'center',
    width: '100%',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  disconnectLink: {
    padding: 8,
  },
  disconnectText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Skeleton styles
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  skeletonInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  skeletonName: {
    height: 18,
    width: '60%',
  },
  skeletonLocation: {
    height: 14,
    width: '40%',
  },
  skeletonBio: {
    height: 40,
    marginBottom: 12,
  },
  skeletonTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  skeletonTag: {
    height: 26,
    width: 80,
    borderRadius: 13,
  },
  skeletonButton: {
    height: 44,
    borderRadius: 8,
  },
});

export default ConnectionsScreen;
