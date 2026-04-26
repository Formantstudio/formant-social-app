import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useUserProfile } from "../hooks/useUserProfile";
import { useFollowing } from "../hooks/useFollowing";
import { useUserPosts } from "../hooks/useUserPosts";
import { toggleFollow } from "../lib/followUser";
import { trackEvent } from "../lib/telemetry";
import PostCard, { Post } from "../components/PostCard";
import AdCard from "../components/AdCard";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

const ACCENT = "#00e6e6";

type FeedItem = Post | { id: string; type: "ad" };

function injectAd(posts: Post[]): FeedItem[] {
  const result: FeedItem[] = [];
  posts.forEach((post, i) => {
    result.push(post);
    if (i === 4) result.push({ id: "ad-profile", type: "ad" });
  });
  return result;
}

export default function UserProfileScreen({ route, navigation }: Props) {
  const { uid } = route.params;
  const currentUid = auth.currentUser?.uid ?? null;

  // If viewing own profile, redirect
  if (currentUid && uid === currentUid) {
    navigation.replace("Main");
    return null;
  }

  const { profile, loading: profileLoading } = useUserProfile(uid);
  const following   = useFollowing(currentUid);
  const { posts, loading: postsLoading } = useUserPosts(uid);
  const [followBusy, setFollowBusy] = useState(false);

  const isFollowing = following.has(uid);
  const feedItems   = injectAd(posts);

  const handleFollow = useCallback(async () => {
    if (!currentUid) return;
    setFollowBusy(true);
    try {
      await toggleFollow(currentUid, uid, isFollowing);
      if (!isFollowing) trackEvent("follow", { targetUid: uid });
    } finally {
      setFollowBusy(false);
    }
  }, [currentUid, uid, isFollowing]);

  const reportUser = useCallback(() => {
    if (!currentUid) return;
    const doReport = async (reason: string) => {
      await addDoc(collection(db, "reports"), {
        type: "user",
        reportedUid: uid,
        reportedBy: currentUid,
        reason,
        createdAt: serverTimestamp(),
      });
      trackEvent("report_user", { reportedUid: uid, reason });
      Alert.alert("Reported", "Thanks — we'll review this account.");
    };
    Alert.alert("Report User", "Why are you reporting this account?", [
      { text: "Spam / Bot",         onPress: () => doReport("spam") },
      { text: "Hate / Harassment",  onPress: () => doReport("harassment") },
      { text: "Impersonation",      onPress: () => doReport("impersonation") },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [currentUid, uid]);

  const initial = (profile?.displayName || "?")[0].toUpperCase();
  const isSystem = (profile as any)?.isSystemAccount === true;

  const Header = (
    <View style={styles.header}>
      <View style={styles.avatarWrap}>
        {profile?.photoURL ? (
          <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
      </View>

      <Text style={styles.displayName}>{profile?.displayName || "—"}</Text>

      {isSystem && (
        <View style={styles.badge}>
          <Ionicons name="musical-notes" size={12} color={ACCENT} />
          <Text style={styles.badgeText}>Formant Channel</Text>
        </View>
      )}

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{profile?.followingCount ?? 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{profile?.followersCount ?? 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
      </View>

      {!isSystem && currentUid && (
        followBusy
          ? <ActivityIndicator color={ACCENT} style={{ marginTop: 16 }} />
          : (
            <Pressable
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={handleFollow}
            >
              <Text style={styles.followBtnText}>
                {isFollowing ? "Following ✓" : "Follow"}
              </Text>
            </Pressable>
          )
      )}

      <Text style={styles.sectionLabel}>Posts</Text>
    </View>
  );

  if (profileLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color="#e8f1f2" />
          </Pressable>
          <Text style={styles.topBarTitle} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#e8f1f2" />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {profile?.displayName || "Profile"}
        </Text>
        {currentUid && (
          <Pressable onPress={reportUser} style={styles.overflow}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#555" />
          </Pressable>
        )}
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={item => item.id}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          postsLoading
            ? <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
            : <Text style={styles.empty}>No posts yet.</Text>
        }
        renderItem={({ item }) =>
          item.type === "ad"
            ? <AdCard />
            : <PostCard post={item as Post} following={following} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Banner ad pinned bottom */}
      <View style={styles.bannerWrap}>
        <AdCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:           { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 12 },
  topBarTitle:      { color: "#e8f1f2", fontSize: 16, fontWeight: "700", flex: 1 },
  back:             { padding: 4 },
  overflow:         { padding: 4 },
  center:           { flex: 1, justifyContent: "center", alignItems: "center" },
  header:           { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 },
  avatarWrap:       { marginBottom: 14 },
  avatar:           { width: 88, height: 88, borderRadius: 44 },
  avatarFallback:   { width: 88, height: 88, borderRadius: 44, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial:    { color: ACCENT, fontSize: 32, fontWeight: "700" },
  displayName:      { color: "#e8f1f2", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  badge:            { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,230,230,0.1)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 12 },
  badgeText:        { color: ACCENT, fontSize: 12, fontWeight: "600" },
  statRow:          { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 10 },
  stat:             { alignItems: "center" },
  statNum:          { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  statLabel:        { color: "#555", fontSize: 12, marginTop: 2 },
  statDivider:      { width: 1, height: 32, backgroundColor: "#1a1a1a" },
  followBtn:        { marginTop: 16, paddingHorizontal: 32, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: ACCENT },
  followBtnActive:  { backgroundColor: "rgba(0,230,230,0.12)" },
  followBtnText:    { color: ACCENT, fontSize: 14, fontWeight: "600" },
  sectionLabel:     { color: "#444", fontSize: 12, fontWeight: "600", marginTop: 24, alignSelf: "flex-start", letterSpacing: 0.8, textTransform: "uppercase" },
  empty:            { color: "#444", fontSize: 14, textAlign: "center", marginTop: 40 },
  list:             { paddingBottom: 80 },
  bannerWrap:       { position: "absolute", bottom: 0, left: 0, right: 0 },
});
