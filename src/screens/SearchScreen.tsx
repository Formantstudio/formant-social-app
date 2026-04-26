import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useFollowing } from "../hooks/useFollowing";
import { toggleFollow } from "../lib/followUser";
import AdCard from "../components/AdCard";
import { RootStackParamList } from "../navigation/AppNavigator";

const ACCENT = "#00e6e6";

interface UserResult {
  uid:            string;
  displayName:    string;
  photoURL:       string | null;
  followersCount: number;
  isSystemAccount?: boolean;
}

type SearchItem = UserResult | { uid: string; _adSlot: true };

function buildSearchItems(users: UserResult[]): SearchItem[] {
  const items: SearchItem[] = [];
  users.forEach((u, i) => {
    items.push(u);
    if (i === 4) items.push({ uid: "ad-search", _adSlot: true });
  });
  return items;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export default function SearchScreen() {
  const navigation  = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const currentUid  = auth.currentUser?.uid ?? null;
  const following   = useFollowing(currentUid);

  const [queryText, setQueryText] = useState("");
  const [results,   setResults]   = useState<UserResult[]>([]);
  const [listItems, setListItems] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched,  setSearched]  = useState(false);
  const [followBusy, setFollowBusy] = useState<Record<string, boolean>>({});

  const runSearch = useCallback(async (text: string) => {
    const t = text.trim().toLowerCase();
    if (!t) { setResults([]); setListItems([]); setSearched(false); return; }
    setSearching(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "users"),
          where("displayName_lower", ">=", t),
          where("displayName_lower", "<=", t + ""),
          orderBy("displayName_lower"),
          limit(20),
        )
      );
      const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserResult));
      setResults(users);
      setListItems(buildSearchItems(users));
      setSearched(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = useCallback((text: string) => {
    setQueryText(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(text), 300);
  }, [runSearch]);

  const handleFollow = useCallback(async (uid: string) => {
    if (!currentUid) return;
    setFollowBusy(b => ({ ...b, [uid]: true }));
    try {
      await toggleFollow(currentUid, uid, following.has(uid));
    } finally {
      setFollowBusy(b => ({ ...b, [uid]: false }));
    }
  }, [currentUid, following]);

  function renderItem({ item }: { item: SearchItem }) {
    if ("_adSlot" in item) return <AdCard />;

    const initial     = (item.displayName || "?")[0].toUpperCase();
    const isOwn       = item.uid === currentUid;
    const isFollowing = following.has(item.uid);
    const busy        = followBusy[item.uid];

    return (
      <Pressable
        style={styles.row}
        onPress={() => navigation.push("UserProfile", { uid: item.uid })}
      >
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View style={styles.rowText}>
          <Text style={styles.name}>{item.displayName}</Text>
          <Text style={styles.followers}>{item.followersCount ?? 0} followers</Text>
        </View>
        {!isOwn && (
          busy
            ? <ActivityIndicator size="small" color={ACCENT} />
            : (
              <Pressable
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={() => handleFollow(item.uid)}
              >
                <Text style={styles.followBtnText}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            )
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#444" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people…"
            placeholderTextColor="#444"
            value={queryText}
            onChangeText={handleChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => runSearch(queryText)}
          />
          {queryText.length > 0 && (
            <Pressable onPress={() => { setQueryText(""); setResults([]); setListItems([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={16} color="#444" />
            </Pressable>
          )}
        </View>
      </View>

      {searching && <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />}

      {!searching && searched && results.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.empty}>No users found for "{queryText}"</Text>
        </View>
      )}

      {!searching && !searched && queryText.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="search" size={40} color="#1e1e1e" />
          <Text style={styles.empty}>Search by display name</Text>
        </View>
      )}

      <FlatList
        data={listItems}
        keyExtractor={r => r.uid}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:          { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  searchBox:       { flexDirection: "row", alignItems: "center", backgroundColor: "#111", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: "#1e1e1e" },
  searchInput:     { flex: 1, color: "#e8f1f2", fontSize: 15 },
  center:          { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  empty:           { color: "#333", fontSize: 14 },
  row:             { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#111", gap: 12 },
  avatar:          { width: 44, height: 44, borderRadius: 22 },
  avatarFallback:  { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1e1e1e", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial:   { color: ACCENT, fontWeight: "700", fontSize: 16 },
  rowText:         { flex: 1 },
  name:            { color: "#e8f1f2", fontWeight: "600", fontSize: 15 },
  followers:       { color: "#444", fontSize: 12, marginTop: 2 },
  followBtn:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: ACCENT },
  followBtnActive: { backgroundColor: "rgba(0,230,230,0.12)" },
  followBtnText:   { color: ACCENT, fontSize: 13, fontWeight: "600" },
});
