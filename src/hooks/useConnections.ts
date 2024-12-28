// src/hooks/useConnections.ts
import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export const useConnections = () => {
  const [myConnections, setMyConnections] = useState([]);
  const [recommended, setRecommended] = useState([]);
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
            interests
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

  const fetchRecommended = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Fetch user's interests first
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('interests')
        .eq('id', userData.user.id)
        .single();

      // Fetch users with similar interests who aren't connected
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', userData.user.id)
        .not('id', 'in', (
          supabase
            .from('connections')
            .select('receiver_id')
            .eq('requester_id', userData.user.id)
        ))
        .filter('interests', 'cs', `{${userProfile.interests.join(',')}}`)
        .limit(10);

      if (error) throw error;
      setRecommended(data || []);
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
      await fetchMyConnections();
      await fetchRecommended();
      
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
      await fetchMyConnections();
      await fetchRecommended();
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  useEffect(() => {
    Promise.all([fetchMyConnections(), fetchRecommended()])
      .finally(() => setLoading(false));
  }, []);

  return {
    myConnections,
    recommended,
    loading,
    connect,
    disconnect,
    refresh: () => Promise.all([fetchMyConnections(), fetchRecommended()]),
  };
};
