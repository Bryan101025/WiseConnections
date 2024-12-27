// src/screens/main/HomeScreen.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

type Post = {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
};

const HomeScreen = () => {
  const [posts, setPosts] = React.useState<Post[]>([
    {
      id: '1',
      user: { name: 'Jane Smith' },
      content: 'Just joined a new book club at the Beach Library! Anyone else interested in joining?',
      timestamp: '2h ago',
      likes: 5,
      comments: 2,
    },
    // Add more sample posts
  ]);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.avatar} />
        <View>
          <Text style={styles.userName}>{item.user.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
      <Text style={styles.content}>{item.content}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text>{item.likes} Likes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text>{item.comments} Comments</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // ... styles similar to your UI
});

export default HomeScreen;
