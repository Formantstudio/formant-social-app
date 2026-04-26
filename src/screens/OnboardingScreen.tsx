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
import { doc, setDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";
import { TYLER_UID } from "../lib/constants";
import { ALL_PET_UIDS, PET_UIDS } from "../lib/petUsers";

const ACCENT       = "#00e6e6";
const BG           = "#0a0a0a";
const TOS_VERSION  = "1.0";

// All accounts the user will auto-follow — shown as "Already following" in step 3
const AUTO_FOLLOW_UIDS = [TYLER_UID, ...ALL_PET_UIDS];
const AUTO_FOLLOW_NAMES: Record<string, string> = {
  [TYLER_UID]: "Tyler (Formant)",
  ...Object.fromEntries(
    Object.entries(PET_UIDS).map(([name, uid]) => [
      uid,
      name.charAt(0).toUpperCase() + name.slice(1),
    ])
  ),
};

// ─── Shared state shape passed between steps ───────────────────────────────

interface OnboardingData {
  displayName: string;
  photoURL:    string | null;
  username:    string;
  bio:         string;
}

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

// ─── Step 1: Display name + photo (no Firestore write yet) ─────────────────

function ProfileStep({
  data,
  onNext,
}: {
  data: OnboardingData;
  onNext: (patch: Partial<OnboardingData>) => void;
}) {
  const [displayName, setDisplayName] = useState(data.displayName);
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [error, setError]             = useState("");

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  function handleNext() {
    Keyboard.dismiss();
    const name = displayName.trim();
    if (!name) { setError("Display name is required."); return; }
    onNext({ displayName: name, photoURL: imageUri });
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepLabel}>Step 1 of 3</Text>
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
        returnKeyType="next"
        onSubmitEditing={handleNext}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Step 2: Username + bio (no Firestore write yet) ───────────────────────

function UsernameStep({
  data,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onNext: (patch: Partial<OnboardingData>) => void;
  onBack: () => void;
}) {
  const [username, setUsername] = useState(data.username);
  const [bio, setBio]           = useState(data.bio);
  const [error, setError]       = useState("");

  function handleNext() {
    Keyboard.dismiss();
    const handle = username.trim().replace(/^@/, "");
    if (handle && !/^[a-zA-Z0-9_]{1,20}$/.test(handle)) {
      setError("Username can only contain letters, numbers, and underscores (max 20 chars).");
      return;
    }
    onNext({ username: handle, bio: bio.trim() });
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepLabel}>Step 2 of 3</Text>
      <Text style={styles.heading}>Your handle & bio</Text>
      <Text style={styles.sub}>Optional — you can always add these later</Text>

      <TextInput
        style={styles.input}
        placeholder="@username"
        placeholderTextColor="#5a6a6b"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={21}
        value={username ? `@${username}` : ""}
        onChangeText={t => setUsername(t.replace(/^@/, ""))}
        returnKeyType="next"
      />

      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Short bio (optional)"
        placeholderTextColor="#5a6a6b"
        multiline
        maxLength={150}
        value={bio}
        onChangeText={setBio}
      />
      <Text style={styles.charCount}>{bio.length}/150</Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>

      <Pressable onPress={onBack} style={styles.skipRow}>
        <Text style={styles.skipText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Step 3: Suggested follows + final write ───────────────────────────────

function SuggestedFollowsStep({
  data,
  onBack,
}: {
  data: OnboardingData;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function finishOnboarding() {
    setLoading(true);
    try {
      const user = auth.currentUser!;
      let photoURL: string | null = null;

      if (data.photoURL) {
        try {
          const resp  = await fetch(data.photoURL);
          const blob  = await resp.blob();
          const ext   = blob.type ? (blob.type.split("/")[1] || "jpg") : "jpg";
          const sRef  = ref(storage, `avatars/${user.uid}.${ext}`);
          await uploadBytes(sRef, blob);
          photoURL = await getDownloadURL(sRef);
        } catch (e: any) {
          throw new Error("Storage: " + (e.message || e.code));
        }
      }

      await user.getIdToken(true);
      await updateProfile(user, { displayName: data.displayName, photoURL: photoURL ?? undefined });

      const batch = writeBatch(db);

      // Write user profile doc (single final write)
      batch.set(doc(db, "users", user.uid), {
        displayName:       data.displayName,
        displayName_lower: data.displayName.toLowerCase(),
        photoURL,
        ...(data.username ? { username: data.username } : {}),
        ...(data.bio      ? { bio: data.bio }           : {}),
      }, { merge: true });

      // Auto-follow Tyler + pets (already written by signUp, but safe to re-write)
      for (const targetUid of AUTO_FOLLOW_UIDS) {
        batch.set(
          doc(db, "users", user.uid, "following", targetUid),
          { uid: targetUid, followedAt: serverTimestamp() },
        );
        batch.set(
          doc(db, "users", targetUid, "followers", user.uid),
          { uid: user.uid, followedAt: serverTimestamp() },
        );
      }

      await batch.commit();
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
    // AppNavigator detects profile.displayName and routes to Main automatically
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepLabel}>Step 3 of 3</Text>
      <Text style={styles.heading}>You're already connected</Text>
      <Text style={styles.sub}>You automatically follow these accounts</Text>

      <View style={styles.followList}>
        {AUTO_FOLLOW_UIDS.map(uid => (
          <View key={uid} style={styles.followRow}>
            <View style={styles.followAvatar}>
              <Text style={styles.followAvatarInitial}>
                {(AUTO_FOLLOW_NAMES[uid] || "?")[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.followName}>{AUTO_FOLLOW_NAMES[uid] || uid}</Text>
            <View style={styles.followBadge}>
              <Text style={styles.followBadgeText}>Following ✓</Text>
            </View>
          </View>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={finishOnboarding}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#001012" />
          : <Text style={styles.buttonText}>Let's go</Text>}
      </Pressable>

      <Pressable onPress={onBack} style={styles.skipRow} disabled={loading}>
        <Text style={styles.skipText}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [data, setData] = useState<OnboardingData>({
    displayName: "",
    photoURL:    null,
    username:    "",
    bio:         "",
  });

  function patch(updates: Partial<OnboardingData>, next: 0 | 1 | 2 | 3) {
    setData(d => ({ ...d, ...updates }));
    setStep(next);
  }

  return (
    <View style={styles.root}>
      {step === 0 && (
        <TosScreen onAccept={() => setStep(1)} onDecline={() => {}} />
      )}
      {step === 1 && (
        <ProfileStep
          data={data}
          onNext={updates => patch(updates, 2)}
        />
      )}
      {step === 2 && (
        <UsernameStep
          data={data}
          onNext={updates => patch(updates, 3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <SuggestedFollowsStep
          data={data}
          onBack={() => setStep(2)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:                  { flex: 1, backgroundColor: BG },
  scroll:                { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  stepLabel:             { color: "#444", fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },

  // TOS screen
  tosLogo:               { color: ACCENT, fontSize: 13, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20 },
  tosBox:                { width: "100%", maxWidth: 420, backgroundColor: "#111", borderRadius: 10, padding: 18, marginBottom: 28, borderWidth: 1, borderColor: "#1e1e1e" },
  tosSection:            { color: "#e8f1f2", fontSize: 13, fontWeight: "700", marginBottom: 8, letterSpacing: 0.4 },
  tosBody:               { color: "#8a9496", fontSize: 13, lineHeight: 20 },
  tosDivider:            { height: 1, backgroundColor: "#1e1e1e", marginVertical: 16 },
  declineRow:            { marginTop: 16 },
  declineText:           { color: "#333", fontSize: 13, textAlign: "center" },

  // Profile step
  avatarWrap:            { marginBottom: 24 },
  avatar:                { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder:     { width: 100, height: 100, borderRadius: 50, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { color: ACCENT, fontSize: 13, fontWeight: "600" },

  // Username step
  bioInput:              { height: 90, textAlignVertical: "top" },
  charCount:             { color: "#333", fontSize: 11, alignSelf: "flex-end", marginTop: -10, marginBottom: 14, width: "100%", maxWidth: 400, textAlign: "right" },

  // Suggested follows
  followList:            { width: "100%", maxWidth: 400, marginBottom: 28 },
  followRow:             { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", gap: 12 },
  followAvatar:          { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", justifyContent: "center", alignItems: "center" },
  followAvatarInitial:   { color: ACCENT, fontWeight: "700", fontSize: 14 },
  followName:            { flex: 1, color: "#e8f1f2", fontSize: 14, fontWeight: "600" },
  followBadge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(0,230,230,0.12)" },
  followBadgeText:       { color: ACCENT, fontSize: 12, fontWeight: "600" },

  // Shared
  input:                 { width: "100%", maxWidth: 400, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", borderRadius: 8, padding: 12, color: "#e8f1f2", marginBottom: 14, fontSize: 15 },
  skipRow:               { marginTop: 16 },
  skipText:              { color: "#444", fontSize: 13, textAlign: "center" },
  heading:               { fontSize: 22, fontWeight: "700", color: "#e8f1f2", marginBottom: 6, textAlign: "center" },
  sub:                   { fontSize: 13, color: "#8a9496", marginBottom: 32, textAlign: "center" },
  error:                 { color: "#ff6b6b", marginBottom: 10, textAlign: "center", fontSize: 13 },
  button:                { width: "100%", maxWidth: 400, backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 13, alignItems: "center" },
  buttonText:            { color: "#001012", fontWeight: "700", fontSize: 15 },
});
