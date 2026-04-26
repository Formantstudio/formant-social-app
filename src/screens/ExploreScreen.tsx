import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import PostCard, { Post } from "../components/PostCard";
import AdCard from "../components/AdCard";
import { useFollowing } from "../hooks/useFollowing";
import { normalizePost } from "../lib/normalizePost";

const ACCENT = "#00e6e6";
type Mode = "trending" | "new";
type FeedItem = Post | { id: string; type: "ad" };

function injectAds(posts: Post[]): FeedItem[] {
  const result: FeedItem[] = [];
  let adCount = 0;
  posts.forEach((post, i) => {
    result.push(post);
    if ((i + 1) % 5 === 0) result.push({ id: `ad-${adCount++}`, type: "ad" });
  });
  return result;
}

export default function ExploreScreen() {
  const [mode,      setMode]      = useState<Mode>("trending");
  const [items,     setItems]     = useState<FeedItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const currentUid = auth.currentUser?.uid ?? null;
  const following  = useFollowing(currentUid);

  useEffect(() => {
    setLoading(true);
    const q = mode === "trending"
      ? query(collection(db, "posts"), orderBy("likes", "desc"),     limit(50))
      : query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));

    const unsub = onSnapshot(q, (snap) => {
      const posts = snap.docs.map(d => normalizePost({ id: d.id, ...d.data() }));
      setItems(injectAds(posts));
      setLoading(false);
    });
    return unsub;
  }, [mode]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Explore</Text>
        <View style={styles.segmented}>
          <Pressable
            style={[styles.seg, mode === "trending" && styles.segActive]}
            onPress={() => setMode("trending")}
          >
            <Text style={[styles.segText, mode === "trending" && styles.segTextActive]}>
              🔥 Trending
            </Text>
          </Pressable>
          <Pressable
            style={[styles.seg, mode === "new" && styles.segActive]}
            onPress={() => setMode("new")}
          >
            <Text style={[styles.segText, mode === "new" && styles.segTextActive]}>
              ✨ New
            </Text>
          </Pressable>
        </View>
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>
        : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            renderItem={({ item }) =>
              item.type === "ad"
                ? <AdCard />
                : <PostCard post={item as Post} following={following} />
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#0a0a0a" },
  center:        { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar:        { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", gap: 12 },
  topBarTitle:   { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  segmented:     { flexDirection: "row", backgroundColor: "#111", borderRadius: 8, padding: 3, gap: 2 },
  seg:           { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: "center" },
  segActive:     { backgroundColor: "#1e1e1e" },
  segText:       { color: "#444", fontSize: 13, fontWeight: "600" },
  segTextActive: { color: "#e8f1f2" },
  list:          { paddingVertical: 8, paddingBottom: 32 },
});
