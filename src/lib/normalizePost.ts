import { Post } from "../components/PostCard";

/**
 * Maps both native post shape and web-ingested post shape to the canonical
 * PostCard Post interface.
 *
 * Native:   uid, likes, content, authorPhotoURL, type "text"/"video"
 * Ingested: authorId, likesCount, text, authorAvatar, type "youtube_video"
 */
export function normalizePost(raw: Record<string, any>): Post {
  return {
    id:             raw.id,
    uid:            raw.uid || raw.authorId || "",
    type:           raw.type || (raw.videoId ? "youtube_video" : "text"),
    content:        raw.content || raw.text || undefined,
    videoId:        raw.videoId || undefined,
    title:          raw.title || undefined,
    thumbnail:      raw.thumbnail || undefined,
    authorName:     raw.authorName || raw.channelName || "Unknown",
    authorPhotoURL: raw.authorPhotoURL || raw.authorAvatar || undefined,
    likes:          raw.likes ?? raw.likesCount ?? 0,
    commentCount:   raw.commentCount ?? 0,
    createdAt:      raw.createdAt,
  };
}
