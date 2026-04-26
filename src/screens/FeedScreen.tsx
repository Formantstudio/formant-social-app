import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import PostCard, { Post } from "../components/PostCard";
import AdCard from "../components/AdCard";
import LogoStamp from "../components/LogoStamp";
import { useFollowing } from "../hooks/useFollowing";
import { normalizePost } from "../lib/normalizePost";
import { ALL_PET_UIDS } from "../lib/petUsers";
import { TYLER_UID } from "../lib/constants";
import { RootStackParamList } from "../navigation/AppNavigator";

type FeedItem = Post | { id: string; type: "ad" };

function injectAds(posts: Post[]): FeedItem[] {
  const result: FeedItem[] = [];
  let nextAd = 3 + Math.floor(Math.random() * 3);
  let adCount = 0;
  posts.forEach((post, i) => {
    result.push(post);
    if (i + 1 === nextAd) {
      result.push({ id: `ad-${adCount++}`, type: "ad" });
      nextAd += 3 + Math.floor(Math.random() * 4);
    }
  });
  return result;
}

const ALWAYS_SHOW = new Set([TYLER_UID, ...ALL_PET_UIDS]);

export default function FeedScreen() {
  const navigation  = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const currentUid  = auth.currentUser?.uid ?? null;
  const following   = useFollowing(currentUid);
  const { width }   = useWindowDimensions();
  const isTablet    = width >= 600;
  const feedWidth   = isTablet ? Math.min(width, 680) : width;

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    const unsub = onSnapshot(q, (snap) => {
      const allPosts = snap.docs.map(d => normalizePost({ id: d.id, ...d.data() }));

      // Follow-based filter: always show Tyler + pets, plus anyone you follow
      const filtered = allPosts.filter(p =>
        ALWAYS_SHOW.has(p.uid) ||
        (currentUid && following.has(p.uid)) ||
        (currentUid && p.uid === currentUid),
      );

      setFeedItems(injectAds(filtered.length > 0 ? filtered : allPosts.slice(0, 20)));
      setLoading(false);
    });
    return unsub;
  }, [following, currentUid]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00e6e6" /></View>;
  }

  if (!feedItems.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Follow some people to fill your feed.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <LogoStamp size={36} />
        <Text style={styles.topBarTitle}>Formant Social</Text>
      </View>
      <FlatList
        data={feedItems}
        keyExtractor={item => item.id}
        renderItem={({ item }) =>
          item.type === "ad"
            ? <AdCard />
            : <PostCard post={item as Post} following={following} />
        }
        contentContainerStyle={[styles.list, isTablet && { alignSelf: "center", width: feedWidth }]}
        showsVerticalScrollIndicator={false}
        style={isTablet && { alignSelf: "center", width: feedWidth }}
      />

      {/* FAB — Create Post */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.push("CreatePost")}
      >
        <Ionicons name="add" size={28} color="#0a0a0a" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#0a0a0a" },
  center:      { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  empty:       { color: "#444", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  topBar:      { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 10 },
  topBarTitle: { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  list:        { paddingVertical: 8, paddingBottom: 80 },
  fab:         { position: "absolute", bottom: 24, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: "#00e6e6", justifyContent: "center", alignItems: "center", elevation: 6, shadowColor: "#00e6e6", shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
});
