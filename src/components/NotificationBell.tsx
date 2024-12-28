// src/components/NotificationBell.tsx
import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationBellProps {
  onPress: () => void;
}

export const NotificationBell = ({ onPress }: NotificationBellProps) => {
  const { unreadCount } = useNotifications();
  const bounceAnimation = new Animated.Value(0);

  // Animate when unreadCount changes
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.sequence([
        Animated.timing(bounceAnimation, {
          toValue: 1,
          duration: 200,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnimation, {
          toValue: 0,
          duration: 200,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount]);

  const animatedStyle = {
    transform: [{
      scale: bounceAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.2],
      }),
    }],
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Icon
          name={unreadCount > 0 ? "notifications" : "notifications-outline"}
          size={24}
          color="#000"
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 8,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
});
