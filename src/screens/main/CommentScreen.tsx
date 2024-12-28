// src/screens/main/CommentScreen.tsx
import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useComments } from '../../hooks/useComments';
import { CommentCard } from '../../components/CommentCard';
import { CommentInput } from '../../components/CommentInput';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Comments'>;

export const CommentScreen = ({ route }: Props) => {
  const { postId } = route.params;
  const { comments, loading, addComment, deleteComment } = useComments(postId);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {loading ? (
          <ActivityIndicator style={styles.loading} color="#007AFF" />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CommentCard
                comment={item}
                onDelete={deleteComment}
              />
            )}
            contentContainerStyle={styles.commentsList}
          />
        )}
        <CommentInput onSubmit={addComment} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  commentsList: {
    padding: 16,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
