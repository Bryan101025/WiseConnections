// src/navigation/MainAppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import DiscoverScreen from '../screens/main/DiscoverScreen';
import EventsScreen from '../screens/main/EventsScreen';
import ConnectionsScreen from '../screens/main/ConnectionsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import EventDetailsScreen from '../screens/main/EventDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigators for each tab
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
    </Stack.Navigator>
  );
};

const EventsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="EventsScreen" 
        component={EventsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={{ 
          headerTitle: '',
          headerShadowVisible: false,
          headerBackTitle: 'Back'
        }}
      />
    </Stack.Navigator>
  );
};

const MainAppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Discover':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Connections':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Notifications':
              iconName = focused ? 'notifications' : 'notifications-outline';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarStyle: {
          borderTopColor: '#eee',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen 
        name="Events" 
        component={EventsStack}
        options={{
          tabBarLabel: 'Events',
        }}
      />
      <Tab.Screen 
        name="Connections" 
        component={ConnectionsScreen}
        options={{
          tabBarLabel: 'Connections',
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainAppNavigator;
