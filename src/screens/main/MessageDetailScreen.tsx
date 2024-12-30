// src/screens/main/MessageDetailScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { supabase } from '../../config/supabase';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { ErrorView } from '../../components/shared/ErrorView';
import { useNetworkError } from '../../hooks/useNetworkError';
import { LoadingPlaceholder, SkeletonPresets } from '../../components/shared/LoadingPlaceholder';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  rich_content?: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

const MessageBubble = ({ message, isOwnMessage, index }) => {
  const slideAnim = new Animated.Value(50);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {!isOwnMessage && (
        <Image
          source={
            message.sender.profile_photo_url
              ? { uri: message.sender.profile_photo_url }
              : require('../../assets/default-avatar.png')
          }
          style={styles.avatar}
        />
      )}
      <View style={[
        styles.messageContent,
        isOwnMessage ? styles.ownMessageContent : styles.otherMessageContent,
      ]}>
        {message.rich_content ? (
          <View style={styles.richTextContainer}>
            <RichEditor
              disabled
              initialContentHTML={message.rich_content}
              containerStyle={styles.richTextView}
              placeholder=""
            />
          </View>
        ) : (
          <Text style={styles.messageText}>{message.content}</Text>
        )}
        <Text style={styles.timestamp}>
          {format(new Date(message.created_at), 'h:mm a')}
        </Text>
      </View>
    </Animated.View>
  );
};

const MessageDetailScreen = ({ route, navigation }) => {
  const { conversationId, recipientName } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, handleError, clearError } = useNetworkError();
  const richText = useRef();
  const scrollView = useRef();

  const fetchMessages = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(data || []);

      // Mark messages as read
      const unreadMessages = data?.filter(
        msg => !msg.read && msg.sender_id !== userData.user.id
      ) || [];

      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadMessages.map(msg => msg.id));
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching messages';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sendMessage = async () => {
    try {
      const content = await richText.current?.getContentHtml();
      if (!content?.trim()) return;

      setSending(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userData.user.id,
          content: content.replace(/<[^>]*>/g, ''), // Plain text version
          rich_content: content,
          read: false,
        });

      if (sendError) throw sendError;

      richText.current?.setContentHTML('');
      await fetchMessages();
      scrollView.current?.scrollToEnd({ animated: true });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error sending message';
      setError(errorMessage);
      handleError(err);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  if (!isOnline) {
    return (
      <ErrorView
        error="No internet connection. Please check your network and try again."
        icon="cloud-offline-outline"
        onRetry={() => fetchMessages()}
      />
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        {[1, 2, 3].map((_, index) => (
                      <View key={index} style={styles.skeletonMessage}>
              <SkeletonPresets.Avatar style={styles.skeletonAvatar} />
              <View style={styles.skeletonContent}>
                <SkeletonPresets.Text style={styles.skeletonText} />
                <SkeletonPresets.Text style={styles.skeletonTimestamp} />
              </View>
            </View>
          ))}
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollView}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchMessages(true)}
              tintColor="#007AFF"
            />
          }
        >
          {messages.map((message, index) => {
            const { data: userData } = supabase.auth.getUser();
            const isOwnMessage = message.sender_id === userData?.user?.id;
            
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={isOwnMessage}
                index={index}
              />
            );
          })}
        </ScrollView>

        <View style={styles.composerContainer}>
          <RichToolbar
            editor={richText}
            actions={[
              actions.setBold,
              actions.setItalic,
              actions.setUnderline,
              actions.insertBulletsList,
              actions.insertOrderedList,
              actions.undo,
              actions.redo,
            ]}
            iconTint="#666"
            selectedIconTint="#007AFF"
            style={styles.toolbar}
          />
          <View style={styles.inputContainer}>
            <RichEditor
              ref={richText}
              placeholder="Type your message..."
              initialHeight={100}
              containerStyle={styles.richEditor}
              editorStyle={{
                backgroundColor: '#fff',
                contentCSSText: 'font-size: 16px; color: #000;',
              }}
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendingButton]}
              onPress={sendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Icon name="send" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F2F2F7',
  },
  skeletonMessage: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  skeletonContent: {
    flex: 1,
    maxWidth: '70%',
  },
  skeletonText: {
    height: 16,
    marginBottom: 4,
    borderRadius: 8,
  },
  skeletonTimestamp: {
    height: 12,
    width: 60,
    alignSelf: 'flex-end',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    padding: 12,
    borderRadius: 16,
  },
  ownMessageContent: {
    backgroundColor: '#007AFF',
  },
  otherMessageContent: {
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  composerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  toolbar: {
    backgroundColor: '#F8F8F8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
  },
  richEditor: {
    flex: 1,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    maxHeight: 150,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingButton: {
    opacity: 0.7,
  },
  richTextContainer: {
    minHeight: 20,
  },
  richTextView: {
    backgroundColor: 'transparent',
  },
});

export default MessageDetailScreen;

