// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/config/supabase';
import AuthNavigator from './src/navigation/AuthNavigator';
import { View, Text } from 'react-native';
import { CacheManager } from './src/utils/cacheManager';
import { NotificationManager } from './src/utils/notificationManager';
import { RealtimeProvider } from './src/contexts/RealtimeContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { useRealtimeSubscriptions } from './src/hooks/useRealtimeSubscriptions';
import { OfflineSyncManager } from './src/utils/OfflineSyncManager';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

// Temporary Home Screen (we'll replace this later)
const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Welcome to Wise Connections!</Text>
  </View>
);

// Wrapper component to use hooks
const AppContent = ({ session }) => {
  useRealtimeSubscriptions(); // Add realtime subscriptions

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
};

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

        // Initialize offline sync
        await OfflineSyncManager.initialize();

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

    // Set up periodic cache cleanup and sync check
    const cleanupInterval = setInterval(async () => {
      await CacheManager.cleanupExpiredCache();
      await OfflineSyncManager.syncQueuedActions();
    }, 1000 * 60 * 60); // Run every hour

    // Cleanup subscriptions and intervals
    return () => {
      subscription?.unsubscribe();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NetworkProvider>
        <RealtimeProvider>
          <AppContent session={session} />
        </RealtimeProvider>
      </NetworkProvider>
    </GestureHandlerRootView>
  );
}
