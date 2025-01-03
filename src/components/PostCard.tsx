// src/components/PostCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { usePostInteractions } from '../hooks/usePostInteractions';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    created_at: string;
    likes_count: number;
    comments_count: number;
    is_liked?: boolean;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      profile_photo_url?: string;
    };
  };
}

export const PostCard = ({ post }: PostCardProps) => {
  const navigation = useNavigation();
  const { loading, toggleLike } = usePostInteractions();
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [localLikeCount, setLocalLikeCount] = useState(post.likes_count);

  const handleProfilePress = () => {
    navigation.navigate('Profile', { userId: post.user.id });
  };

  const handleCommentsPress = () => {
    navigation.navigate('Comments', { postId: post.id });
  };

  const handleLikePress = async () => {
    if (loading[post.id]) return;
    
    // Optimistic update
    setIsLiked(!isLiked);
    setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    const { error } = await toggleLike(post.id);
    if (error) {
      // Revert on error
      setIsLiked(isLiked);
      setLocalLikeCount(post.likes_count);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={handleProfilePress}
      >
        <Image
          style={styles.avatar}
          source={
            post.user.profile_photo_url
              ? { uri: post.user.profile_photo_url }
              : require('../assets/default-avatar.png')
          }
        />
        <View style={styles.headerText}>
          <Text style={styles.userName}>
            {post.user.first_name} {post.user.last_name}
          </Text>
          <Text style={styles.timeAgo}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLikePress}
          disabled={loading[post.id]}
        >
          {loading[post.id] ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Icon 
                name={isLiked ? "heart" : "heart-outline"}
                size={20} 
                color={isLiked ? "#FF3B30" : "#666"}
              />
              <Text style={[
                styles.actionText,
                isLiked && styles.actionTextLiked
              ]}>
                {localLikeCount}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleCommentsPress}
        >
          <Icon 
            name="chatbubble-outline" 
            size={20} 
            color="#666" 
          />
          <Text style={styles.actionText}>
            {post.comments_count}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F2F2F7',
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  timeAgo: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    minWidth: 45,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  actionTextLiked: {
    color: '#FF3B30',
  },
});

export default PostCard;
