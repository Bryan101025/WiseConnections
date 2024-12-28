// src/hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { supabase } from '../config/supabase';
import { NotificationManager } from '../utils/notificationManager';

interface NotificationPreferences {
  events: boolean;
  likes: boolean;
  comments: boolean;
  connections: boolean;
}

export const useNotifications = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    events: true,
    likes: true,
    comments: true,
    connections: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeNotifications = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Register for notifications
      await NotificationManager.registerForNotifications(userData.user.id);

      // Get user preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') {
        throw prefsError;
      }

      if (prefsData) {
        setPreferences(prefsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error initializing notifications');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const updatedPreferences = { ...preferences, ...newPreferences };
      const success = await NotificationManager.updateNotificationPreferences(
        userData.user.id,
        updatedPreferences
      );

      if (success) {
        setPreferences(updatedPreferences);
      }

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating preferences';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  useEffect(() => {
    initializeNotifications();

    // Set up notification handlers
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      // Handle foreground messages here
      console.log('Received foreground message:', remoteMessage);
    });

    const unsubscribeOnNotificationOpenedApp = messaging()
      .onNotificationOpenedApp(remoteMessage => {
        // Handle notification opened app from background state
        console.log('Notification opened app:', remoteMessage);
      });

    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          // Handle notification that opened app from quit state
          console.log('Initial notification:', remoteMessage);
        }
      });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
    };
  }, []);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
  };
};
