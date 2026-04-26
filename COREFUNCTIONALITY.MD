# Formant Social App — Core Functionality Audit

**Stack:** React Native 0.81 / Expo SDK 54 / Firebase 11 / TypeScript
**Firebase project:** `formant-social`
**Shared backend with:** `FormantSocial/` (web app, same Firestore)

---

## Current Screens

| Screen | File | Status | What it does |
|---|---|---|---|
| Login | `src/screens/LoginScreen.tsx` | ✅ Live | Email/password sign-in + sign-up. Validation via `src/lib/auth.ts` (disposable + profanity blocklists). Auto-follows Tyler + all pet accounts on signup. |
| Verify Email | `src/screens/VerifyEmailScreen.tsx` | ✅ Live | Gate for unverified accounts. Resend button (60s cooldown), "I've verified" check, sign-out. |
| Onboarding | `src/screens/OnboardingScreen.tsx` | ✅ Live | Step 0: TOS + telemetry PSA (Accept → writes `tosAcceptedAt`, `tosVersion`, `telemetryConsent` to Firestore; Decline → signs out). Step 1: display name + avatar picker. |
| Feed | `src/screens/FeedScreen.tsx` | ✅ Live | Follow-based feed (Tyler + pets + followed users). Normalizes both post schemas. AdMob ads every 3–6 posts. FAB → CreatePost. |
| Profile (own) | `src/screens/ProfileScreen.tsx` | ✅ Live | Avatar (tap to change), display name, email, following/followers counts, sign out. |
| User Profile | `src/screens/UserProfileScreen.tsx` | ✅ Live | View any user's profile. Follow/unfollow button, stats, their post feed. AdMob banner pinned bottom. System account badge for Formant channels. |
| Post Detail | `src/screens/PostDetailScreen.tsx` | ✅ Live | Full post view + comments thread. Comment input bar pinned bottom. Increment `commentCount` on submit. AdMob MEDIUM_RECTANGLE between post and comments. |
| Create Post    | `src/screens/CreatePostScreen.tsx`   | ✅ Live | Text post (280 char) + YouTube URL detection (auto-fetches title/thumbnail via YouTube API). Post button disabled until content entered. |
| Explore        | `src/screens/ExploreScreen.tsx`      | ✅ Live | Trending (orderBy likes desc) and New (orderBy createdAt desc) modes. Segmented control toggle. AdMob every 5 posts. |
| Search         | `src/screens/SearchScreen.tsx`       | ✅ Live | Search users by `displayName_lower` prefix query. Debounced 300ms. Follow/unfollow inline. Tap result → UserProfile. |
| Edit Profile   | `src/screens/EditProfileScreen.tsx`  | ✅ Live | Edit display name, @username (uniqueness checked), bio, avatar. Writes `displayName_lower` for search. |
| Settings       | `src/screens/SettingsScreen.tsx`     | ✅ Live | Telemetry toggle (writes to Firestore), change password (reset email), sign out, delete account, app version. |
| Feedback       | `src/screens/FeedbackScreen.tsx`     | ✅ Live | Bug / Suggestion / Other category picker + 500-char text. Writes to `feedback/` collection. Success state on send. |

---

## Current Components

| Component | Status | What it does |
|---|---|---|
| `PostCard` | ✅ Live | Renders text and YouTube posts. Like toggle, follow/unfollow, author avatar + name tap → UserProfile, post tap → PostDetail. Uses `followUser.ts`. |
| `AdCard` / `AdCard.native` | ✅ Live | Web stub returns null. Native renders AdMob `BannerAd` (MEDIUM_RECTANGLE). |
| `LogoAnimation` | ✅ Live | Animated logo on LoginScreen. |
| `LogoStamp` | ✅ Live | Static logo mark in top bars. |

---

## Navigation Flow

