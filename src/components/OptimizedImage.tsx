// src/components/OptimizedImage.tsx
import React, { useState } from 'react';
import { Image, View, StyleSheet, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';

interface OptimizedImageProps {
  uri?: string;
  style: any;
  defaultSource: any;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  style,
  defaultSource,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return <Image source={defaultSource} style={style} />;
  }

  return (
    <View>
      <FastImage
        style={style}
        source={{
          uri,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable,
        }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setHasError(true)}
      />
      {isLoading && (
        <View style={[styles.loaderContainer, style]}>
          <ActivityIndicator color="#007AFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
});

// src/hooks/useListOptimization.ts
import { useState, useCallback, useRef } from 'react';

export const useListOptimization = (fetchMore: () => void) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingTimeout = useRef<NodeJS.Timeout>();
  const scrollPosition = useRef(0);

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      scrollPosition.current = contentOffset.y;

      const distanceFromEnd =
        contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (distanceFromEnd < 500 && !isLoadingMore) {
        setIsLoadingMore(true);
        
        // Clear existing timeout
        if (loadingTimeout.current) {
          clearTimeout(loadingTimeout.current);
        }

        // Set new timeout for loading more
        loadingTimeout.current = setTimeout(() => {
          fetchMore();
          setIsLoadingMore(false);
        }, 500);
      }
    },
    [isLoadingMore, fetchMore]
  );

  const cleanup = () => {
    if (loadingTimeout.current) {
      clearTimeout(loadingTimeout.current);
    }
  };

  return {
    handleScroll,
    isLoadingMore,
    scrollPosition: scrollPosition.current,
    cleanup,
  };
};

// src/components/MemoizedPostCard.tsx
import React, { memo } from 'react';
import { PostCard } from './PostCard';

export const MemoizedPostCard = memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.post.is_liked === nextProps.post.is_liked
  );
});

// src/components/ListEmptyComponent.tsx
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export const ListEmptyComponent = memo(({ message, icon }) => (
  <View style={styles.emptyContainer}>
    <Icon name={icon} size={48} color="#666" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
));

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});

// src/utils/memoryManager.ts
export class MemoryManager {
  private static listenerCount = 0;
  private static cleanupCallbacks: (() => void)[] = [];

  static addCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }

  static removeCleanupCallback(callback: () => void) {
    this.cleanupCallbacks = this.cleanupCallbacks.filter(cb => cb !== callback);
  }

  static incrementListeners() {
    this.listenerCount++;
    if (this.listenerCount > 10) {
      this.cleanup();
    }
  }

  static decrementListeners() {
    this.listenerCount--;
  }

  static cleanup() {
    this.cleanupCallbacks.forEach(callback => callback());
    this.listenerCount = 0;
  }
}
