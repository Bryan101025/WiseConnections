// src/components/shared/LoadingOverlay.tsx
import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
} from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  cancelable?: boolean;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text,
  cancelable = false,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        if (cancelable && onCancel) {
          onCancel();
        }
      }}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#007AFF" />
          {text && <Text style={styles.text}>{text}</Text>}
          {cancelable && onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  text: {
    marginTop: 16,
    color: '#000',
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
