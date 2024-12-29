// src/screens/main/UserProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import { useProfile } from '../../hooks/useProfile';
import { useConnections } from '../../hooks/useConnections';
import { supabase } from '../../config/supabase';
import Icon from 'react-native-vector-icons/Ionicons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';

type Props = NativeStackScreenProps<any, 'UserProfile'>;

const UserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const userId = route.params?.userId;
  const { profile, loading } = useProfile(userId);
  const { sendConnectionRequest } = useConnections();
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const checkProfileOwnership = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setIsOwnProfile(!userId || userId === userData.user?.id);
    };
    checkProfileOwnership();
  }, [userId]);

  const handleConnect = async () => {
    const { error } = await sendConnectionRequest(userId);
    if (!error) {
      Alert.alert('Success', 'Connection request sent!');
    } else {
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    }
  };

  if (loading) {
    return (
      <ScreenTemplate>
        <View style={styles.loadingContainer}>
          <View style={styles.header}>
            <SkeletonPresets.Avatar style={styles.skeletonAvatar} />
            <View style={styles.skeletonHeaderText}>
              <SkeletonPresets.Title style={styles.skeletonName} />
              <SkeletonPresets.Text style={styles.skeletonLocation} />
            </View>
          </View>

          <View style={styles.interestsContainer}>
            <SkeletonPresets.Text style={styles.sectionTitle} />
            <View style={styles.interestsList}>
              {[1, 2, 3, 4].map((_, index) => (
                <View key={index} style={styles.skeletonInterest}>
                  <SkeletonPresets.Text style={styles.skeletonInterestText} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.skeletonButtonContainer}>
            <SkeletonPresets.Text style={styles.skeletonButton} />
          </View>
        </View>
      </ScreenTemplate>
    );
  }
  if (!profile) {
    return (
      <ScreenTemplate>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenTemplate>
    );
  }

  return (
    <ScreenTemplate>
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={profile?.profile_photo_url 
              ? { uri: profile.profile_photo_url }
              : require('../../assets/default-avatar.png')}
            style={styles.profilePhoto}
          />
          <Text style={styles.name}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text style={styles.location}>{profile?.location}</Text>
        </View>

        <View style={styles.interestsContainer}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsList}>
            {profile?.interests?.map((interest) => (
              <View key={interest} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>

        {isOwnProfile ? (
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Icon name="pencil-outline" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.connectButton} 
            onPress={handleConnect}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenTemplate>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#F2F2F7',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: '#666',
  },
  interestsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  interestTag: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  interestText: {
    color: '#007AFF',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Skeleton styles
  skeletonAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  skeletonHeaderText: {
    alignItems: 'center',
    gap: 8,
  },
  skeletonName: {
    width: 150,
    height: 24,
    marginBottom: 8,
  },
  skeletonLocation: {
    width: 100,
    height: 16,
  },
  skeletonInterest: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 4,
    margin: 4,
  },
  skeletonInterestText: {
    width: 60,
    height: 16,
  },
  skeletonButtonContainer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  skeletonButton: {
    height: 48,
    borderRadius: 8,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default UserProfileScreen;
