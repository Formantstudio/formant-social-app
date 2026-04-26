import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const ACCENT       = "#00e6e6";
const BG           = "#0a0a0a";
const TOS_VERSION  = "1.0";

// ─── Step 0: TOS + Telemetry PSA ───────────────────────────────────────────

function TosScreen({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    try {
      const user = auth.currentUser!;
      await setDoc(doc(db, "users", user.uid), {
        tosAcceptedAt:      serverTimestamp(),
        tosVersion:         TOS_VERSION,
        telemetryConsent:   true,
        telemetryUpdatedAt: serverTimestamp(),
      }, { merge: true });
      onAccept();
    } catch (e) {
      console.error("TOS write failed:", e);
      setBusy(false);
    }
  }

  async function handleDecline() {
    await signOut(auth);
    onDecline();
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.tosLogo}>Formant Social</Text>
      <Text style={styles.heading}>Before you jump in</Text>
      <Text style={styles.sub}>Please read and accept to continue</Text>

      <View style={styles.tosBox}>
        <Text style={styles.tosSection}>Terms of Use</Text>
        <Text style={styles.tosBody}>
          By using Formant Social you agree to:{"\n\n"}
          {"• "}Not post illegal, abusive, or spam content{"\n"}
          {"• "}Not impersonate other users{"\n"}
          {"• "}Give Formant the right to display your posts in the app feed{"\n\n"}
          This app is operated by Tyler Johnston-Kent (tyler@formant.ca).
        </Text>

        <View style={styles.tosDivider} />

        <Text style={styles.tosSection}>Privacy & Data Collection</Text>
        <Text style={styles.tosBody}>
          To improve the app we collect basic usage data — which screens you visit and actions you take (likes, posts, follows). We do{" "}
          <Text style={{ fontWeight: "700", color: "#e8f1f2" }}>not</Text> collect the content of your posts or messages, and we do{" "}
          <Text style={{ fontWeight: "700", color: "#e8f1f2" }}>not</Text> sell your data or share it with advertisers.{"\n\n"}
          You can turn off data collection at any time in Settings.
        </Text>
      </View>

      <Pressable
        style={[styles.button, busy && { opacity: 0.7 }]}
        onPress={handleAccept}
        disabled={busy}
      >
        {busy
          ? <ActivityIndicator color="#001012" />
          : <Text style={styles.buttonText}>Accept & Continue</Text>}
      </Pressable>

      <Pressable onPress={handleDecline} style={styles.declineRow} disabled={busy}>
        <Text style={styles.declineText}>Decline — Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Step 1: Profile setup ──────────────────────────────────────────────────

function ProfileSetupScreen() {
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

      await user.getIdToken(true);
      await updateProfile(user, { displayName: name, photoURL: photoURL ?? undefined });
      try {
        await setDoc(doc(db, "users", user.uid), { displayName: name, photoURL }, { merge: true });
      } catch (fsErr: any) {
        throw new Error(`Firestore [uid=${user.uid}] code=${fsErr.code}: ${fsErr.message}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Set up your profile</Text>
      <Text style={styles.sub}>This is how you'll appear on Formant Social</Text>

      <Pressable onPress={pickImage} style={styles.avatarWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>+ Photo</Text>
          </View>
        )}
      </Pressable>

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

      <Pressable
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#001012" />
          : <Text style={styles.buttonText}>Let's go</Text>}
      </Pressable>

      <Pressable onPress={handleSave} style={styles.skipRow} disabled={loading}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState<0 | 1>(0);

  return (
    <View style={styles.root}>
      {step === 0
        ? <TosScreen onAccept={() => setStep(1)} onDecline={() => {}} />
        : <ProfileSetupScreen />}
    </View>
  );
}

const styles = StyleSheet.create({
  root:                  { flex: 1, backgroundColor: BG },
  scroll:                { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28 },

  // TOS screen
  tosLogo:               { color: ACCENT, fontSize: 13, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20 },
  tosBox:                { width: "100%", maxWidth: 420, backgroundColor: "#111", borderRadius: 10, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: "#1e1e1e" },
  tosSection:            { color: "#e8f1f2", fontSize: 13, fontWeight: "700", marginBottom: 8, letterSpacing: 0.4 },
  tosBody:               { color: "#8a9496", fontSize: 13, lineHeight: 20 },
  tosDivider:            { height: 1, backgroundColor: "#1e1e1e", marginVertical: 16 },
  declineRow:            { marginTop: 16 },
  declineText:           { color: "#333", fontSize: 13, textAlign: "center" },

  // Profile setup
  avatarWrap:            { marginBottom: 24 },
  avatar:                { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder:     { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { color: ACCENT, fontSize: 13, fontWeight: "600" },
  input:                 { width: "100%", maxWidth: 400, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", borderRadius: 8, padding: 12, color: "#e8f1f2", marginBottom: 14, fontSize: 15 },
  skipRow:               { marginTop: 16 },
  skipText:              { color: "#444", fontSize: 13, textAlign: "center" },

  // Shared
  heading:               { fontSize: 22, fontWeight: "700", color: "#e8f1f2", marginBottom: 6, textAlign: "center" },
  sub:                   { fontSize: 13, color: "#8a9496", marginBottom: 32, textAlign: "center" },
  error:                 { color: "#ff6b6b", marginBottom: 10, textAlign: "center", fontSize: 13 },
  button:                { width: "100%", maxWidth: 400, backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 13, alignItems: "center" },
  buttonText:            { color: "#001012", fontWeight: "700", fontSize: 15 },
});
