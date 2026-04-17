import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  increment,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const ACCENT = "#00e6e6";

export interface Post {
  id: string;
  uid: string;
  type: "text" | "video" | "youtube_video";
  content?: string;
  videoId?: string;
  title?: string;
  thumbnail?: string;
  authorName: string;
  authorPhotoURL?: string;
  likes: number;
  commentCount: number;
  createdAt: any;
}

function timeAgo(ts: any): string {
  if (!ts) return "";
  const ms   = ts.toDate ? ts.toDate().getTime() : ts;
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  post: Post;
  following?: Set<string>;
  onCommentPress?: (post: Post) => void;
}

export default function PostCard({ post, following, onCommentPress }: Props) {
  const uid           = auth.currentUser?.uid;
  const [liked, setLiked]         = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "posts", post.id, "likes", uid)).then((snap) => {
      setLiked(snap.exists());
    });
  }, [post.id, uid]);

  const toggleLike = useCallback(async () => {
    if (!uid) return;
    const likeRef = doc(db, "posts", post.id, "likes", uid);
    const postRef = doc(db, "posts", post.id);
    if (liked) {
      setLiked(false);
      setLikeCount(c => c - 1);
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likes: increment(-1) });
    } else {
      setLiked(true);
      setLikeCount(c => c + 1);
      await setDoc(likeRef, { uid, likedAt: serverTimestamp() });
      await updateDoc(postRef, { likes: increment(1) });
    }
  }, [liked, post.id, uid]);

  const isOwnPost   = uid === post.uid;
  const isFollowing = following?.has(post.uid) ?? false;

  const toggleFollow = useCallback(async () => {
    if (!uid || isOwnPost) return;
    setFollowBusy(true);
    try {
      const followRef   = doc(db, "users", uid,       "following", post.uid);
      const followerRef = doc(db, "users", post.uid,  "followers", uid);
      const authorRef   = doc(db, "users", post.uid);
      const meRef       = doc(db, "users", uid);
      if (isFollowing) {
        await deleteDoc(followRef);
        await deleteDoc(followerRef);
        await updateDoc(authorRef, { followersCount: increment(-1) });
        await updateDoc(meRef,     { followingCount: increment(-1) });
      } else {
        await setDoc(followRef,   { uid: post.uid, followedAt: serverTimestamp() });
        await setDoc(followerRef, { uid,            followedAt: serverTimestamp() });
        await updateDoc(authorRef, { followersCount: increment(1) });
        await updateDoc(meRef,     { followingCount: increment(1) });
      }
    } finally {
      setFollowBusy(false);
    }
  }, [uid, post.uid, isOwnPost, isFollowing]);

  const openVideo = useCallback(() => {
    if (post.videoId) {
      Linking.openURL(`https://www.youtube.com/watch?v=${post.videoId}`);
    }
  }, [post.videoId]);

  const initial = (post.authorName || "?")[0].toUpperCase();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        {post.authorPhotoURL ? (
          <Image source={{ uri: post.authorPhotoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>
        {!isOwnPost && following !== undefined && (
          followBusy
            ? <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />
            : (
              <Pressable onPress={toggleFollow} style={[styles.followBtn, isFollowing && styles.followBtnActive]}>
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            )
        )}
      </View>

      {/* Body */}
      {post.type === "text" && post.content ? (
        <Text style={styles.content}>{post.content}</Text>
      ) : (post.type === "video" || post.type === "youtube_video") && post.videoId ? (
        <Pressable onPress={openVideo} style={styles.videoWrap}>
          <Image
            source={{ uri: post.thumbnail || `https://img.youtube.com/vi/${post.videoId}/mqdefault.jpg` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
          </View>
          {post.title ? <Text style={styles.videoTitle} numberOfLines={2}>{post.title}</Text> : null}
        </Pressable>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.footerBtn} onPress={toggleLike}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#ff6b6b" : "#555"} />
          {likeCount > 0 && <Text style={[styles.footerCount, liked && { color: "#ff6b6b" }]}>{likeCount}</Text>}
        </Pressable>
        {onCommentPress && (
          <Pressable style={styles.footerBtn} onPress={() => onCommentPress(post)}>
            <Ionicons name="chatbubble-outline" size={18} color="#555" />
            {post.commentCount > 0 && <Text style={styles.footerCount}>{post.commentCount}</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:          { backgroundColor: "#111", borderRadius: 10, marginHorizontal: 12, marginVertical: 5, overflow: "hidden" },
  header:        { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  avatar:        { width: 36, height: 36, borderRadius: 18 },
  avatarFallback:{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1e1e1e", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: ACCENT, fontWeight: "700", fontSize: 15 },
  headerText:    { flex: 1 },
  authorName:    { color: "#e8f1f2", fontWeight: "600", fontSize: 14 },
  time:          { color: "#444", fontSize: 11, marginTop: 1 },
  content:       { color: "#c8d8d9", fontSize: 14, lineHeight: 20, paddingHorizontal: 12, paddingBottom: 12 },
  videoWrap:     { position: "relative" },
  thumbnail:     { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#0a0a0a" },
  playOverlay:   { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  videoTitle:    { color: "#c8d8d9", fontSize: 13, padding: 10, lineHeight: 18 },
  footer:        { flexDirection: "row", gap: 16, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#1a1a1a" },
  footerBtn:     { flexDirection: "row", alignItems: "center", gap: 5 },
  footerCount:       { color: "#555", fontSize: 13 },
  followBtn:         { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: ACCENT },
  followBtnActive:   { backgroundColor: "rgba(0,230,230,0.12)" },
  followBtnText:     { color: ACCENT, fontSize: 12, fontWeight: "600" },
  followBtnTextActive: { color: ACCENT },
});
