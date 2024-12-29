// src/components/shared/LoadingPlaceholder.tsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LoadingPlaceholderProps {
  text?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingPlaceholder: React.FC<LoadingPlaceholderProps> = ({
  text,
  size = 'large',
  color = '#007AFF'
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
});
