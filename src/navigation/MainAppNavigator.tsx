// src/navigation/MainAppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { NotificationBell } from '../components/NotificationBell';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import DiscoverScreen from '../screens/main/DiscoverScreen';
import EventsScreen from '../screens/main/EventsScreen';
import ConnectionsScreen from '../screens/main/ConnectionsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import EventDetailsScreen from '../screens/main/EventDetailsScreen';
import NotificationSettingsScreen from '../screens/main/NotificationSettingsScreen';
import { TouchableOpacity } from 'react-native';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigators for each tab
const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <NotificationBell />,
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen}
        options={{
          headerTitle: 'Wise Connections',
        }}
      />
    </Stack.Navigator>
  );
};

const DiscoverStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <NotificationBell />,
      }}
    >
      <Stack.Screen 
        name="DiscoverScreen" 
        component={DiscoverScreen}
        options={{
          headerTitle: 'Discover',
        }}
      />
    </Stack.Navigator>
  );
};

const EventsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <NotificationBell />,
      }}
    >
      <Stack.Screen 
        name="EventsScreen" 
        component={EventsScreen}
        options={{ 
          headerTitle: 'Events',
        }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={{ 
          headerTitle: '',
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

const ConnectionsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <NotificationBell />,
      }}
    >
      <Stack.Screen 
        name="ConnectionsScreen" 
        component={ConnectionsScreen}
        options={{
          headerTitle: 'Connections',
        }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={({ navigation, route }) => ({
          headerTitle: 'Profile',
          headerRight: route.params?.isOwnProfile ? () => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('EditProfile')}
              style={{ marginRight: 16 }}
            >
              <Icon name="pencil-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          ) : () => <NotificationBell />,
        })}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerTitle: 'Edit Profile',
          headerBackTitle: 'Back',
          headerRight: null,
        }}
      />
    </Stack.Navigator>
  );
};

const NotificationsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="NotificationsScreen" 
        component={NotificationsScreen}
        options={({ navigation }) => ({
          headerTitle: 'Notifications',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <Icon name="settings-outline" size={24} color="#000" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          headerTitle: 'Notification Settings',
          headerShadowVisible: false,
          headerBackTitle: 'Back',
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

          return (
            <Icon 
              name={iconName} 
              size={size} 
              color={color} 
            />
          );
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
        component={DiscoverStack}
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
        component={ConnectionsStack}
        options={{
          tabBarLabel: 'Connections',
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsStack}
        options={{
          tabBarLabel: 'Notifications',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainAppNavigator;
