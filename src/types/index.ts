export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  isSystemAccount?: boolean;
}

export type PostType = "user_post" | "youtube_video";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  type: PostType;
  text: string;
  createdAt: Date;
  likesCount: number;
  // youtube_video only
  videoId?: string;
  thumbnail?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  createdAt: Date;
}
