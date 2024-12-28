// src/contexts/RealtimeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { RealtimeSubscriptionManager } from '../utils/realtimeSubscriptionManager';

interface RealtimeContextType {
  newPosts: any[];
  newLikes: Record<string, number>;
  newComments: Record<string, number>;
  newEvents: any[];
  clearNewPosts: () => void;
  clearNewLikes: (postId: string) => void;
  clearNewComments: (postId: string) => void;
  clearNewEvents: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [newPosts, setNewPosts] = useState<any[]>([]);
  const [newLikes, setNewLikes] = useState<Record<string, number>>({});
  const [newComments, setNewComments] = useState<Record<string, number>>({});
  const [newEvents, setNewEvents] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to post updates
    RealtimeSubscriptionManager.subscribeToPostUpdates((payload) => {
      if (payload.eventType === 'INSERT') {
        setNewPosts((prev) => [payload.new, ...prev]);
      }
    });

    // Subscribe to events
    RealtimeSubscriptionManager.subscribeToEvents((payload) => {
      if (payload.eventType === 'INSERT') {
        setNewEvents((prev) => [payload.new, ...prev]);
      }
    });

    return () => {
      RealtimeSubscriptionManager.unsubscribeAll();
    };
  }, []);

  const clearNewPosts = () => setNewPosts([]);
  const clearNewLikes = (postId: string) => {
    setNewLikes((prev) => {
      const updated = { ...prev };
      delete updated[postId];
      return updated;
    });
  };
  const clearNewComments = (postId: string) => {
    setNewComments((prev) => {
      const updated = { ...prev };
      delete updated[postId];
      return updated;
    });
  };
  const clearNewEvents = () => setNewEvents([]);

  return (
    <RealtimeContext.Provider
      value={{
        newPosts,
        newLikes,
        newComments,
        newEvents,
        clearNewPosts,
        clearNewLikes,
        clearNewComments,
        clearNewEvents,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
