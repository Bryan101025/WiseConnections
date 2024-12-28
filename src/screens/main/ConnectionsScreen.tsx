// src/screens/main/ConnectionsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnections } from '../../hooks/useConnections';
import Icon from 'react-native-vector-icons/Ionicons';

const SegmentedControl = ({ selectedIndex, onChange }) => (
  <View style={styles.segmentedControl}>
    <TouchableOpacity 
      style={[
        styles.segment, 
        selectedIndex === 0 && styles.selectedSegment
      ]}
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
      style={[
        styles.segment, 
        selectedIndex === 1 && styles.selectedSegment
      ]}
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

const ConnectionCard = ({ user, isRecommended, onConnect, onMessage }) => (
  <View style={styles.card}>
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
  </View>
);

const ConnectionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState(0);
  const { myConnections, recommended, loading, connect, disconnect, refresh } = useConnections();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Connections</Text>
        
        <SegmentedControl
          selectedIndex={selectedTab}
          onChange={setSelectedTab}
        />

        <ScrollView 
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
        >
          {loading ? (
            <ActivityIndicator style={styles.loader} color="#007AFF" />
          ) : selectedTab === 0 ? (
            <View style={styles.cardsList}>
              {myConnections.map(connection => (
                <ConnectionCard
                  key={connection.id}
                  user={connection.connected_user}
                  isRecommended={false}
                  onConnect={() => disconnect(connection.connected_user.id)}
                  onMessage={() => navigation.navigate('Chat', { 
                    userId: connection.connected_user.id,
                    userName: `${connection.connected_user.first_name} ${connection.connected_user.last_name}`
                  })}
                />
              ))}
              {myConnections.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No Connections Yet</Text>
                  <Text style={styles.emptyStateText}>
                    Check out our recommendations to connect with others who share your interests.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.cardsList}>
              {recommended.map(user => (
                <ConnectionCard
                  key={user.id}
                  user={user}
                  isRecommended={true}
                  onConnect={() => connect(user.id)}
                />
              ))}
              {recommended.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No Recommendations</Text>
                  <Text style={styles.emptyStateText}>
                    We'll notify you when we find people with similar interests.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
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
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedSegment: {
    backgroundColor: '#FFFFFF',
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
  loader: {
    marginTop: 32,
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
});

export default ConnectionsScreen;
