// src/hooks/useNearbyEvents.ts
import { useState, useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { supabase } from '../config/supabase';
import { CacheManager } from '../utils/cacheManager';

// ... (keep existing interfaces and helper functions)

export const useNearbyEvents = ({ limit = 5, maxDistance = 50 }: UseNearbyEventsProps = {}) => {
  const [nearbyEvents, setNearbyEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCacheKey = () => {
    const today = new Date().toDateString();
    return `nearby_events_${limit}_${maxDistance}_${today}`;
  };

  const fetchNearbyEvents = async (isRefreshing: boolean = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
      setError(null);

      // Try to get cached data if not refreshing
      if (!isRefreshing) {
        const cachedEvents = await CacheManager.get<NearbyEvent[]>({
          key: getCacheKey(),
          expiryMinutes: 15, // Cache expires after 15 minutes
        });

        if (cachedEvents) {
          setNearbyEvents(cachedEvents);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

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

      // Fetch events from Supabase with creator information
      const { data: events, error: dbError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!creator_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .gte('date_time', new Date().toISOString())
        .order('date_time', { ascending: true });

      if (dbError) throw dbError;

      // Calculate distances, filter by maxDistance, and sort
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
        .filter(event => event.distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      // Cache the filtered and sorted events
      await CacheManager.set({
        key: getCacheKey(),
        expiryMinutes: 15,
      }, eventsWithDistance);

      setNearbyEvents(eventsWithDistance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching nearby events:', err);

      // Try to use cached data as fallback if available
      if (!isRefreshing) {
        const cachedEvents = await CacheManager.get<NearbyEvent[]>({
          key: getCacheKey(),
          expiryMinutes: 30, // Extended expiry for fallback
        });

        if (cachedEvents) {
          setNearbyEvents(cachedEvents);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    // Clear cache when manually refreshing
    await CacheManager.clear(getCacheKey());
    return fetchNearbyEvents(true);
  };

  useEffect(() => {
    fetchNearbyEvents();

    // Set up real-time subscription
    const subscription = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'events',
        },
        async (payload) => {
          // Only refresh if the event is within the time range
          if (payload.new && new Date(payload.new.date_time) >= new Date()) {
            // Clear cache when real-time update received
            await CacheManager.clear(getCacheKey());
            fetchNearbyEvents();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [limit, maxDistance]);

  // Cleanup cache on unmount for events older than today
  useEffect(() => {
    return () => {
      const cleanupOldCache = async () => {
        const today = new Date().toDateString();
        const oldCacheKey = `nearby_events_${limit}_${maxDistance}_${today}`;
        await CacheManager.clear(oldCacheKey);
      };
      cleanupOldCache();
    };
  }, []);

  return {
    nearbyEvents,
    loading,
    refreshing,
    error,
    refresh,
  };
};
