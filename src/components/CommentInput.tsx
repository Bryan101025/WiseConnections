// src/components/CommentInput.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<{ data: any; error: string | null }>;
}

export const CommentInput = ({ onSubmit }: CommentInputProps) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    Keyboard.dismiss();

    try {
      const { error } = await onSubmit(content.trim());
      if (!error) {
        setContent(''); // Clear input on success
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Write a comment..."
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={500}
        editable={!submitting}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        blurOnSubmit={true}
        enablesReturnKeyAutomatically={true}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!content.trim() || submitting) && styles.sendButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!content.trim() || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Icon 
            name="send" 
            size={20} 
            color={!content.trim() ? '#A0A0A0' : '#FFFFFF'} 
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 40,
    fontSize: 16,
    ...Platform.select({
      ios: {
        paddingTop: 8,
        paddingBottom: 8,
      },
      android: {
        paddingTop: 4,
        paddingBottom: 4,
      },
    }),
  },
  sendButton: {
    position: 'absolute',
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
});
