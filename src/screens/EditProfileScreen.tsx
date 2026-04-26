import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";
import { useUserProfile } from "../hooks/useUserProfile";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "EditProfile">;

const ACCENT = "#00e6e6";

export default function EditProfileScreen({ navigation }: Props) {
  const uid = auth.currentUser?.uid ?? null;
  const { profile } = useUserProfile(uid);

  const [displayName, setDisplayName] = useState("");
  const [username,    setUsername]    = useState("");
  const [bio,         setBio]         = useState("");
  const [imageUri,    setImageUri]    = useState<string | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setUsername((profile as any).username || "");
      setBio((profile as any).bio || "");
    }
  }, [profile]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  async function handleSave() {
    Keyboard.dismiss();
    const name = displayName.trim();
    const handle = username.trim().toLowerCase();
    const bioText = bio.trim();

    if (!name) { setError("Display name is required."); return; }
    if (handle && !/^[a-z0-9_]{1,20}$/.test(handle)) {
      setError("Username: letters, numbers, underscores only (max 20).");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const user = auth.currentUser!;

      // Username uniqueness check
      if (handle && handle !== (profile as any)?.username) {
        const taken = await getDocs(
          query(collection(db, "users"), where("username", "==", handle), limit(1))
        );
        if (!taken.empty) {
          setError(`@${handle} is already taken.`);
          setSaving(false);
          return;
        }
      }

      let photoURL = profile?.photoURL || null;
      if (imageUri) {
        const resp  = await fetch(imageUri);
        const blob  = await resp.blob();
        const ext   = blob.type ? (blob.type.split("/")[1] || "jpg") : "jpg";
        const sRef  = ref(storage, `avatars/${user.uid}.${ext}`);
        await uploadBytes(sRef, blob);
        photoURL = await getDownloadURL(sRef);
      }

      await updateProfile(user, { displayName: name, photoURL: photoURL ?? undefined });
      await setDoc(doc(db, "users", user.uid), {
        displayName,
        displayName_lower: name.toLowerCase(),
        username:  handle || null,
        bio:       bioText || null,
        photoURL,
      }, { merge: true });

      navigation.goBack();
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const photoSource = imageUri || profile?.photoURL;
  const initial = (displayName || profile?.displayName || "?")[0].toUpperCase();

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#e8f1f2" />
        </Pressable>
        <Text style={styles.topBarTitle}>Edit Profile</Text>
        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#0a0a0a" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <Pressable onPress={pickImage} style={styles.avatarWrap}>
          {photoSource ? (
            <Image source={{ uri: photoSource }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={14} color="#001012" />
          </View>
        </Pressable>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={v => setDisplayName(v.slice(0, 32))}
          placeholder="Your name"
          placeholderTextColor="#444"
          maxLength={32}
        />

        <Text style={styles.label}>Username</Text>
        <View style={styles.handleRow}>
          <Text style={styles.handleAt}>@</Text>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={username}
            onChangeText={v => setUsername(v.replace(/[^a-z0-9_]/gi, "").slice(0, 20))}
            placeholder="yourhandle"
            placeholderTextColor="#444"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
        <Text style={styles.hint}>Letters, numbers, underscores. Max 20 chars.</Text>

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={v => setBio(v.slice(0, 150))}
          placeholder="Tell people a bit about yourself"
          placeholderTextColor="#444"
          multiline
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:        { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center" },
  topBarTitle:   { color: "#e8f1f2", fontSize: 16, fontWeight: "700", flex: 1, marginLeft: 12 },
  back:          { padding: 4 },
  saveBtn:       { backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 14 },
  saveBtnText:   { color: "#0a0a0a", fontWeight: "700", fontSize: 14 },
  body:          { padding: 24, alignItems: "center" },
  avatarWrap:    { position: "relative", marginBottom: 28 },
  avatar:        { width: 88, height: 88, borderRadius: 44 },
  avatarFallback:{ width: 88, height: 88, borderRadius: 44, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: ACCENT, fontSize: 32, fontWeight: "700" },
  avatarBadge:   { position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0a0a0a" },
  label:         { color: "#555", fontSize: 12, fontWeight: "600", alignSelf: "flex-start", marginBottom: 6, letterSpacing: 0.6, textTransform: "uppercase" },
  input:         { width: "100%", backgroundColor: "#111", borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 8, padding: 12, color: "#e8f1f2", fontSize: 15, marginBottom: 20 },
  bioInput:      { minHeight: 80, textAlignVertical: "top" },
  handleRow:     { flexDirection: "row", alignItems: "center", gap: 8, width: "100%", marginBottom: 4 },
  handleAt:      { color: "#555", fontSize: 16, fontWeight: "600" },
  hint:          { color: "#333", fontSize: 12, alignSelf: "flex-start", marginBottom: 20 },
  charCount:     { color: "#333", fontSize: 12, alignSelf: "flex-end", marginTop: -16, marginBottom: 20 },
  error:         { color: "#ff6b6b", fontSize: 13, textAlign: "center", marginTop: 8 },
});
