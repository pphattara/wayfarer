// components/FeedPost.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import type { Post } from '../types/social';

const { width } = Dimensions.get('window');
const MEDIA_HEIGHT = width * 0.75;

interface FeedPostProps {
  post: Post;
  onLike: (postId: string) => void;
  onUnlike: (postId: string) => void;
  onCommentPress: (postId: string) => void;
}

export function FeedPost({ post, onLike, onUnlike, onCommentPress }: FeedPostProps) {
  const handleLike = () => {
    post.user_has_liked ? onUnlike(post.id) : onLike(post.id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {post.author?.avatar_url ? (
            <Image source={{ uri: post.author.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {post.author?.display_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
        </View>
        <View>
          <Text style={styles.authorName}>{post.author?.display_name ?? 'Unknown'}</Text>
          {post.destination_name ? (
            <Text style={styles.destination}>{post.destination_name}</Text>
          ) : null}
        </View>
      </View>

      {/* Media */}
      {post.media_urls.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ height: MEDIA_HEIGHT }}
        >
          {post.media_urls.map((url, i) => (
            <Image
              key={i}
              source={{ uri: url }}
              style={{ width, height: MEDIA_HEIGHT }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="like-button"
          onPress={handleLike}
          style={styles.actionBtn}
          accessibilityLabel={post.user_has_liked ? 'Unlike post' : 'Like post'}
        >
          <Text style={[styles.actionIcon, post.user_has_liked && styles.likedIcon]}>
            {post.user_has_liked ? '♥' : '♡'}
          </Text>
          <Text style={styles.actionCount}>{post.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="comment-button"
          onPress={() => onCommentPress(post.id)}
          style={styles.actionBtn}
          accessibilityLabel="View comments"
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.comments_count}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 36, height: 36 },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F6E56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '700', fontSize: 16 },
  authorName: { fontSize: 14, fontWeight: '700', color: '#111' },
  destination: { fontSize: 12, color: '#888' },
  actions: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 20, color: '#555' },
  likedIcon: { color: '#e53935' },
  actionCount: { fontSize: 14, color: '#555' },
  caption: { paddingHorizontal: 12, paddingBottom: 12, fontSize: 14, color: '#111' },
});
