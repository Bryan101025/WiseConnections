// src/hooks/useConnections.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

type ConnectionStatus = 'pending' | 'connected';

type Connection = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  connected_user: {
    id: string;
    first_name: string;
    last_name: string;
    bio: string | null;
    interests: string[];
    location: string | null;
    profile_photo_url: string | null;
  };
};

type RecommendedUser = Connection['connected_user'] & {
  matchScore: number;
};

export const useConnections = () => {
  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [recommended, setRecommended] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyConnections = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          connected_user:profiles!receiver_id(
            id,
            first_name,
            last_name,
            bio,
            interests,
            location,
            profile_photo_url
          )
        `)
        .eq('requester_id', userData.user.id)
        .eq('status', 'connected');

      if (error) throw error;
      setMyConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const calculateMatchScore = (profile: any, userProfile: any) => {
    let score = 0;

    // Calculate shared interests score (0-5 points)
    const sharedInterests = profile.interests?.filter(
      (interest: string) => userProfile.interests?.includes(interest)
    ) || [];
    score += Math.min(sharedInterests.length * 2, 5);

    // Location match (3 points)
    if (profile.location && userProfile.location && 
        profile.location === userProfile.location) {
      score += 3;
    }

    return score;
  };

  const fetchRecommended = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get current user's profile with interests and location
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('interests, location')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile) return;

      // Get potential connections
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          bio,
          interests,
          location,
          profile_photo_url
        `)
        .neq('id', userData.user.id)
        .not('id', 'in', (
          supabase
            .from('connections')
            .select('receiver_id')
            .or(`requester_id.eq.${userData.user.id},receiver_id.eq.${userData.user.id}`)
        ))
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Sort recommendations by match score
      const sortedRecommendations = data
        .map(profile => ({
          ...profile,
          matchScore: calculateMatchScore(profile, userProfile)
        }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .filter(profile => profile.matchScore > 0); // Only show relevant matches

      setRecommended(sortedRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const connect = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: userData.user.id,
          receiver_id: userId,
          status: 'connected'
        });

      if (error) throw error;
      
      // Refresh connections
      await Promise.all([fetchMyConnections(), fetchRecommended()]);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const disconnect = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('connections')
        .delete()
        .match({
          requester_id: userData.user.id,
          receiver_id: userId
        });

      if (error) throw error;
      
      // Refresh connections
      await Promise.all([fetchMyConnections(), fetchRecommended()]);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchMyConnections(), fetchRecommended()]);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    myConnections,
    recommended,
    loading,
    connect,
    disconnect,
    refresh,
  };
};
