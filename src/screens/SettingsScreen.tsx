import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "firebase/auth";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useUserProfile } from "../hooks/useUserProfile";
import { setTelemetryConsent } from "../lib/telemetry";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const ACCENT = "#00e6e6";

function SettingRow({
  icon, label, value, onPress, danger, right,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress && !right}>
      <Ionicons name={icon as any} size={20} color={danger ? "#ff6b6b" : "#555"} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, danger && { color: "#ff6b6b" }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color="#333" /> : null)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen({ navigation }: Props) {
  const uid = auth.currentUser?.uid ?? null;
  const { profile } = useUserProfile(uid);
  const [telemetry, setTelemetry] = useState<boolean>(
    (profile as any)?.telemetryConsent ?? true
  );
  const [savingTelemetry, setSavingTelemetry] = useState(false);

  async function toggleTelemetry(val: boolean) {
    setTelemetry(val);
    setTelemetryConsent(val);
    setSavingTelemetry(true);
    try {
      await setDoc(doc(db, "users", uid!), {
        telemetryConsent:   val,
        telemetryUpdatedAt: serverTimestamp(),
      }, { merge: true });
    } finally {
      setSavingTelemetry(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This permanently deletes your account and all your posts. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", uid!));
              await deleteUser(auth.currentUser!);
            } catch (e: any) {
              if (e.code === "auth/requires-recent-login") {
                Alert.alert("Re-authentication required", "Please sign out and sign back in, then try again.");
              }
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#e8f1f2" />
        </Pressable>
        <Text style={styles.topBarTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        <SectionHeader title="Privacy" />
        <SettingRow
          icon="analytics-outline"
          label="Usage Analytics"
          right={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {savingTelemetry && <ActivityIndicator size="small" color={ACCENT} />}
              <Switch
                value={telemetry}
                onValueChange={toggleTelemetry}
                trackColor={{ false: "#1e1e1e", true: "rgba(0,230,230,0.4)" }}
                thumbColor={telemetry ? ACCENT : "#555"}
              />
            </View>
          }
        />
        <Text style={styles.hint}>
          Shares anonymous usage data (screens visited, actions taken) to help improve the app.
          No post content or personal info is included.
        </Text>

        <SectionHeader title="Account" />
        <SettingRow
          icon="mail-outline"
          label="Email"
          value={auth.currentUser?.email ?? ""}
        />
        <SettingRow
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => Alert.alert("Change Password", "Password reset email sent to " + auth.currentUser?.email, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Send Reset Email", onPress: async () => {
                const { sendPasswordResetEmail } = await import("firebase/auth");
                await sendPasswordResetEmail(auth, auth.currentUser!.email!);
              }
            },
          ])}
        />
        <SettingRow
          icon="log-out-outline"
          label="Sign Out"
          onPress={() => signOut(auth)}
        />
        <SettingRow
          icon="trash-outline"
          label="Delete Account"
          danger
          onPress={confirmDeleteAccount}
        />

        <SectionHeader title="About" />
        <SettingRow icon="document-text-outline" label="Terms of Use"    value="v1.0" />
        <SettingRow icon="shield-outline"        label="Privacy Policy"  value="" />
        <SettingRow icon="information-circle-outline" label="App Version" value="1.0.0" />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:        { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 12 },
  topBarTitle:   { color: "#e8f1f2", fontSize: 16, fontWeight: "700" },
  back:          { padding: 4 },
  scroll:        { paddingBottom: 48 },
  sectionHeader: { color: "#444", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 28, paddingBottom: 8 },
  row:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#111" },
  rowIcon:       { marginRight: 14 },
  rowLabel:      { flex: 1, color: "#e8f1f2", fontSize: 15 },
  rowValue:      { color: "#444", fontSize: 14, marginRight: 8 },
  hint:          { color: "#333", fontSize: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, lineHeight: 17 },
});
