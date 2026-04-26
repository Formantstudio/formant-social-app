import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useUserProfile } from "../hooks/useUserProfile";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Feedback">;
type Category = "bug" | "suggestion" | "other";

const ACCENT    = "#00e6e6";
const MAX_CHARS = 500;

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: "bug",        label: "Bug",        icon: "bug-outline" },
  { key: "suggestion", label: "Suggestion", icon: "bulb-outline" },
  { key: "other",      label: "Other",      icon: "chatbubble-ellipses-outline" },
];

export default function FeedbackScreen({ navigation }: Props) {
  const uid = auth.currentUser?.uid ?? null;
  const { profile } = useUserProfile(uid);
  const [category, setCategory] = useState<Category>("suggestion");
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || !uid || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        uid,
        displayName:  profile?.displayName || "User",
        email:        auth.currentUser?.email || "",
        category,
        text:         trimmed,
        platform:     Platform.OS,
        submittedAt:  serverTimestamp(),
        read:         false,
      });
      setSent(true);
    } catch (e) {
      console.error("Feedback failed:", e);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#e8f1f2" />
        </Pressable>
        <Text style={styles.topBarTitle}>Send Feedback</Text>
      </View>

      {sent ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={ACCENT} />
          <Text style={styles.sentTitle}>Thanks for the feedback!</Text>
          <Text style={styles.sentSub}>Tyler reads every submission.</Text>
          <Pressable style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>What kind of feedback?</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c.key}
                style={[styles.catBtn, category === c.key && styles.catBtnActive]}
                onPress={() => setCategory(c.key)}
              >
                <Ionicons name={c.icon as any} size={16} color={category === c.key ? "#0a0a0a" : ACCENT} />
                <Text style={[styles.catText, category === c.key && styles.catTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe the issue or idea…"
            placeholderTextColor="#444"
            multiline
            value={text}
            onChangeText={t => setText(t.slice(0, MAX_CHARS))}
            maxLength={MAX_CHARS}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{text.length}/{MAX_CHARS}</Text>

          <Pressable
            style={[styles.submitBtn, (!text.trim() || sending) && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#0a0a0a" />
              : <Text style={styles.submitBtnText}>Send Feedback</Text>}
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:           { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center", gap: 12 },
  topBarTitle:      { color: "#e8f1f2", fontSize: 16, fontWeight: "700" },
  back:             { padding: 4 },
  body:             { padding: 24 },
  label:            { color: "#555", fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  categoryRow:      { flexDirection: "row", gap: 10, marginBottom: 24 },
  catBtn:           { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: ACCENT },
  catBtnActive:     { backgroundColor: ACCENT },
  catText:          { color: ACCENT, fontSize: 13, fontWeight: "600" },
  catTextActive:    { color: "#0a0a0a" },
  textInput:        { backgroundColor: "#111", borderWidth: 1, borderColor: "#1e1e1e", borderRadius: 8, padding: 14, color: "#e8f1f2", fontSize: 15, minHeight: 140 },
  charCount:        { color: "#333", fontSize: 12, textAlign: "right", marginTop: 6, marginBottom: 24 },
  submitBtn:        { backgroundColor: ACCENT, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  submitBtnDisabled:{ backgroundColor: "#1a1a1a" },
  submitBtnText:    { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
  center:           { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  sentTitle:        { color: "#e8f1f2", fontSize: 20, fontWeight: "700" },
  sentSub:          { color: "#555", fontSize: 14 },
  doneBtn:          { marginTop: 16, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 20, backgroundColor: ACCENT },
  doneBtnText:      { color: "#0a0a0a", fontWeight: "700", fontSize: 15 },
});
