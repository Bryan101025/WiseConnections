// src/screens/main/NotificationsScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';

interface NotificationItemProps {
  notification: {
    id: string;
    type: 'event' | 'like' | 'comment' | 'connection';
    title: string;
    body: string;
    created_at: string;
    read: boolean;
    data?: any;
  };
  onPress: () => void;
  onDelete: () => void;
}

const RightSwipeActions = ({ progress, dragX, onDelete }) => {
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
};

const NotificationItem = ({ notification, onPress, onDelete }: NotificationItemProps) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'event':
        return 'calendar-outline';
      case 'like':
        return 'heart-outline';
      case 'comment':
        return 'chatbubble-outline';
      case 'connection':
        return 'person-add-outline';
      default:
        return 'notifications-outline';
    }
  };

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
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.read && styles.unreadNotification
        ]}
        onPress={onPress}
      >
        <View style={styles.iconContainer}>
          <Icon 
            name={getIcon()} 
            size={24} 
            color={notification.read ? '#666' : '#007AFF'} 
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
      </TouchableOpacity>
    </Swipeable>
  );
};
const NotificationsScreen = ({ navigation }) => {
  const { 
    notifications,
    loading,
    refreshing,
    markAsRead,
    deleteNotification,
    refresh
  } = useNotifications();

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
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
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3].map((_, index) => (
          <View key={index} style={styles.skeletonContainer}>
            <SkeletonPresets.Avatar />
            <View style={styles.skeletonContent}>
              <SkeletonPresets.Text />
              <SkeletonPresets.Text />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onDelete={() => deleteNotification(item.id)}
          />
        )}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="notifications-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        )}
      />
    </View>
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
  skeletonContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 1,
    alignItems: 'center',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    gap: 8,
  },
  listContainer: {
    flexGrow: 1,
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
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
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

export default NotificationsScreen;
