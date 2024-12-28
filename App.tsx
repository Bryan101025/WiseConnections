// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/config/supabase';
import AuthNavigator from './src/navigation/AuthNavigator';
import { View, Text } from 'react-native';
import { CacheManager } from './src/utils/cacheManager';
import { NotificationManager } from './src/utils/notificationManager';
import messaging from '@react-native-firebase/messaging';

const Stack = createNativeStackNavigator();

// Temporary Home Screen (we'll replace this later)
const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Welcome to Wise Connections!</Text>
  </View>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize app and handle authentication
    const initializeApp = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        // Run cache cleanup
        await CacheManager.cleanupExpiredCache();
        await CacheManager.cleanupOldCache(7);

        // Initialize notifications if user is logged in
        if (session?.user) {
          await NotificationManager.registerForNotifications(session.user.id);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsInitialized(true);
      }
    };

    initializeApp();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      // Handle notification registration on auth state change
      if (session?.user) {
        await NotificationManager.registerForNotifications(session.user.id);
      }
    });

    // Set up notification handlers
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      // Handle foreground messages
      console.log('Received foreground message:', remoteMessage);
      // You can add custom notification display here
    });

    const unsubscribeOnNotificationOpenedApp = messaging()
      .onNotificationOpenedApp(remoteMessage => {
        // Handle notification opened app from background state
        console.log('Notification opened app:', remoteMessage);
        // Add navigation logic here based on notification type
      });

    // Check if app was opened from a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          // Handle notification that opened app from quit state
          console.log('Initial notification:', remoteMessage);
          // Add navigation logic here based on notification type
        }
      });

    // Set up periodic cache cleanup
    const cleanupInterval = setInterval(async () => {
      await CacheManager.cleanupExpiredCache();
    }, 1000 * 60 * 60); // Run every hour

    // Cleanup subscriptions and intervals
    return () => {
      subscription?.unsubscribe();
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
      clearInterval(cleanupInterval);
    };
  }, []);

  // Optional: Show loading screen while initializing
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!session ? (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator} 
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
