import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { resendVerificationEmail } from "../lib/auth";

const ACCENT           = "#00e6e6";
const BG               = "#0a0a0a";
const RESEND_COOLDOWN  = 60;

export default function VerifyEmailScreen() {
  const [cooldown, setCooldown]   = useState(0);
  const [message, setMessage]     = useState("");
  const [checking, setChecking]   = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendVerificationEmail();
      setMessage("Verification email sent — check your inbox.");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setMessage("Failed to send. Try again in a moment.");
    }
  };

  const handleCheckVerified = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        // Force token refresh so onIdTokenChanged fires and AppNavigator re-routes
        await auth.currentUser.getIdToken(true);
      } else {
        setMessage("Email not verified yet. Check your inbox or request a new link.");
      }
    } catch {
      setMessage("Could not check status. Try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const email = auth.currentUser?.email ?? "";

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.icon}>✉</Text>
        <Text style={styles.heading}>Check your email</Text>
        <Text style={styles.sub}>
          We sent a verification link to{"\n"}
          <Text style={styles.email}>{email}</Text>
          {"\n"}Click that link to activate your account.
        </Text>

        {!!message && <Text style={styles.message}>{message}</Text>}

        <Pressable
          style={[styles.primaryBtn, checking && { opacity: 0.7 }]}
          onPress={handleCheckVerified}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#001012" />
            : <Text style={styles.primaryBtnText}>I've verified — continue</Text>}
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, cooldown > 0 && { opacity: 0.5 }]}
          onPress={handleResend}
          disabled={cooldown > 0}
        >
          <Text style={styles.secondaryBtnText}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </Text>
        </Pressable>

        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center", padding: 20 },
  card:             { width: "100%", maxWidth: 440, backgroundColor: "rgba(90,90,90,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 28, alignItems: "center", gap: 12 },
  icon:             { fontSize: 40, marginBottom: 4 },
  heading:          { fontSize: 20, fontWeight: "700", color: "#e8f1f2", textAlign: "center" },
  sub:              { fontSize: 13, color: "#8a9496", textAlign: "center", lineHeight: 20 },
  email:            { color: "#e8f1f2", fontWeight: "600" },
  message:          { color: ACCENT, fontSize: 12, textAlign: "center" },
  primaryBtn:       { width: "100%", backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  primaryBtnText:   { color: "#001012", fontWeight: "700", fontSize: 15 },
  secondaryBtn:     { width: "100%", borderWidth: 1, borderColor: ACCENT, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  secondaryBtnText: { color: ACCENT, fontWeight: "600", fontSize: 14 },
  signOutBtn:       { marginTop: 8 },
  signOutText:      { color: "#444", fontSize: 13 },
});
