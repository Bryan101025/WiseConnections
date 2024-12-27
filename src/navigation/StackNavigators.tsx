// src/navigation/StackNavigators.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import existing screens
import HomeScreen from '../screens/main/HomeScreen';
import DiscoverScreen from '../screens/main/DiscoverScreen';
import ConnectionsScreen from '../screens/main/ConnectionsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';

// Import new screens (you'll create these next)
import UserProfileScreen from '../screens/main/UserProfileScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import ChatScreen from '../screens/main/ChatScreen';
import EventDetailsScreen from '../screens/main/EventDetailsScreen';
import CreateEventScreen from '../screens/main/CreateEventScreen';
import EventChatScreen from '../screens/main/EventChatScreen';

const Stack = createNativeStackNavigator();

export const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="EventChat" component={EventChatScreen} />
    </Stack.Navigator>
  );
};

export const DiscoverStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="DiscoverScreen" 
        component={DiscoverScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
};

export const ConnectionsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ConnectionsScreen" 
        component={ConnectionsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
};

export const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileScreen" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  );
};

export const NotificationsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="NotificationsScreen" 
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
};
