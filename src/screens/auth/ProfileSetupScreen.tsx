import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../config/supabase';

const INTERESTS = [
  'Golf',
  'Reading',
  'Travel',
  'Walking',
  'Fishing',
  'Gardening',
  'Cards & Games',
  'Arts & Crafts',
  'Dining Out',
  'Swimming',
  'Tennis',
  'Volunteering',
  'Book Clubs',
  'Music',
  'Theater'
];

const ProfileSetupScreen = ({ route, navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleCompleteSetup = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter your first and last name');
      return;
    }

    if (selectedInterests.length === 0) {
      Alert.alert('Error', 'Please select at least one interest');
      return;
    }

    setLoading(true);
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No authenticated user found');

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          interests: selectedInterests,
          profile_completed: true,
          updated_at: new Date()
        })
        .eq('id', session.user.id); // Make sure this matches your database column name

      if (profileError) throw profileError;

      // Refresh the session to trigger the auth state change
      await supabase.auth.refreshSession();
      
      // The RootNavigator will automatically handle the navigation
      // based on the refreshed session state
      
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'An error occurred while completing profile setup'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us about yourself to connect with like-minded retirees
        </Text>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          editable={!loading}
        />

        <Text style={styles.
