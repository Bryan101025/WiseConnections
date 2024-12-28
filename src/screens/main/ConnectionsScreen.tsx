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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Connections'>;

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
        <Text style={styles.userName}>
          {`${user.first_name} ${user.last_name}`}
        </Text>
        <Text style={styles.userBio}>{user.bio}</Text>
      </View>
    </View>
    
    <View style={styles.interestTags}>
      {user.interests?.map(interest => (
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

const ConnectionsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState(0);
  const {
    myConnections,
    recommended,
    loading,
    connect,
    disconnect,
    refresh
  } = useConnections();

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
            <View style={styles.connectionsList}>
              {myConnections.map(connection => (
                <UserCard
                  key={connection.id}
                  user={connection.connected_user}
                  isConnected={true}
                  onConnect={() => disconnect(connection.connected_user.id)}
                  onMessage={() => navigation.navigate('Chat', { 
                    userId: connection.connected_user.id,
                    userName: `${connection.connected_user.first_name} ${connection.connected_user.last_name}`
                  })}
                />
              ))}
              {myConnections.length === 0 && (
                <Text style={styles.emptyText}>
                  You haven't connected with anyone yet
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.recommendedList}>
              {recommended.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  isConnected={false}
                  onConnect={() => connect(user.id)}
                />
              ))}
              {recommended.length === 0 && (
                <Text style={styles.emptyText}>
                  No recommendations available at the moment
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (keep all existing styles)
  
  // Add these new styles
  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: 20,
  },
  connectionsList: {
    padding: 16,
  },
  recommendedList: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 15,
    marginTop: 32,
  },
});

export default ConnectionsScreen;
