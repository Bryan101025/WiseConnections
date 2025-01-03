// src/screens/main/NotificationsScreen.tsx
import React, { useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { CacheManager } from '../../utils/cacheManager';
import { MemoryManager } from '../../utils/memoryManager';

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'event' | 'like' | 'comment' | 'connection' | 'message';
    title: string;
    body: string;
    created_at: string;
    read: boolean;
    data?: any;
  };
  onPress: () => void;
  onDelete: () => void;
  index: number;
}

const RightSwipeActions = memo(({ progress, dragX, onDelete }) => {
  const scale = dragX.interpolate({
    inputRange: [-100, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <TouchableOpacity 
      style={styles.deleteButton}
      onPress={onDelete}
    >
      <Animated.View style={[styles.deleteButtonContent, { transform: [{ scale }] }]}>
        <Icon name="trash-outline" size={24} color="#fff" />
        <Animated.Text style={styles.deleteButtonText}>
          Delete
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const NotificationIcon = memo(({ type, isRead }) => {
  const getIcon = () => {
    switch (type) {
      case 'event':
        return 'calendar-outline';
      case 'like':
        return 'heart-outline';
      case 'comment':
        return 'chatbubble-outline';
      case 'connection':
        return 'person-add-outline';
      case 'message':
        return 'mail-outline';
      default:
        return 'notifications-outline';
    }
  };

  return (
    <Icon 
      name={getIcon()} 
      size={24} 
      color={isRead ? '#666' : '#007AFF'} 
    />
  );
});

const NotificationItem = memo(({ notification, onPress, onDelete, index }: NotificationItemProps) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <Swipeable
      renderRightActions={(progress, dragX) => (
        <RightSwipeActions 
          progress={progress} 
          dragX={dragX} 
          onDelete={onDelete}
        />
      )}
      overshootRight={false}
    >
      <AnimatedTouchable
        style={[
          styles.notificationItem,
          !notification.read && styles.unreadNotification,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <NotificationIcon 
            type={notification.type} 
            isRead={notification.read} 
          />
        </View>
        <View style={styles.contentContainer}>
          <Text 
            style={[
              styles.title,
              !notification.read && styles.unreadText
            ]}
          >
            {notification.title}
          </Text>
          <Text style={styles.body}>{notification.body}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </Text>
        </View>
      </AnimatedTouchable>
    </Swipeable>
  );
});

const EmptyState = memo(() => (
  <Animated.View 
    style={[
      styles.emptyContainer,
      { opacity: new Animated.Value(1) }
    ]}
  >
    <Icon name="notifications-outline" size={48} color="#666" />
    <Text style={styles.emptyText}>No notifications yet</Text>
    <Text style={styles.emptySubtext}>
      We'll notify you when there's something new
    </Text>
  </Animated.View>
));

const NotificationsScreen = ({ navigation }) => {
  const { 
    notifications,
    loading,
    refreshing,
    error,
    markAsRead,
    deleteNotification,
    refresh
  } = useNotifications();
  const { isOnline, handleError, clearError } = useNetworkError();
  const isMounted = useRef(true);
  const dataCache = useRef(new Map());

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error]);

  useEffect(() => {
    MemoryManager.incrementListeners();
    return () => {
      isMounted.current = false;
      MemoryManager.decrementListeners();
      dataCache.current.clear();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isMounted.current) {
      clearError();
      dataCache.current.clear();
      await refresh();
    }
  }, [refresh, clearError]);

  const handleNotificationPress = useCallback(async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'event':
        navigation.navigate('Events', {
          screen: 'EventDetails',
          params: { eventId: notification.data.eventId }
        });
        break;
      case 'like':
      case 'comment':
        navigation.navigate('Home', {
          screen: 'PostDetails',
          params: { postId: notification.data.postId }
        });
        break;
      case 'connection':
        navigation.navigate('Connections', {
          screen: 'Profile',
          params: { userId: notification.data.userId }
        });
        break;
      case 'message':
        navigation.navigate('Messages', {
                    screen: 'MessageDetail',
          params: { 
            conversationId: notification.data.conversationId,
            recipientName: notification.data.senderName,
            recipientId: notification.data.senderId
          }
        });
        break;
    }
  }, [navigation, markAsRead]);

  const renderNotificationItem = useCallback(({ item, index }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onDelete={() => deleteNotification(item.id)}
      index={index}
    />
  ), [handleNotificationPress, deleteNotification]);

  if (!isOnline) {
    return (
      <ErrorView
        error="No internet connection. Please check your network and try again."
        icon="cloud-offline-outline"
        onRetry={handleRefresh}
      />
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3].map((_, index) => (
          <View key={index} style={styles.skeletonNotification}>
            <View style={styles.skeletonIcon}>
              <SkeletonPresets.Avatar style={styles.skeletonIconInner} />
            </View>
            <View style={styles.skeletonContent}>
              <SkeletonPresets.Text style={styles.skeletonTitle} />
              <SkeletonPresets.Text style={styles.skeletonBody} />
              <SkeletonPresets.Text style={styles.skeletonTimestamp} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={handleRefresh}
      />
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <Animated.FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            notifications.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={EmptyState}
          windowSize={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          initialNumToRender={10}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
  },
  skeletonNotification: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  skeletonIconInner: {
    width: '100%',
    height: '100%',
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonTitle: {
    height: 18,
    width: '80%',
  },
  skeletonBody: {
    height: 16,
    width: '90%',
  },
  skeletonTimestamp: {
    height: 12,
    width: '40%',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  unreadNotification: {
    backgroundColor: '#F0F8FF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 80,
  },
  deleteButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default memo(NotificationsScreen);

