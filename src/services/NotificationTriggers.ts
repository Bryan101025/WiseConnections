// src/services/NotificationTriggers.ts
import { supabase } from '../config/supabase';

export class NotificationTriggers {
  // Event Reminders
  static async createEventReminder(eventId: string) {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!event) return;

      // Create reminder notification 24 hours before event
      const reminderTime = new Date(event.date_time);
      reminderTime.setHours(reminderTime.getHours() - 24);

      await supabase
        .from('notifications')
        .insert({
          user_id: event.creator_id,
          type: 'event_reminder',
          title: 'Upcoming Event Reminder',
          body: `Your event "${event.title}" is happening tomorrow`,
          data: {
            eventId,
            type: 'reminder',
            eventTitle: event.title,
            eventTime: event.date_time,
          },
          scheduled_for: reminderTime.toISOString(),
        });
    } catch (error) {
      console.error('Error creating event reminder:', error);
    }
  }

  // Like Notifications
  static async createLikeNotification(postId: string, likerId: string) {
    try {
      const { data: post } = await supabase
        .from('posts')
        .select('*, user:profiles!user_id(*)')
        .eq('id', postId)
        .single();

      if (!post || post.user.id === likerId) return; // Don't notify if liking own post

      const { data: liker } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', likerId)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: post.user.id,
          type: 'like',
          title: 'New Like',
          body: `${liker.first_name} ${liker.last_name} liked your post`,
          data: {
            postId,
            likerId,
            type: 'like',
          },
        });
    } catch (error) {
      console.error('Error creating like notification:', error);
    }
  }

  // Comment Notifications
  static async createCommentNotification(postId: string, commentId: string, commenterId: string) {
    try {
      const { data: post } = await supabase
        .from('posts')
        .select('*, user:profiles!user_id(*)')
        .eq('id', postId)
        .single();

      if (!post) return;

      const { data: commenter } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', commenterId)
        .single();

      // Don't notify if commenting on own post
      if (post.user.id !== commenterId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: post.user.id,
            type: 'comment',
            title: 'New Comment',
            body: `${commenter.first_name} ${commenter.last_name} commented on your post`,
            data: {
              postId,
              commentId,
              commenterId,
              type: 'comment',
            },
          });
      }

      // Notify other commenters
      const { data: otherCommenters } = await supabase
        .from('comments')
        .select('user_id')
        .eq('post_id', postId)
        .neq('user_id', commenterId)
        .neq('user_id', post.user.id);

      if (otherCommenters) {
        const uniqueCommenters = [...new Set(otherCommenters.map(c => c.user_id))];
        
        await Promise.all(
          uniqueCommenters.map(userId =>
            supabase
              .from('notifications')
              .insert({
                user_id: userId,
                type: 'comment_thread',
                title: 'New Reply',
                body: `${commenter.first_name} ${commenter.last_name} also commented on this post`,
                data: {
                  postId,
                  commentId,
                  commenterId,
                  type: 'comment_thread',
                },
              })
          )
        );
      }
    } catch (error) {
      console.error('Error creating comment notification:', error);
    }
  }

  // Connection Request Notifications
  static async createConnectionNotification(requesterId: string, receiverId: string) {
    try {
      const { data: requester } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', requesterId)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'connection_request',
          title: 'New Connection Request',
          body: `${requester.first_name} ${requester.last_name} wants to connect with you`,
          data: {
            requesterId,
            type: 'connection_request',
          },
        });
    } catch (error) {
      console.error('Error creating connection notification:', error);
    }
  }
}
