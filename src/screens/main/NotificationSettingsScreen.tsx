// src/screens/main/NotificationSettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';
import Icon from 'react-native-vector-icons/Ionicons';

const SettingItem = ({ 
  title, 
  subtitle, 
  value, 
  onValueChange, 
  loading 
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  loading?: boolean;
}) => (
  <View style={styles.settingItem}>
    <View style={styles.settingTextContainer}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    {loading ? (
      <ActivityIndicator size="small" color="#007AFF" />
    ) : (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E5EA', true: '#34C759' }}
        ios_backgroundColor="#E5E5EA"
      />
    )}
  </View>
);

const NotificationSettingsScreen = () => {
  const { preferences, updatePreferences, loading } = useNotifications();
  const [updatingSettings, setUpdatingSettings] = useState<Record<string, boolean>>({});

  const handleToggle = async (setting: keyof typeof preferences) => {
    setUpdatingSettings(prev => ({ ...prev, [setting]: true }));
    
    try {
      const { error } = await updatePreferences({
        [setting]: !preferences[setting]
      });

      if (error) {
        throw new Error(error);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.'
      );
      console.error('Error updating notification settings:', error);
    } finally {
      setUpdatingSettings(prev => ({ ...prev, [setting]: false }));
    }
  };

  const settingsConfig = [
    {
      key: 'events',
      title: 'Event Notifications',
      subtitle: 'Get notified about upcoming events and event updates',
      icon: 'calendar-outline'
    },
    {
      key: 'likes',
      title: 'Like Notifications',
      subtitle: 'Get notified when someone likes your post',
      icon: 'heart-outline'
    },
    {
      key: 'comments',
      title: 'Comment Notifications',
      subtitle: 'Get notified when someone comments on your post',
      icon: 'chatbubble-outline'
    },
    {
      key: 'connections',
      title: 'Connection Notifications',
      subtitle: 'Get notified about new connection requests',
      icon: 'person-add-outline'
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        {settingsConfig.map(({ key, title, subtitle, icon }) => (
          <View key={key} style={styles.settingContainer}>
            <View style={styles.iconContainer}>
              <Icon name={icon} size={24} color="#666" />
            </View>
            <SettingItem
              title={title}
              subtitle={subtitle}
              value={preferences[key]}
              onValueChange={() => handleToggle(key as keyof typeof preferences)}
              loading={updatingSettings[key]}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.resetButton}
        onPress={() => {
          Alert.alert(
            'Reset Notifications',
            'Are you sure you want to reset all notification settings to default?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Reset',
                style: 'destructive',
                onPress: async () => {
                  await updatePreferences({
                    events: true,
                    likes: true,
                    comments: true,
                    connections: true,
                  });
                },
              },
            ]
          );
        }}
      >
        <Text style={styles.resetButtonText}>Reset to Default Settings</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Note: You can always change these settings later in your profile settings.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  settingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  settingItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  resetButton: {
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: 16,
  },
});

export default NotificationSettingsScreen;
