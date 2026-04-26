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
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { auth, db, storage } from "../lib/firebase";
import { useAuthState } from "../hooks/useAuthState";
import { useUserProfile } from "../hooks/useUserProfile";
import LogoStamp from "../components/LogoStamp";
import AdCard from "../components/AdCard";
import { RootStackParamList } from "../navigation/AppNavigator";

const ACCENT = "#00e6e6";

export default function ProfileScreen() {
  const navigation  = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user }    = useAuthState();
  const { profile } = useUserProfile(user?.uid ?? null);
  const [uploading, setUploading] = useState(false);

  const photoURL    = profile?.photoURL    || user?.photoURL    || null;
  const displayName = profile?.displayName || user?.displayName || null;
  const username    = (profile as any)?.username || null;
  const bio         = (profile as any)?.bio || null;
  const initial     = (displayName || user?.email || "?")[0].toUpperCase();

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
      const u    = auth.currentUser!;
      const resp = await fetch(result.assets[0].uri);
      const blob = await resp.blob();
      const ext  = blob.type ? (blob.type.split("/")[1] || "jpg") : "jpg";
      const sRef = ref(storage, `avatars/${u.uid}.${ext}`);
      await uploadBytes(sRef, blob);
      const url = await getDownloadURL(sRef);
      await updateProfile(u, { photoURL: url });
      await setDoc(doc(db, "users", u.uid), { photoURL: url }, { merge: true });
    } catch (e) {
      console.error("Photo update failed:", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.root}>
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
      <View style={styles.topBar}>
        <LogoStamp size={36} />
        <Text style={styles.topBarTitle}>Profile</Text>
        <Pressable onPress={() => navigation.push("Settings")} style={styles.topBarAction}>
          <Ionicons name="settings-outline" size={22} color="#555" />
        </Pressable>
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
        {username && <Text style={styles.username}>@{username}</Text>}
        {bio       && <Text style={styles.bio}>{bio}</Text>}
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

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => navigation.push("EditProfile")}>
          <Ionicons name="create-outline" size={18} color={ACCENT} />
          <Text style={styles.actionBtnText}>Edit Profile</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => navigation.push("Feedback")}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={ACCENT} />
          <Text style={styles.actionBtnText}>Send Feedback</Text>
        </Pressable>
      </View>
    </ScrollView>

    {/* Banner ad pinned bottom */}
    <View style={styles.bannerWrap}>
      <AdCard />
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0a0a0a" },
  scrollView:     { flex: 1 },
  scroll:         { paddingBottom: 80 },
  bannerWrap:     { position: "absolute", bottom: 0, left: 0, right: 0 },
  topBar:         { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 10 },
  topBarTitle:    { color: "#e8f1f2", fontSize: 18, fontWeight: "700", flex: 1 },
  topBarAction:   { padding: 4 },
  avatarSection:  { alignItems: "center", paddingVertical: 32, paddingHorizontal: 24 },
  avatarWrap:     { marginBottom: 14, position: "relative" },
  avatar:         { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial:  { color: ACCENT, fontSize: 32, fontWeight: "700" },
  avatarBadge:    { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0a0a0a" },
  displayName:    { color: "#e8f1f2", fontSize: 18, fontWeight: "700", marginBottom: 2 },
  username:       { color: ACCENT, fontSize: 13, marginBottom: 6 },
  bio:            { color: "#8a9496", fontSize: 13, textAlign: "center", marginBottom: 6, lineHeight: 18 },
  email:          { color: "#555", fontSize: 13, marginBottom: 24 },
  statRow:        { flexDirection: "row", alignItems: "center", gap: 24 },
  stat:           { alignItems: "center" },
  statNum:        { color: "#e8f1f2", fontSize: 18, fontWeight: "700" },
  statLabel:      { color: "#555", fontSize: 12, marginTop: 2 },
  statDivider:    { width: 1, height: 32, backgroundColor: "#1a1a1a" },
  actions:        { paddingHorizontal: 24, gap: 10 },
  actionBtn:      { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  actionBtnText:  { color: "#e8f1f2", fontSize: 14, fontWeight: "600" },
});
