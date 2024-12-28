// src/utils/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';

type QueuedAction = {
  id: string;
  type: 'create_post' | 'like_post' | 'create_comment' | 'create_event' | 'connect_user';
  data: any;
  timestamp: number;
  retryCount: number;
};

export class OfflineQueue {
  private static QUEUE_KEY = '@offline_queue';
  private static MAX_RETRIES = 3;
  private static isProcessing = false;

  static async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) {
    try {
      const queuedActions = await this.getQueue();
      
      const newAction: QueuedAction = {
        id: Math.random().toString(36).substring(7),
        ...action,
        timestamp: Date.now(),
        retryCount: 0,
      };

      await AsyncStorage.setItem(
        this.QUEUE_KEY,
        JSON.stringify([...queuedActions, newAction])
      );

      // Try to process queue immediately if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  static async getQueue(): Promise<QueuedAction[]> {
    try {
      const queue = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  static async processQueue() {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      const queue = await this.getQueue();
      if (queue.length === 0) return;

      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) return;

      const remainingActions: QueuedAction[] = [];

      for (const action of queue) {
        try {
          await this.processAction(action);
        } catch (error) {
          console.error(`Error processing action ${action.id}:`, error);
          if (action.retryCount < this.MAX_RETRIES) {
            remainingActions.push({
              ...action,
              retryCount: action.retryCount + 1,
            });
          }
        }
      }

      await AsyncStorage.setItem(
        this.QUEUE_KEY,
        JSON.stringify(remainingActions)
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processAction(action: QueuedAction) {
    switch (action.type) {
      case 'create_post':
        await this.processCreatePost(action.data);
        break;
      case 'like_post':
        await this.processLikePost(action.data);
        break;
      case 'create_comment':
        await this.processCreateComment(action.data);
        break;
      case 'create_event':
        await this.processCreateEvent(action.data);
        break;
      case 'connect_user':
        await this.processConnectUser(action.data);
        break;
    }
  }

  private static async processCreatePost(data: { content: string }) {
    const { error } = await supabase
      .from('posts')
      .insert(data);
    
    if (error) throw error;
  }

  private static async processLikePost(data: { post_id: string; user_id: string }) {
    const { error } = await supabase
      .from('post_likes')
      .insert(data);
    
    if (error) throw error;
  }

  private static async processCreateComment(
    data: { post_id: string; content: string; user_id: string }
  ) {
    const { error } = await supabase
      .from('comments')
      .insert(data);
    
    if (error) throw error;
  }

  private static async processCreateEvent(data: any) {
    const { error } = await supabase
      .from('events')
      .insert(data);
    
    if (error) throw error;
  }

  private static async processConnectUser(
    data: { requester_id: string; receiver_id: string }
  ) {
    const { error } = await supabase
      .from('connections')
      .insert({ ...data, status: 'connected' });
    
    if (error) throw error;
  }
}

// Set up network listener to process queue when coming back online
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    OfflineQueue.processQueue();
  }
});
