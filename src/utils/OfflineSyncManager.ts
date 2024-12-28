// src/utils/OfflineSyncManager.ts
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

interface SyncItem {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  attempts: number;
}

export class OfflineSyncManager {
  private static SYNC_QUEUE_KEY = '@offline_sync_queue';
  private static MAX_RETRY_ATTEMPTS = 3;
  private static SYNC_INTERVAL = 60000; // 1 minute
  private static isSyncing = false;

  static async initialize() {
    // Set up network listener
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.syncQueuedActions();
      }
    });

    // Set up periodic sync attempt
    setInterval(() => {
      this.syncQueuedActions();
    }, this.SYNC_INTERVAL);
  }

  static async addToSyncQueue(action: string, data: any) {
    try {
      const queue = await this.getQueue();
      const syncItem: SyncItem = {
        id: Date.now().toString(),
        action,
        data,
        timestamp: Date.now(),
        attempts: 0,
      };

      await AsyncStorage.setItem(
        this.SYNC_QUEUE_KEY,
        JSON.stringify([...queue, syncItem])
      );

      // Try to sync immediately if online
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected) {
        this.syncQueuedActions();
      }
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  private static async getQueue(): Promise<SyncItem[]> {
    try {
      const queue = await AsyncStorage.getItem(this.SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  private static async syncQueuedActions() {
    if (this.isSyncing) return;

    try {
      this.isSyncing = true;
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) return;

      const queue = await this.getQueue();
      if (queue.length === 0) return;

      const remainingItems: SyncItem[] = [];
      const processedIds: string[] = [];

      for (const item of queue) {
        try {
          if (item.attempts >= this.MAX_RETRY_ATTEMPTS) {
            // Log failed action for manual resolution
            await this.logFailedAction(item);
            continue;
          }

          await this.processSyncItem(item);
          processedIds.push(item.id);
        } catch (error) {
          console.error(`Error processing sync item ${item.id}:`, error);
          remainingItems.push({
            ...item,
            attempts: item.attempts + 1,
          });
        }
      }

      // Update queue with remaining items
      await AsyncStorage.setItem(
        this.SYNC_QUEUE_KEY,
        JSON.stringify(remainingItems)
      );

      // Notify success for processed items
      if (processedIds.length > 0) {
        this.notifySuccessfulSync(processedIds);
      }

    } finally {
      this.isSyncing = false;
    }
  }

  private static async processSyncItem(item: SyncItem) {
    switch (item.action) {
      case 'CREATE_POST':
        await this.syncCreatePost(item.data);
        break;
      case 'LIKE_POST':
        await this.syncLikePost(item.data);
        break;
      case 'CREATE_COMMENT':
        await this.syncCreateComment(item.data);
        break;
      case 'UPDATE_PROFILE':
        await this.syncUpdateProfile(item.data);
        break;
      // Add more cases as needed
    }
  }

  private static async syncCreatePost(data: any) {
    const { error } = await supabase
      .from('posts')
      .insert(data);
    
    if (error) throw error;
  }

  private static async syncLikePost(data: any) {
    const { error } = await supabase
      .from('post_likes')
      .insert(data);
    
    if (error) throw error;
  }

  private static async syncCreateComment(data: any) {
    const { error } = await supabase
      .from('comments')
      .insert(data);
    
    if (error) throw error;
  }

  private static async syncUpdateProfile(data: any) {
    const { error } = await supabase
      .from('profiles')
      .update(data.updates)
      .eq('id', data.userId);
    
    if (error) throw error;
  }

  private static async logFailedAction(item: SyncItem) {
    try {
      await AsyncStorage.setItem(
        `@failed_sync_${item.id}`,
        JSON.stringify({
          ...item,
          failed_at: Date.now(),
        })
      );
    } catch (error) {
      console.error('Error logging failed action:', error);
    }
  }

  private static async notifySuccessfulSync(itemIds: string[]) {
    // Implement any notification or UI update logic here
    console.log('Successfully synced items:', itemIds);
  }

  static async getFailedActions() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const failedKeys = keys.filter(key => key.startsWith('@failed_sync_'));
      const failedActions = await AsyncStorage.multiGet(failedKeys);
      return failedActions.map(([key, value]) => JSON.parse(value!));
    } catch (error) {
      console.error('Error getting failed actions:', error);
      return [];
    }
  }

  static async clearFailedActions() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const failedKeys = keys.filter(key => key.startsWith('@failed_sync_'));
      await AsyncStorage.multiRemove(failedKeys);
    } catch (error) {
      console.error('Error clearing failed actions:', error);
    }
  }

  static async retryFailedAction(itemId: string) {
    try {
      const failedAction = await AsyncStorage.getItem(`@failed_sync_${itemId}`);
      if (!failedAction) return;

      const item = JSON.parse(failedAction);
      await this.addToSyncQueue(item.action, item.data);
      await AsyncStorage.removeItem(`@failed_sync_${itemId}`);
    } catch (error) {
      console.error('Error retrying failed action:', error);
    }
  }
}
