
 // src/screens/auth/ProfileSetupScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../../config/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ProfileSetupScreen = ({ navigation }: Props) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    previousOccupation: '',
    interests: '',
    location: 'Myrtle Beach', // Default location
  });
  const [loading, setLoading] = useState(false);

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!formData.firstName || !formData.lastName || !formData.age) {
      Alert.alert('Error', 'Please fill in your first name, last name, and age');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            user_id: user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            age: parseInt(formData.age),
            previous_occupation: formData.previousOccupation,
            interests: formData.interests,
            location: formData.location,
          }
        ]);

      if (error) throw error;

      Alert.alert('Success', 'Profile created successfully!');
      
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself to connect with like-minded retirees</Text>

          <View style={styles.nameContainer}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={(value) => updateFormData('firstName', value)}
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={(value) => updateFormData('lastName', value)}
              autoCapitalize="words"
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Age"
            value={formData.age}
            onChangeText={(value) => updateFormData('age', value)}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Previous Occupation"
            value={formData.previousOccupation}
            onChangeText={(value) => updateFormData('previousOccupation', value)}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Interests (e.g., golf, reading, travel)"
            value={formData.interests}
            onChangeText={(value) => updateFormData('interests', value)}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity 
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Profile...' : 'Complete Profile Setup'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  nameInput: {
    width: '48%', // Leave small gap between inputs
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  button: {
    width: '100%',
    height: 55,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ProfileSetupScreen;