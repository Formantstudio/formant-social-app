import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { signOut, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { auth, db, storage } from "../lib/firebase";
import { useAuthState } from "../hooks/useAuthState";
import { useUserProfile } from "../hooks/useUserProfile";
import LogoStamp from "../components/LogoStamp";

const ACCENT = "#00e6e6";

export default function ProfileScreen() {
  const { user }            = useAuthState();
  const { profile }         = useUserProfile(user?.uid ?? null);
  const [uploading, setUploading] = useState(false);

  // Firestore is source of truth; fall back to Firebase Auth in case Firestore write lagged
  const photoURL  = profile?.photoURL  || user?.photoURL  || null;
  const displayName = profile?.displayName || user?.displayName || null;
  const initial   = (displayName || user?.email || "?")[0].toUpperCase();

  async function changePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const u = auth.currentUser!;
      const resp = await fetch(result.assets[0].uri);
      const blob = await resp.blob();
      const ext  = blob.type ? (blob.type.split("/")[1] || "jpg") : "jpg";
      const storageRef = ref(storage, `avatars/${u.uid}.${ext}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateProfile(u, { photoURL: url });
      await setDoc(doc(db, "users", u.uid), { photoURL: url }, { merge: true });
    } catch (e) {
      console.error("Photo update failed:", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.topBar}>
        <LogoStamp size={36} />
        <Text style={styles.topBarTitle}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <Pressable onPress={changePhoto} style={styles.avatarWrap}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            {uploading
              ? <ActivityIndicator size="small" color="#001012" />
              : <Ionicons name="camera" size={14} color="#001012" />}
          </View>
        </Pressable>

        <Text style={styles.displayName}>{displayName || "—"}</Text>
        <Text style={styles.email}>{user?.email}</Text>

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
      </View>

      <Pressable style={styles.signOutBtn} onPress={() => signOut(auth)}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0a0a0a" },
  scroll:         { paddingBottom: 40 },
  topBar:         { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 10 },
  topBarTitle:    { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  avatarSection:  { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  avatarWrap:     { marginBottom: 14, position: "relative" },
  avatar:         { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial:  { color: ACCENT, fontSize: 32, fontWeight: "700" },
  avatarBadge:    { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0a0a0a" },
  displayName:    { color: "#e8f1f2", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  email:          { color: "#555", fontSize: 13, marginBottom: 24 },
  statRow:        { flexDirection: "row", alignItems: "center", gap: 24 },
  stat:           { alignItems: "center" },
  statNum:        { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  statLabel:      { color: "#555", fontSize: 12, marginTop: 2 },
  statDivider:    { width: 1, height: 32, backgroundColor: "#1a1a1a" },
  signOutBtn:     { marginHorizontal: 24, borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  signOutText:    { color: "#555", fontSize: 14, fontWeight: "600" },
});
