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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Following iOS convention for segmented controls
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

// iOS-style user card following HIG
const UserCard = ({ user, isConnected, onConnect, onMessage }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Image
        style={styles.avatar}
        source={{ uri: user.photoUrl }}
        defaultSource={require('../../assets/default-avatar.png')}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.fullName}</Text>
        <Text style={styles.userBio}>{user.bio}</Text>
      </View>
    </View>
    
    <View style={styles.interestTags}>
      {user.interests.map(interest => (
        <View key={interest} style={styles.tag}>
          <Text style={styles.tagText}>{interest}</Text>
        </View>
      ))}
    </View>

    <View style={styles.cardActions}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          isConnected ? styles.disconnectButton : styles.connectButton
        ]}
        onPress={onConnect}
      >
        <Text style={[
          styles.actionButtonText,
          isConnected && styles.disconnectButtonText
        ]}>
          {isConnected ? 'Disconnect' : 'Connect'}
        </Text>
      </TouchableOpacity>
      
      {isConnected && (
        <TouchableOpacity
          style={styles.messageButton}
          onPress={onMessage}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const ConnectionsScreen = () => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState(0);

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
        >
          {selectedTab === 0 ? (
            <View style={styles.connectionsList}>
              {/* My Connections list */}
            </View>
          ) : (
            <View style={styles.recommendedList}>
              {/* Recommended connections list */}
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
    backgroundColor: '#F2F2F7', // iOS system background color
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 34, // iOS large title size
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA', // iOS segmented control background
    borderRadius: 8,
    padding: 2,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  selectedSegment: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 13, // iOS standard size
    color: '#000000',
    fontWeight: '500',
  },
  selectedSegmentText: {
    color: '#000000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  },
  userName: {
    fontSize: 17, // iOS body text
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 15, // iOS subhead
    color: '#3C3C43',
    opacity: 0.6,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#3C3C43',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  connectButton: {
    backgroundColor: '#000000',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30', // iOS red
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#007AFF', // iOS blue
    marginLeft: 8,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ConnectionsScreen;
