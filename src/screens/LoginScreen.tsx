import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { TYLER_UID } from "../lib/constants";
import { ALL_PET_UIDS } from "../lib/petUsers";
import LogoAnimation from "../components/LogoAnimation";

const ACCENT  = "#00e6e6";
const BG      = "#0a0a0a";
const TOS_URL = "https://formant.ca/p/tos";

function OrbBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
      <View style={{ position: "absolute", width: 180, height: 180, borderRadius: 90,  left: width * 0.18 - 90,  top: height * 0.18 - 90,  backgroundColor: `${ACCENT}2e` }} />
      <View style={{ position: "absolute", width: 260, height: 260, borderRadius: 130, left: width * 0.82 - 130, top: height * 0.35 - 130, backgroundColor: `${ACCENT}1a` }} />
      <View style={{ position: "absolute", width: 340, height: 340, borderRadius: 170, left: width * 0.5 - 170,  top: height * 0.78 - 170, backgroundColor: `${ACCENT}14` }} />
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const panelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(panelAnim, { toValue: 1, duration: 420, useNativeDriver: false }).start();
  }, [panelAnim]);

  const animStyle = useMemo(() => ({
    opacity: panelAnim,
    transform: [{ translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  }), [panelAnim]);

  async function handleSubmit() {
    Keyboard.dismiss();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const uid  = cred.user.uid;

        // Filter out any unseeded placeholder UIDs
        const petUids = ALL_PET_UIDS.filter(p => p !== "REPLACE_AFTER_SEED");

        // Create user doc + auto-follow Tyler + all pets in one batch
        const batch = writeBatch(db);
        batch.set(doc(db, "users", uid), {
          uid,
          email:          cred.user.email,
          displayName:    null,
          photoURL:       null,
          followingCount: 1 + petUids.length,
          followersCount: 0,
          createdAt:      serverTimestamp(),
        });
        // Follow Tyler
        batch.set(doc(db, "users", uid, "following", TYLER_UID), {
          uid: TYLER_UID, followedAt: serverTimestamp(),
        });
        batch.set(doc(db, "users", TYLER_UID, "followers", uid), {
          uid, followedAt: serverTimestamp(),
        });
        batch.update(doc(db, "users", TYLER_UID), {
          followersCount: increment(1),
        });
        // Auto-follow each pet
        for (const petUid of petUids) {
          batch.set(doc(db, "users", uid, "following", petUid), {
            uid: petUid, followedAt: serverTimestamp(),
          });
          batch.set(doc(db, "users", petUid, "followers", uid), {
            uid, followedAt: serverTimestamp(),
          });
          batch.update(doc(db, "users", petUid), {
            followersCount: increment(1),
          });
        }
        await batch.commit();
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() { setIsSignUp(v => !v); setError(""); }

  return (
    <View style={styles.root}>
      <OrbBackground />
      <KeyboardAvoidingView style={styles.center} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Animated.View style={[styles.stack, animStyle]}>

          <View style={styles.panel}>
            <LogoAnimation loggingIn={loading} size={80} />
            <Text style={styles.title}>Formant Social</Text>
            <Text style={styles.subtitle}>The Formant Audio community</Text>
          </View>

          <View style={styles.panel}>
            {!!error && <Text style={styles.error}>{error}</Text>}

            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#5a6a6b"
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              textContentType="username" autoComplete="username" returnKeyType="next"
              blurOnSubmit={false} value={email} onChangeText={setEmail} />

            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#5a6a6b"
              secureTextEntry textContentType="password" autoComplete="password"
              returnKeyType="done" value={password} onChangeText={setPassword}
              onSubmitEditing={handleSubmit} />

            <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? (isSignUp ? "Creating…" : "Signing in…") : (isSignUp ? "Create Account" : "Sign In")}
              </Text>
            </Pressable>

            <Pressable onPress={toggleMode} style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {isSignUp ? "Already have an account? Sign in" : "New? Create an account"}
              </Text>
            </Pressable>

            {isSignUp && (
              <Pressable onPress={() => Linking.openURL(TOS_URL)} style={styles.tosRow}>
                <Text style={styles.tosText}>
                  By creating an account you agree to our{" "}
                  <Text style={styles.tosLink}>Terms of Service</Text>
                </Text>
              </Pressable>
            )}
          </View>

        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: BG },
  center:     { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  stack:      { gap: 10, maxWidth: 480, width: "100%", alignSelf: "center" },
  panel:      { backgroundColor: "rgba(90,90,90,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 22, alignItems: "center", gap: 6 },
  title:      { fontSize: 20, fontWeight: "700", color: "#e8f1f2", marginTop: 8 },
  subtitle:   { fontSize: 13, color: "#8a9496" },
  error:      { color: "#ff6b6b", marginBottom: 10, textAlign: "center", fontSize: 13 },
  input:      { width: "100%", backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", borderRadius: 8, padding: 12, color: "#e8f1f2", marginBottom: 10, fontSize: 15 },
  button:     { width: "100%", backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 2 },
  buttonText: { color: "#001012", fontWeight: "700", fontSize: 15 },
  toggleRow:  { marginTop: 14 },
  toggleText: { color: ACCENT, fontSize: 13, textAlign: "center" },
  tosRow:     { marginTop: 12 },
  tosText:    { color: "#5a6a6b", fontSize: 11, textAlign: "center" },
  tosLink:    { color: ACCENT, textDecorationLine: "underline" },
});
