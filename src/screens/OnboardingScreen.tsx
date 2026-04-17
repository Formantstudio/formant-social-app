import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const ACCENT = "#00e6e6";
const BG     = "#0a0a0a";

export default function OnboardingScreen() {
  const [displayName, setDisplayName] = useState("");
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    Keyboard.dismiss();
    const name = displayName.trim();
    if (!name) { setError("Display name is required."); return; }
    setError("");
    setLoading(true);

    try {
      const user = auth.currentUser!;
      let photoURL: string | null = null;

      if (imageUri) {
        try {
          const resp  = await fetch(imageUri);
          const blob  = await resp.blob();
          const ext   = blob.type ? (blob.type.split("/")[1] || "jpg") : "jpg";
          const storageRef = ref(storage, `avatars/${user.uid}.${ext}`);
          await uploadBytes(storageRef, blob);
          photoURL = await getDownloadURL(storageRef);
        } catch (storageErr: any) {
          throw new Error("Storage: " + (storageErr.message || storageErr.code));
        }
      }

      await user.getIdToken(true); // ensure fresh token is propagated to Firestore
      await updateProfile(user, { displayName: name, photoURL: photoURL ?? undefined });
      try {
        await setDoc(doc(db, "users", user.uid), { displayName: name, photoURL }, { merge: true });
      } catch (fsErr: any) {
        throw new Error(`Firestore [uid=${user.uid} authUid=${auth.currentUser?.uid}] code=${fsErr.code}: ${fsErr.message}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Set up your profile</Text>
        <Text style={styles.sub}>This is how you'll appear on Formant Social</Text>

        {/* Avatar picker */}
        <Pressable onPress={pickImage} style={styles.avatarWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>+ Photo</Text>
            </View>
          )}
        </Pressable>

        {/* Display name */}
        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor="#5a6a6b"
          autoCorrect={false}
          maxLength={32}
          value={displayName}
          onChangeText={setDisplayName}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#001012" />
            : <Text style={styles.buttonText}>Let's go</Text>}
        </Pressable>

        <Pressable onPress={handleSave} style={styles.skipRow} disabled={loading}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:                   { flex: 1, backgroundColor: BG },
  scroll:                 { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  heading:                { fontSize: 22, fontWeight: "700", color: "#e8f1f2", marginBottom: 6, textAlign: "center" },
  sub:                    { fontSize: 13, color: "#8a9496", marginBottom: 32, textAlign: "center" },
  avatarWrap:             { marginBottom: 24 },
  avatar:                 { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder:      { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText:  { color: ACCENT, fontSize: 13, fontWeight: "600" },
  input:                  { width: "100%", maxWidth: 400, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", borderRadius: 8, padding: 12, color: "#e8f1f2", marginBottom: 14, fontSize: 15 },
  error:                  { color: "#ff6b6b", marginBottom: 10, textAlign: "center", fontSize: 13 },
  button:                 { width: "100%", maxWidth: 400, backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 13, alignItems: "center" },
  buttonText:             { color: "#001012", fontWeight: "700", fontSize: 15 },
  skipRow:                { marginTop: 16 },
  skipText:               { color: "#444", fontSize: 13, textAlign: "center" },
});
