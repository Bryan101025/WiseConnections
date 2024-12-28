// src/hooks/useNearbyEvents.ts
import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { supabase } from '../config/supabase';

export interface NearbyEvent {
  id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  latitude: number;
  longitude: number;
  distance: number;
  max_participants: number;
  current_participants: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    try {
      const granted = await Geolocation.requestAuthorization('whenInUse');
      return granted === 'granted';
    } catch (err) {
      return false;
    }
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'WiseConnections needs access to your location to show nearby events.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  }
};

export const useNearbyEvents = () => {
  const [nearbyEvents, setNearbyEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      });

      const { latitude, longitude } = position.coords;

      // Fetch events from Supabase
      const { data: events, error: dbError } = await supabase
        .from('events')
        .select('*')
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

      if (dbError) throw dbError;

      // Calculate distances and sort
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
        .slice(0, 5);

      setNearbyEvents(eventsWithDistance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching nearby events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyEvents();

    const subscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        fetchNearbyEvents
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
    refresh: fetchNearbyEvents,
  };
};
