// src/hooks/useConnections.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { NotificationTriggers } from '../services/NotificationTriggers';


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
  matchDetails: {
    sharedEvents: number;
    sharedInterests: number;
    locationMatch: boolean;
  };
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

  const calculateMatchScore = async (profile: any, userProfile: any) => {
    let score = 0;

    // Shared Events Score (0-10 points)
    const { data: sharedEvents } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('status', 'registered')
      .in('participant_id', [profile.id, userProfile.id])
      .group('event_id')
      .having('count(*)', 'eq', 2);

    const sharedEventCount = sharedEvents?.length || 0;
    score += Math.min(sharedEventCount * 5, 10); // 5 points per shared event, max 10 points

    // Interests Score (0-5 points)
    const sharedInterests = profile.interests?.filter(
      (interest: string) => userProfile.interests?.includes(interest)
    ) || [];
    score += Math.min(sharedInterests.length * 2, 5);

    // Location Score (3 points)
    if (profile.location && userProfile.location && 
        profile.location === userProfile.location) {
      score += 3;
    }

    return {
      score,
      sharedEventCount,
      sharedInterestCount: sharedInterests.length,
      locationMatch: profile.location === userProfile.location
    };
  };

  const fetchRecommended = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get current user's profile
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
          profile_photo_url,
          event_participants(
            event_id,
            status
          )
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

      // Calculate match scores with additional info
      const recommendationsWithScores = await Promise.all(
        data.map(async (profile) => {
          const matchInfo = await calculateMatchScore(profile, userProfile);
          return {
            ...profile,
            matchScore: matchInfo.score,
            matchDetails: {
              sharedEvents: matchInfo.sharedEventCount,
              sharedInterests: matchInfo.sharedInterestCount,
              locationMatch: matchInfo.locationMatch
            }
          };
        })
      );

      // Sort by match score and filter out low scores
      const sortedRecommendations = recommendationsWithScores
        .sort((a, b) => b.matchScore - a.matchScore)
        .filter(profile => profile.matchScore > 0);

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

    // Create connection request notification
    await NotificationTriggers.createConnectionNotification(
      userData.user.id, // requesterId
      userId // receiverId
    );
    
    // Refresh connections
    await Promise.all([fetchMyConnections(), fetchRecommended()]);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

  const acceptConnection = async (connectionId: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('connections')
      .update({ status: 'connected' })
      .eq('id', connectionId)
      .eq('receiver_id', userData.user.id); // Ensure only receiver can accept

    if (error) throw error;

    // Create acceptance notification
    const { data: connection } = await supabase
      .from('connections')
      .select('requester_id')
      .eq('id', connectionId)
      .single();

    if (connection) {
      await NotificationTriggers.createConnectionNotification(
        userData.user.id, // accepterId
        connection.requester_id, // original requesterId
        'accepted' // optional parameter to indicate acceptance
      );
    }

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
    acceptConnection
    refresh,
  };
};
