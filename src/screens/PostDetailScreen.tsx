import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useComments, Comment } from "../hooks/useComments";
import { useUserProfile } from "../hooks/useUserProfile";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "PostDetail">;

const ACCENT = "#00e6e6";
const MAX_COMMENT = 500;

function timeAgo(ts: any): string {
  if (!ts) return "";
  const ms   = ts.toDate ? ts.toDate().getTime() : typeof ts === "number" ? ts : Date.now();
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function CommentRow({ comment }: { comment: Comment }) {
  const initial = (comment.authorName || "?")[0].toUpperCase();
  return (
    <View style={styles.commentRow}>
      {comment.authorPhotoURL ? (
        <Image source={{ uri: comment.authorPhotoURL }} style={styles.commentAvatar} />
      ) : (
        <View style={styles.commentAvatarFallback}>
          <Text style={styles.commentAvatarInitial}>{initial}</Text>
        </View>
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
}

export default function PostDetailScreen({ route, navigation }: Props) {
  const { post } = route.params;
  const currentUid = auth.currentUser?.uid ?? null;
  const { profile } = useUserProfile(currentUid);
  const { comments, loading: commentsLoading } = useComments(post.id);

  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const inputRef = useRef<TextInput>(null);

  const submitComment = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUid || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        authorId:       currentUid,
        authorName:     profile?.displayName || "User",
        authorPhotoURL: profile?.photoURL    || "",
        text:           trimmed,
        createdAt:      serverTimestamp(),
      });
      await updateDoc(doc(db, "posts", post.id), { commentCount: increment(1) });
      setText("");
    } catch (e) {
      console.error("Comment failed:", e);
    } finally {
      setSending(false);
    }
  }, [text, currentUid, sending, post.id, profile]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#e8f1f2" />
        </Pressable>
        <Text style={styles.topBarTitle}>Post</Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={c => c.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <PostCard post={post} disablePostTap />
            <AdCard />
            <Text style={styles.commentsLabel}>Comments</Text>
            {commentsLoading && (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
            )}
            {!commentsLoading && comments.length === 0 && (
              <Text style={styles.empty}>No comments yet. Be the first.</Text>
            )}
          </View>
        }
        renderItem={({ item }) => <CommentRow comment={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Comment input */}
      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Write a comment…"
          placeholderTextColor="#444"
          value={text}
          onChangeText={t => setText(t.slice(0, MAX_COMMENT))}
          multiline
          maxLength={MAX_COMMENT}
        />
        <Pressable
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={submitComment}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#0a0a0a" />
            : <Ionicons name="send" size={18} color="#0a0a0a" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:                  { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:                { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 12 },
  topBarTitle:           { color: "#e8f1f2", fontSize: 16, fontWeight: "700" },
  back:                  { padding: 4 },
  list:                  { paddingBottom: 8 },
  commentsLabel:         { color: "#444", fontSize: 12, fontWeight: "600", marginHorizontal: 14, marginTop: 20, marginBottom: 4, letterSpacing: 0.8, textTransform: "uppercase" },
  empty:                 { color: "#444", fontSize: 13, marginHorizontal: 14, marginVertical: 12 },
  commentRow:            { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#111" },
  commentAvatar:         { width: 32, height: 32, borderRadius: 16, marginTop: 2 },
  commentAvatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1e1e1e", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center", marginTop: 2 },
  commentAvatarInitial:  { color: ACCENT, fontSize: 13, fontWeight: "700" },
  commentBody:           { flex: 1 },
  commentMeta:           { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 3 },
  commentAuthor:         { color: "#e8f1f2", fontWeight: "600", fontSize: 13 },
  commentTime:           { color: "#444", fontSize: 11 },
  commentText:           { color: "#c8d8d9", fontSize: 14, lineHeight: 19 },
  inputBar:              { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#1a1a1a", backgroundColor: "#0a0a0a" },
  input:                 { flex: 1, backgroundColor: "#111", color: "#e8f1f2", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, maxHeight: 100 },
  sendBtn:               { width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled:       { backgroundColor: "#1a1a1a" },
});
