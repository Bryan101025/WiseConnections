// src/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  location: string | null;
  interests: string[];
  profile_photo_url: string | null;
}

interface ProfileUpdate {
  first_name: string;
  last_name: string;
  bio?: string;
  location?: string;
  interests?: string[];
}

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const profileId = userId || userData.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          bio,
          location,
          interests,
          profile_photo_url
        `)
        .eq('id', profileId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userData.user.id);

      if (error) throw error;

      // Refresh profile data after update
      await fetchProfile();

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating profile';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  const updateProfilePhoto = async (photoUrl: string) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo_url: photoUrl })
        .eq('id', userData.user.id);

      if (error) throw error;

      // Refresh profile data after update
      await fetchProfile();

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating profile photo';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateProfilePhoto,
    refresh: fetchProfile,
  };
};
