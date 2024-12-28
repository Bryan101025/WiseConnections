// src/components/CommentCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import type { Comment } from '../hooks/useComments';

interface CommentCardProps {
  comment: Comment;
  onDelete?: (commentId: string) => Promise<{ error: string | null }>;
}

export const CommentCard = ({ comment, onDelete }: CommentCardProps) => {
  const navigation = useNavigation();

  const handleLongPress = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user?.id === comment.user.id && onDelete) {
      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete this comment?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const { error } = await onDelete(comment.id);
              if (error) {
                Alert.alert('Error', error);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <TouchableOpacity 
  style={styles.userInfo}
  onPress={() => navigation.navigate('Profile', { userId: comment.user.id })}
      >
        <Image
          style={styles.avatar}
          source={
            comment.user.profile_photo_url
              ? { uri: comment.user.profile_photo_url }
              : require('../assets/default-avatar.png')
          }
        />
        <View style={styles.userText}>
          <Text style={styles.userName}>
            {comment.user.first_name} {comment.user.last_name}
          </Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>
      <Text style={styles.content}>{comment.content}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F2F2F7',
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
    paddingLeft: 40,
  },
});
