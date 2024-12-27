// src/components/ScreenTemplate.tsx
import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';

type ScreenTemplateProps = {
  children: React.ReactNode;
  style?: object;
};

export const ScreenTemplate: React.FC<ScreenTemplateProps> = ({ children, style }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
});
