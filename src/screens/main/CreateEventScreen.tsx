// src/screens/main/CreateEventScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenTemplate } from '../../components/ScreenTemplate';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEvents } from '../../hooks/useEvents';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'CreateEvent'>;

const ACTIVITY_TYPES = [
  'Golf',
  'Tennis',
  'Pickleball',
  'Book Club',
  'Cards & Games',
  'Walking Group',
  'Dinner Group',
  'Other'
];

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'all'];

const CreateEventScreen: React.FC<Props> = ({ navigation }) => {
  const { createEvent } = useEvents();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    activity_type: '',
    description: '',
    date_time: new Date(),
    location: '',
    skill_level: 'all',
    max_participants: '10',
  });

  const handleCreate = async () => {
    if (!formData.title || !formData.activity_type || !formData.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await createEvent({
        ...formData,
        max_participants: parseInt(formData.max_participants),
        status: 'upcoming',
      });

      if (error) throw error;

      Alert.alert('Success', 'Event created successfully!');
      navigation.navigate('EventDetails', { eventId: data.id });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenTemplate>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create New Event</Text>

        <TextInput
          style={styles.input}
          placeholder="Event Title"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        <Text style={styles.label}>Activity Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
          {ACTIVITY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.chip,
                formData.activity_type === type && styles.chipSelected,
              ]}
              onPress={() => setFormData({ ...formData, activity_type: type })}
            >
              <Text style={[
                styles.chipText,
                formData.activity_type === type && styles.chipTextSelected
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />

        <TextInput
          style={styles.input}
          placeholder="Location"
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
        />

        <Text style={styles.label}>Date & Time</Text>
        <DateTimePicker
          value={formData.date_time}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              setFormData({ ...formData, date_time: selectedDate });
            }
          }}
        />

        <Text style={styles.label}>Skill Level</Text>
        <View style={styles.skillLevelContainer}>
          {SKILL_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.skillChip,
                formData.skill_level === level && styles.chipSelected,
              ]}
              onPress={() => setFormData({ ...formData, skill_level: level })}
            >
              <Text style={[
                styles.chipText,
                formData.skill_level === level && styles.chipTextSelected
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Maximum Participants"
          value={formData.max_participants}
          onChangeText={(text) => setFormData({ ...formData, max_participants: text })}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Event</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    color: '#007AFF',
  },
  chipTextSelected: {
    color: '#fff',
  },
  skillLevelContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  skillChip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    margin: 4,
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CreateEventScreen;
