// src/hooks/useEvents.ts
import { useState } from 'react';
import { supabase } from '../config/supabase';
import { NotificationTriggers } from '../services/NotificationTriggers';

interface EventData {
  title: string;
  description: string;
  date_time: string;
  location: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
}

export const useEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = async (eventData: EventData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          ...eventData,
          creator_id: userData.user.id,
          current_participants: 1, // Creator is first participant
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Automatically add creator as participant
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: userData.user.id,
          status: 'registered'
        });

      if (participantError) throw participantError;

      // Create event reminder notification
      await NotificationTriggers.createEventReminder(event.id);

      return { data: event, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<EventData>) => {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .eq('creator_id', userData.user.id) // Only creator can update
        .select()
        .single();

      if (error) throw error;

      // If date/time was updated, create new reminder
      if (updates.date_time) {
        await NotificationTriggers.createEventReminder(eventId);
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const cancelEvent = async (eventId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', eventId)
        .eq('creator_id', userData.user.id); // Only creator can cancel

      if (error) throw error;

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel event';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createEvent,
    updateEvent,
    cancelEvent,
  };
};
