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
        <>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={onMessage}
          >
            <Icon name="chatbubble-outline" size={18} color="#FFF" />
            <Text style={styles.buttonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={onConnect}
          >
            <Icon name="person-remove-outline" size={18} color="#FFF" />
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </>
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
