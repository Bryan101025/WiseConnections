// src/hooks/useRealtimeSubscriptions.ts
import { useEffect } from 'react';
import { RealtimeSubscriptionManager } from '../utils/realtimeSubscriptionManager';
import { useNotifications } from './useNotifications';

export const useRealtimeSubscriptions = () => {
  const { createNotification } = useNotifications();

  useEffect(() => {
    // Subscribe to post updates
    RealtimeSubscriptionManager.subscribeToPostUpdates((payload) => {
      if (payload.eventType === 'INSERT') {
        createNotification({
          type: 'post',
          title: 'New Post',
          body: 'Someone you follow has posted something new',
          data: { postId: payload.new.id }
        });
      }
    });

    // Subscribe to events
    RealtimeSubscriptionManager.subscribeToEvents((payload) => {
      if (payload.eventType === 'INSERT') {
        createNotification({
          type: 'event',
          title: 'New Event',
          body: 'A new event has been created in your area',
          data: { eventId: payload.new.id }
        });
      }
    });

    return () => {
      RealtimeSubscriptionManager.unsubscribeAll();
    };
  }, []);
};

// src/hooks/usePostSubscriptions.ts
export const usePostSubscriptions = (postId: string) => {
  const { createNotification } = useNotifications();

  useEffect(() => {
    // Subscribe to likes
    RealtimeSubscriptionManager.subscribeToLikes(postId, (payload) => {
      if (payload.eventType === 'INSERT') {
        createNotification({
          type: 'like',
          title: 'New Like',
          body: 'Someone liked your post',
          data: { postId, userId: payload.new.user_id }
        });
      }
    });

    // Subscribe to comments
    RealtimeSubscriptionManager.subscribeToComments(postId, (payload) => {
      if (payload.eventType === 'INSERT') {
        createNotification({
          type: 'comment',
          title: 'New Comment',
          body: 'Someone commented on your post',
          data: { postId, commentId: payload.new.id }
        });
      }
    });

    return () => {
      RealtimeSubscriptionManager.unsubscribeAll();
    };
  }, [postId]);
};
