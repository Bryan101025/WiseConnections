// src/utils/realtimeSubscriptionManager.ts
import { supabase } from '../config/supabase';

export class RealtimeSubscriptionManager {
  private static subscriptions: {
    posts?: any;
    likes?: any;
    comments?: any;
    events?: any;
  } = {};

  static subscribeToPostUpdates(onUpdate: (payload: any) => void) {
    this.subscriptions.posts = supabase
      .channel('posts_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();
  }

  static subscribeToLikes(postId: string, onUpdate: (payload: any) => void) {
    this.subscriptions.likes = supabase
      .channel(`post_likes_${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();
  }

  static subscribeToComments(postId: string, onUpdate: (payload: any) => void) {
    this.subscriptions.comments = supabase
      .channel(`post_comments_${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();
  }

  static subscribeToEvents(onUpdate: (payload: any) => void) {
    this.subscriptions.events = supabase
      .channel('events_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();
  }

  static unsubscribeAll() {
    Object.values(this.subscriptions).forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
    this.subscriptions = {};
  }
}