```
Not logged in              → LoginScreen
Logged in, unverified      → VerifyEmailScreen
Logged in, no displayName  → OnboardingScreen
Logged in, ready           → MainTabs (Feed + Profile)
                              └─ push → UserProfileScreen
                              └─ push → PostDetailScreen
                              └─ push → CreatePostScreen (slide from bottom)
```

Bottom tabs: **Feed** | **Explore** | **Search** | **Profile**

---

## Hooks

| Hook | File | What it does |
|---|---|---|
| `useAuthState` | `src/hooks/useAuthState.ts` | `onIdTokenChanged`. Returns `{ user, loading, emailVerified }`. Google users auto-pass verification. |
| `useUserProfile` | `src/hooks/useUserProfile.ts` | Real-time `onSnapshot` on `users/{uid}`. Returns `{ profile, loading }`. |
| `useFollowing` | `src/hooks/useFollowing.ts` | Real-time `onSnapshot` on `users/{uid}/following`. Returns `Set<string>`. |
| `useUserPosts` | `src/hooks/useUserPosts.ts` | Query `posts` where `uid == targetUid`, ordered by `createdAt desc`, limit 30. Returns `{ posts, loading }`. |
| `useComments` | `src/hooks/useComments.ts` | Real-time `onSnapshot` on `posts/{postId}/comments`, ordered by `createdAt asc`. Returns `{ comments, loading }`. |

---

## Lib Utilities

| File | What it does |
|---|---|
| `src/lib/auth.ts` | `signIn`, `signUp` (with blocklists), `resendVerificationEmail`, error mapping. |
| `src/lib/followUser.ts` | `toggleFollow(currentUid, targetUid, isFollowing)` — shared batch write for follow/unfollow. Used by PostCard and UserProfileScreen. |
| `src/lib/normalizePost.ts` | `normalizePost(raw)` — maps web-ingested post fields (`authorId`, `likesCount`, `text`, `authorAvatar`) to native PostCard shape (`uid`, `likes`, `content`, `authorPhotoURL`). |
| `src/lib/firebase.ts` | Firebase app init: auth (with AsyncStorage persistence), Firestore, Storage, AppCheck (web only). |
| `src/lib/constants.ts` | `TYLER_UID` |
| `src/lib/petUsers.ts` | `PET_UIDS` map + `ALL_PET_UIDS` array |
| `src/lib/telemetry.ts` | `trackEvent(event, props)` — writes to `telemetry/{uid}/events`, caps at 200 entries, no-ops if consent false. `setTelemetryConsent(bool)` sets consent state. |

---

## Auth (`src/lib/auth.ts`)

- `signIn(email, password)` — wraps `signInWithEmailAndPassword`
- `signUp(email, password)` — disposable domain check → profanity check → `createUserWithEmailAndPassword` → `sendEmailVerification`
- `resendVerificationEmail()` — sends to current user if unverified
- `normalizeAuthError(code)` + `authErrorMessage(error)` — maps Firebase error codes to human-readable strings

---

## Firestore Data Model

### `posts` collection — two shapes

**Native app posts** (written by mobile users):
```
uid, type ("text"|"video"|"youtube_video"), content, videoId, title,
thumbnail, authorName, authorPhotoURL, likes, commentCount, createdAt
```

**Web-ingested YouTube posts** (written by FormantSocial web app):
```
authorId, authorName, authorAvatar, type ("youtube_video"),
text, videoId, thumbnail, channelName, likesCount, createdAt
```

`normalizePost()` reconciles both shapes before passing to `PostCard`.

### `posts/{postId}/comments` subcollection
```
authorId, authorName, authorPhotoURL, text, createdAt
```

### `users/{uid}` document
```
uid, displayName, photoURL, email, followingCount, followersCount,
isSystemAccount (optional), createdAt
```

### `users/{uid}/following/{targetUid}` subcollection
```
uid: targetUid, followedAt: timestamp
```

### `users/{uid}/followers/{followerUid}` subcollection
```
uid: followerUid, followedAt: timestamp
```

