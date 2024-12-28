// src/utils/cacheManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheConfig {
  key: string;
  expiryMinutes?: number;
}

interface CacheData<T> {
  data: T;
  timestamp: number;
  expiryMinutes: number;
}

interface CacheMetadata {
  key: string;
  timestamp: number;
  expiryMinutes: number;
}

const CACHE_METADATA_KEY = '@cache_metadata';

export class CacheManager {
  static async set<T>(config: CacheConfig, data: T): Promise<void> {
    try {
      const { key, expiryMinutes = 60 } = config;
      const timestamp = Date.now();

      // Save the actual data
      const cacheData: CacheData<T> = {
        data,
        timestamp,
        expiryMinutes,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));

      // Update metadata
      await this.updateMetadata(key, timestamp, expiryMinutes);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  static async get<T>(config: CacheConfig): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(config.key);
      if (!cached) return null;

      const cacheData: CacheData<T> = JSON.parse(cached);
      
      // Check if cache has expired
      if (this.isExpired(cacheData.timestamp, cacheData.expiryMinutes)) {
        await this.clear(config.key);
        return null;
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
      await this.removeFromMetadata(key);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  private static async updateMetadata(
    key: string,
    timestamp: number,
    expiryMinutes: number
  ): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      metadata.push({ key, timestamp, expiryMinutes });
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Error updating cache metadata:', error);
    }
  }

  private static async removeFromMetadata(key: string): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      const filtered = metadata.filter(item => item.key !== key);
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing from cache metadata:', error);
    }
  }

  private static async getMetadata(): Promise<CacheMetadata[]> {
    try {
      const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      return metadata ? JSON.parse(metadata) : [];
    } catch (error) {
      console.error('Error getting cache metadata:', error);
      return [];
    }
  }

  private static isExpired(timestamp: number, expiryMinutes: number): boolean {
    const now = Date.now();
    const expiryTime = timestamp + (expiryMinutes * 60 * 1000);
    return now > expiryTime;
  }

  // Cleanup strategies
  static async cleanupExpiredCache(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      const now = Date.now();

      for (const item of metadata) {
        if (this.isExpired(item.timestamp, item.expiryMinutes)) {
          await this.clear(item.key);
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }

  static async cleanupOldCache(maxAgeDays: number = 7): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      const now = Date.now();
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

      for (const item of metadata) {
        if (now - item.timestamp > maxAge) {
          await this.clear(item.key);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old cache:', error);
    }
  }

  static async clearAll(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      
      // Clear all cached data
      for (const item of metadata) {
        await AsyncStorage.removeItem(item.key);
      }

      // Clear metadata
      await AsyncStorage.removeItem(CACHE_METADATA_KEY);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
}
