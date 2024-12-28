// src/hooks/useNearbyEvents.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import * as Location from 'expo-location';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  // Haversine formula
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useNearbyEvents = () => {
  const [nearbyEvents, setNearbyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Fetch events
      const { data: events, error: dbError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          date_time,
          location,
          latitude,
          longitude,
          max_participants,
          current_participants
        `)
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

      if (dbError) throw dbError;

      // Calculate distance for each event and sort by proximity
      const eventsWithDistance = events
        .map(event => ({
          ...event,
          distance: calculateDistance(
            latitude,
            longitude,
            event.latitude,
            event.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Only show 5 nearest events

      setNearbyEvents(eventsWithDistance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching nearby events:', err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchNearbyEvents();
  };

  useEffect(() => {
    fetchNearbyEvents();

    // Set up real-time subscription for event updates
    const subscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          fetchNearbyEvents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    nearbyEvents,
    loading,
    error,
    refresh,
  };
};