---

## Seeded Accounts

| Account | UID | Type |
|---|---|---|
| Tyler (you) | `iWI3uKFdy6RO4Qlx42MD5DTiQD12` | Primary — all new users auto-follow |
| Hemi | `5g7RZaVO7vYPv6XiuMNSvUEwDZr2` | Pet persona |
| Bubbles | `ofi39IgMAgR6WSYuDbBYFELoJTC2` | Pet persona |
| Pearl | `5o40Z98dDlbEkIGyk8JDRm7junl1` | Pet persona |
| Cooper | `6mxMMNSxSGdq2QZhMTFcaXqOg4m2` | Pet persona |
| Dozer | `kimEOvro6JhIo6dCLMwaNOwMfFq2` | Pet persona |

YouTube channel accounts (Formant Audio, Hospital Records, Perfect Circuit) ingest posts but have **no `users/` document** — they show in feed via `normalizePost` but can't be followed or profiled yet. Creating those docs is Tier 1 item 3 in `NEWFUNCTIONALITYADDON.MD`.

---

## Ads

- AdMob `react-native-google-mobile-ads` v16.3.2
- `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` / `EXPO_PUBLIC_ADMOB_BANNER_IOS` in `.env`
- `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID` / `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS` in `.env`
- Feed: MEDIUM_RECTANGLE every 3–6 posts; interstitial fires every 4th PostDetail open (`tapCount % 4`)
- Profile (own): BANNER pinned bottom
- User Profile: MEDIUM_RECTANGLE in post list (after 5th post) + BANNER pinned bottom
- Post Detail: MEDIUM_RECTANGLE between post and comments thread
- Search: AdCard injected after 5th result
- Interstitial: platform-split `src/lib/interstitialAd.ts` (web stub) / `.native.ts` (real impl); preloaded on FeedScreen mount
- Web build: stubs render nothing

---

## Social Features

- **Repost** — repeat icon in PostCard footer (not shown on own posts or reposts). Alert confirm → writes `type: "repost"` post doc with original post metadata.
- **Report Post** — long-press (500ms) any PostCard → Alert with Spam / Hate / Misinformation reasons → writes to `reports/` collection.
- **Report User** — "⋯" button in UserProfileScreen topBar → Alert with Spam / Hate / Impersonation reasons → writes to `reports/` collection.
- **Telemetry events tracked**: `like`, `follow`, `video_open`, `post_view`, `repost`, `report_post`, `report_user`
- **Telemetry consent wired**: AppNavigator reads `profile.telemetryConsent` on profile load and calls `setTelemetryConsent()`.

---

## Known Issues / Gaps

1. **YouTube channel accounts have no user profiles** — Hospital Records, Perfect Circuit, Formant Audio channel posts show in feed but can't be followed or viewed as a profile. Need `users/` docs seeded (NEWFUNCTIONALITYADDON.MD item 3).
2. **No notifications** — `commentCount` and `followersCount` update in real time but no push notifications or in-app notification feed.
3. **Google Sign-In not wired** — `GoogleAuthProvider` exported from `firebase.ts` but no button; requires `expo-auth-session` + `expo-web-browser` install.
4. **TOS consent bypass via Google Sign-In** — `needsOnboarding` in AppNavigator gates on `!profile?.displayName`, but Google accounts carry a display name automatically. A Google user would skip OnboardingScreen entirely, bypassing the TOS and telemetry PSA. Fix: gate on `!profile?.tosAcceptedAt` instead. Must be fixed in the same change as Google Sign-In. See `GOOGLESIGNINADDON.MD` Plan 2 Phase 2.
5. **`android_app_id` not set in `app.json`** for `react-native-google-mobile-ads` — will crash in production builds.
6. **Feed filter uses client-side filter** — loads last 100 posts then filters locally. Fine at current scale; revisit when post volume grows past ~500/day or following count exceeds ~25 (Firestore `in` limit).
