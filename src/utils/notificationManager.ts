// src/utils/notificationManager.ts
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '../config/supabase';

interface NotificationData {
  type: 'event' | 'like' | 'comment' | 'connection';
  title: string;
  body: string;
  data?: any;
}

export class NotificationManager {
  static async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        return enabled;
      } else {
        // Android doesn't need explicit permission for FCM
        return true;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  static async getFCMToken() {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  static async saveFCMToken(userId: string, token: string) {
    try {
      const { error } = await supabase
        .from('user_notification_tokens')
        .upsert({
          user_id: userId,
          fcm_token: token,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  }

  static async registerForNotifications(userId: string) {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) return false;

    const token = await this.getFCMToken();
    if (token) {
      await this.saveFCMToken(userId, token);
      return true;
    }
    return false;
  }

  static async updateNotificationPreferences(userId: string, preferences: {
    events: boolean;
    likes: boolean;
    comments: boolean;
    connections: boolean;
  }) {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
}
