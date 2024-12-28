// src/utils/cacheManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheConfig {
  key: string;
  expiryMinutes?: number;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export class CacheManager {
  static async set<T>(config: CacheConfig, data: T): Promise<void> {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        config.key,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  static async get<T>(config: CacheConfig): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(config.key);
      if (!cached) return null;

      const cacheData: CacheData<T> = JSON.parse(cached);
      
      if (config.expiryMinutes) {
        const expiryTime = cacheData.timestamp + (config.expiryMinutes * 60 * 1000);
        if (Date.now() > expiryTime) {
          await AsyncStorage.removeItem(config.key);
          return null;
        }
      }

      return cacheData.data;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  }

  static async clear(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
}
