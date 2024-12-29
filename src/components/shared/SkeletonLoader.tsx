// src/components/shared/SkeletonLoader.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, opacity },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
});

// Preset skeletons for common use cases
export const SkeletonPresets = {
  Avatar: () => (
    <SkeletonLoader
      width={40}
      height={40}
      style={{ borderRadius: 20 }}
    />
  ),
  Title: () => (
    <SkeletonLoader
      width={200}
      height={24}
      style={{ marginVertical: 8 }}
    />
  ),
  Text: () => (
    <SkeletonLoader
      width="100%"
      height={16}
      style={{ marginVertical: 4 }}
    />
  ),
  Card: () => (
    <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonPresets.Avatar />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <SkeletonLoader width={120} height={16} />
          <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonLoader 
        width="100%" 
        height={60} 
        style={{ marginTop: 12 }} 
      />
    </View>
  ),
};
