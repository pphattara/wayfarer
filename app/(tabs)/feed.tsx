// app/(tabs)/feed.tsx
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFeed, fetchComments, addComment } from '../../hooks/useFeed';
import { FeedPost } from '../../components/FeedPost';
import type { Post, PostComment } from '../../types/social';
import { supabase } from '../../lib/supabase';

export default function FeedScreen() {
  const { posts, loading, loadingMore, hasMore, refresh, loadMore, likePost, unlikePost } = useFeed();
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openComments = useCallback(async (postId: string) => {
    setCommentPostId(postId);
    const data = await fetchComments(postId);
    setComments(data);
  }, []);

  const submitComment = async () => {
    if (!commentText.trim() || !commentPostId) return;
    setSubmitting(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await addComment(commentPostId, data.user.id, commentText.trim());
      const updated = await fetchComments(commentPostId);
      setComments(updated);
      setCommentText('');
    }
    setSubmitting(false);
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <FeedPost
        post={item}
        onLike={likePost}
        onUnlike={unlikePost}
        onCommentPress={openComments}
      />
    ),
    [likePost, unlikePost, openComments]
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ padding: 16 }} color="#0F6E56" />;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F6E56" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#0F6E56" />
        }
        onEndReached={() => { if (hasMore) loadMore(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share your trip</Text>
          </View>
        }
      />

      {/* Comments modal */}
      <Modal
        visible={commentPostId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommentPostId(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={() => setCommentPostId(null)} accessibilityLabel="Close comments">
              <Text style={styles.closeBtn}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Text style={styles.commentAuthor}>{item.author?.display_name}</Text>
                <Text style={styles.commentBody}>{item.body}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.noComments}>No comments yet</Text>}
            style={{ flex: 1 }}
          />
          <View style={styles.commentInput}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment…"
              value={commentText}
              onChangeText={setCommentText}
              returnKeyType="send"
              onSubmitEditing={submitComment}
              accessibilityLabel="Comment input"
            />
            <TouchableOpacity onPress={submitComment} disabled={submitting} accessibilityLabel="Post comment">
              <Text style={[styles.sendBtn, submitting && { opacity: 0.4 }]}>Post</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  closeBtn: { color: '#0F6E56', fontSize: 17, fontWeight: '600' },
  comment: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  commentAuthor: { fontWeight: '600', fontSize: 13 },
  commentBody: { fontSize: 14, color: '#333' },
  noComments: { textAlign: 'center', padding: 32, color: '#888' },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: { color: '#0F6E56', fontWeight: '600', fontSize: 15 },
});
