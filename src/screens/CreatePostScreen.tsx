import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
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

type Props = NativeStackScreenProps<RootStackParamList, "CreatePost">;

const ACCENT       = "#00e6e6";
const MAX_TEXT     = 280;
const YT_REGEX     = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

interface YouTubePreview {
  videoId:   string;
  title:     string;
  thumbnail: string;
}

async function fetchYouTubeTitle(videoId: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return "";
  try {
    const res  = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);
    const data = await res.json();
    return data?.items?.[0]?.snippet?.title || "";
  } catch {
    return "";
  }
}

export default function CreatePostScreen({ navigation }: Props) {
  const currentUid = auth.currentUser?.uid ?? null;
  const { profile } = useUserProfile(currentUid);

  const [text,       setText]       = useState("");
  const [ytPreview,  setYtPreview]  = useState<YouTubePreview | null>(null);
  const [ytLoading,  setYtLoading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [urlInput,   setUrlInput]   = useState("");

  const handleTextChange = useCallback((val: string) => {
    setText(val.slice(0, MAX_TEXT));
  }, []);

  const handleUrlChange = useCallback(async (val: string) => {
    setUrlInput(val);
    const match = YT_REGEX.exec(val);
    if (!match) { setYtPreview(null); return; }
    const videoId = match[1];
    setYtLoading(true);
    const title = await fetchYouTubeTitle(videoId);
    setYtPreview({
      videoId,
      title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    });
    setYtLoading(false);
  }, []);

  const clearYt = useCallback(() => {
    setYtPreview(null);
    setUrlInput("");
  }, []);

  const canSubmit = !submitting && (text.trim().length > 0 || ytPreview !== null);

  const submit = useCallback(async () => {
    if (!canSubmit || !currentUid) return;
    setSubmitting(true);
    try {
      const base = {
        uid:            currentUid,
        authorName:     profile?.displayName || "User",
        authorPhotoURL: profile?.photoURL    || "",
        likes:          0,
        commentCount:   0,
        createdAt:      serverTimestamp(),
      };

      if (ytPreview) {
        await addDoc(collection(db, "posts"), {
          ...base,
          type:      "youtube_video",
          videoId:   ytPreview.videoId,
          title:     ytPreview.title,
          thumbnail: ytPreview.thumbnail,
          content:   text.trim() || undefined,
        });
      } else {
        await addDoc(collection(db, "posts"), {
          ...base,
          type:    "text",
          content: text.trim(),
        });
      }
      navigation.goBack();
    } catch (e) {
      console.error("Post failed:", e);
      setSubmitting(false);
    }
  }, [canSubmit, currentUid, profile, ytPreview, text, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="close" size={22} color="#e8f1f2" />
        </Pressable>
        <Text style={styles.topBarTitle}>New Post</Text>
        <Pressable
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#0a0a0a" />
            : <Text style={styles.postBtnText}>Post</Text>}
        </Pressable>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.textInput}
          placeholder="What's on your mind?"
          placeholderTextColor="#444"
          multiline
          value={text}
          onChangeText={handleTextChange}
          autoFocus
        />

        <Text style={styles.charCount}>
          {text.length}/{MAX_TEXT}
        </Text>

        {/* YouTube URL input */}
        <View style={styles.urlRow}>
          <Ionicons name="logo-youtube" size={18} color="#ff4444" style={{ marginTop: 12 }} />
          <TextInput
            style={styles.urlInput}
            placeholder="Paste a YouTube URL…"
            placeholderTextColor="#444"
            value={urlInput}
            onChangeText={handleUrlChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {ytPreview && (
            <Pressable onPress={clearYt} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </Pressable>
          )}
        </View>

        {ytLoading && <ActivityIndicator color={ACCENT} style={{ marginTop: 12 }} />}

        {ytPreview && (
          <View style={styles.ytPreview}>
            <Image source={{ uri: ytPreview.thumbnail }} style={styles.ytThumb} resizeMode="cover" />
            <View style={styles.ytPlayOverlay}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
            </View>
            {ytPreview.title ? (
              <Text style={styles.ytTitle} numberOfLines={2}>{ytPreview.title}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: "#0a0a0a" },
  topBar:         { paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", flexDirection: "row", alignItems: "center" },
  topBarTitle:    { color: "#e8f1f2", fontSize: 16, fontWeight: "700", flex: 1, marginLeft: 12 },
  back:           { padding: 4 },
  postBtn:        { backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 16 },
  postBtnDisabled:{ backgroundColor: "#1a1a1a" },
  postBtnText:    { color: "#0a0a0a", fontWeight: "700", fontSize: 14 },
  body:           { flex: 1, padding: 16 },
  textInput:      { color: "#e8f1f2", fontSize: 17, lineHeight: 24, minHeight: 100, textAlignVertical: "top" },
  charCount:      { color: "#333", fontSize: 12, textAlign: "right", marginTop: 4 },
  urlRow:         { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingTop: 16 },
  urlInput:       { flex: 1, color: "#e8f1f2", fontSize: 14, backgroundColor: "#111", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtn:       { padding: 4 },
  ytPreview:      { marginTop: 12, borderRadius: 8, overflow: "hidden", position: "relative" },
  ytThumb:        { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#0a0a0a" },
  ytPlayOverlay:  { position: "absolute", top: 0, left: 0, right: 0, bottom: 40, justifyContent: "center", alignItems: "center" },
  ytTitle:        { color: "#c8d8d9", fontSize: 13, padding: 10, backgroundColor: "#111" },
});
