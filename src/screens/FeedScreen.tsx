import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import PostCard, { Post } from "../components/PostCard";
import AdCard from "../components/AdCard";
import LogoStamp from "../components/LogoStamp";
import { useFollowing } from "../hooks/useFollowing";

type FeedItem = Post | { id: string; type: "ad" };

/** Inserts ad placeholders at randomized intervals (every 3–6 posts). */
function injectAds(posts: Post[]): FeedItem[] {
  const result: FeedItem[] = [];
  let nextAd = 3 + Math.floor(Math.random() * 3); // first ad after 3–5 posts
  let adCount = 0;
  posts.forEach((post, i) => {
    result.push(post);
    if (i + 1 === nextAd) {
      result.push({ id: `ad-${adCount++}`, type: "ad" });
      nextAd += 3 + Math.floor(Math.random() * 4); // next gap: 3–6
    }
  });
  return result;
}

export default function FeedScreen() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const currentUid = auth.currentUser?.uid ?? null;
  const following  = useFollowing(currentUid);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
      setFeedItems(injectAds(posts));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#00e6e6" /></View>;
  }

  if (!feedItems.length) {
    return <View style={styles.center}><Text style={styles.empty}>No posts yet. Check back soon.</Text></View>;
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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#0a0a0a" },
  center:      { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center" },
  empty:       { color: "#444", fontSize: 14 },
  topBar:      { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 10 },
  topBarTitle: { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  list:        { paddingVertical: 8, paddingBottom: 32 },
});
