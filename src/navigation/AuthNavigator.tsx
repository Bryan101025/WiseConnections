// src/navigation/AuthNavigator.tsx
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

const Stack = createStackNavigator();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};

// src/screens/auth/SignUpScreen.tsx
import { useState } from 'react';
import { View, Alert } from 'react-native';
import { supabase } from '../../config/supabase';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    try {
      setLoading(true);
      
      // Validate input
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      // Sign up with Supabase
      const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (user) {
        // Create initial profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user.id,
              email: user.email,
              created_at: new Date(),
            }
          ]);

        if (profileError) throw profileError;

        // Navigate to profile setup
        navigation.navigate('ProfileSetup', { userId: user.id });
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your sign-up form UI implementation
  );
}

// src/screens/auth/ProfileSetupScreen.tsx
import { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { supabase } from '../../config/supabase';

export default function ProfileSetupScreen({ route, navigation }) {
  const { userId } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Predefined interests categories
  const interestCategories = [
    'Gardening',
    'Reading',
    'Travel',
    'Cooking',
    'Sports',
    'Arts & Crafts',
    'Technology',
    'Music',
    'Volunteering',
    'Social Groups'
  ];

  const handleInterestToggle = (interest) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleProfileSetup = async () => {
    try {
      setLoading(true);

      // Validate input
      if (!firstName || !lastName) {
        throw new Error('Please fill in all required fields');
      }

      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          interests,
          profile_completed: true,
          updated_at: new Date()
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Navigate to main app
      navigation.replace('MainApp');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your profile setup form UI implementation
  );
}

// Supabase profile table schema
/*
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  first_name text,
  last_name text,
  email text,
  interests text[],
  profile_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  constraint username_length check (char_length(username) >= 3)
);

-- Create indexes for better query performance
create index profiles_user_id_idx on profiles(user_id);
create index profiles_interests_idx on profiles using gin(interests);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile."
  on profiles for update
  using ( auth.uid() = id );
*/