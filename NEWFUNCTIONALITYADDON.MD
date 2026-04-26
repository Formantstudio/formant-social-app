# New Functionality Plan

Ordered by impact + dependency. Each section covers what the screen/feature does,
what it needs built before it, and the key implementation notes.

---

## Tier 1 — Fixes that unlock everything else

These are prerequisites. Several Tier 2+ features won't make sense without them.

---

### 1. Follow-Based Feed Filter ✅ Live

**What:** Feed shows only posts from accounts you follow + Tyler + all pet accounts.
Client-side filter on last 100 posts (loads all, filters by followingSet ∪ ALWAYS_SHOW ∪ own posts).

**How:**
- `useFollowing` already returns a `Set<string>` of followed UIDs
- Query: `where("uid", "in", [...followingIds, TYLER_UID, ...ALL_PET_UIDS])`
- Firestore `in` supports 30 values max — fine for current scale, revisit if follow counts grow past ~25
- Fall back to showing Tyler + pets only if user follows nobody yet (cold start)

**Files:** `FeedScreen.tsx`, `useFollowing.ts`

---

### 2. Fix YouTube Post Field Mapping in PostCard ✅ Live

**What:** `normalizePost()` in `src/lib/normalizePost.ts` maps web-ingested fields to native PostCard shape before render. Both schemas now display correctly.
`PostCard` currently reads the native shape only — ingested posts render broken (no author, no likes).

**Field map needed:**
```
authorId  → uid
likesCount → likes
text      → content (for display)
authorAvatar → authorPhotoURL
```

**How:** Normalize incoming post in `FeedScreen` before passing to `PostCard`, or add a `normalizePost()` utility that reconciles both shapes into the `Post` interface.

**Files:** `PostCard.tsx` or `FeedScreen.tsx`

---

### 3. YouTube Channel User Profiles (Seeded Accounts)

**What:** Create `users/` documents for each ingested YouTube channel so they can be followed, viewed, and appear in a follow-based feed.

**Channels to seed:**
- `formant-audio-system` — Formant Audio (primary)
- `yt_UCvqNlMBp1YlGOalxXDEiubg` — Hospital Records
- `yt_UC3ifTl5zKiCAhHIBQYcaTeg` — Perfect Circuit

**How:** One-time Firestore write (run from admin console or a seed script):
```js
{
  uid: "yt_UC3ifTl5zKiCAhHIBQYcaTeg",
  displayName: "Perfect Circuit",
  photoURL: "", // YouTube channel avatar URL
  followingCount: 0,
  followersCount: 0,
  isSystemAccount: true,
  createdAt: serverTimestamp()
}
```

Once these docs exist, the follow button in PostCard works for them automatically.

---

### 4. Post Creation Screen ✅ Live

**What:** FAB (floating action button) on Feed → `CreatePostScreen`. Text posts (280 char) and YouTube URL posts (auto-detects videoId, fetches title via YouTube API, shows thumbnail preview). Posts write native post shape.

**UI:** Floating `+` FAB on Feed tab → bottom sheet or push screen with:
- **Text post:** multiline TextInput, 280 char limit, character counter, submit button
- **YouTube link post:** paste a YouTube URL → app detects it, fetches title + thumbnail via YouTube Data API, previews the card, confirms and posts

**Firestore write shape (native):**
```js
{
  uid: currentUser.uid,
  type: "text" | "youtube_video",
  content: text,          // text posts
  videoId: "...",         // youtube posts
  title: "...",           // youtube posts
  thumbnail: "...",       // youtube posts
  authorName: displayName,
  authorPhotoURL: photoURL,
  likes: 0,
  commentCount: 0,
  createdAt: serverTimestamp()
}
```

**Files:** New `src/screens/CreatePostScreen.tsx`, update `AppNavigator.tsx` + `FeedScreen.tsx`

---

## Tier 2 — Core Social Features

---

### 5. Post Detail Screen ✅ Live

**What:** Tapping any post (or the comment bubble) pushes `PostDetailScreen`. Shows the post, AdMob MEDIUM_RECTANGLE, then comments thread. Comment input pinned at bottom.

**Route:** `PostDetail: { postId: string }` — push from Feed or Profile

**Layout:**
```
[ PostCard (non-interactive, expanded) ]
[ AdMob MEDIUM_RECTANGLE ]
[ Comments list (FlatList) ]
[ Comment input bar pinned at bottom ]
```

**Files:** New `src/screens/PostDetailScreen.tsx`, update `AppNavigator.tsx`, `PostCard.tsx` (add onPress)

---

### 6. Comments ✅ Live

**What:** Read and write comments on posts. Lives in PostDetailScreen.

**Firestore:** `posts/{postId}/comments/{commentId}`
```js
{
  authorId: uid,
  authorName: displayName,
  authorPhotoURL: photoURL,
  text: commentText,
  createdAt: serverTimestamp()
}
```

**UI:** Lives in `PostDetailScreen`.
- FlatList of comment cards (avatar, name, text, timeAgo)
- TextInput pinned at bottom with send button
- On send: write to subcollection + `updateDoc` to increment `commentCount`
- Max 500 chars, empty guard

**Hook:** `useComments(postId)` — `onSnapshot` on the subcollection, ordered by `createdAt asc`

**Files:** New `src/hooks/useComments.ts`, update `PostDetailScreen.tsx`

---

### 7. Other User Profile Screen ✅ Live

**What:** Tapping any author name or avatar in PostCard pushes `UserProfileScreen`. Shows stats, follow button, system account badge for channels, their post feed, AdMob banner pinned bottom.

**Route:** `UserProfile: { uid: string }`

**Layout:**
```
[ Banner (avatar, name, bio, follower/following counts) ]
[ Follow / Following button ]
[ AdMob BANNER pinned bottom ]
[ Tab: Posts ]
[ FlatList of their posts ]
```

**Data:**
- `useUserProfile(uid)` already works for any UID
- Query their posts: `where("uid", "==", targetUid), orderBy("createdAt", "desc"), limit(20)`
- Follow/unfollow: same batch write pattern as PostCard's `toggleFollow`

**Files:** New `src/screens/UserProfileScreen.tsx`, update `AppNavigator.tsx`, `PostCard.tsx` (make author tappable)

---

### 8. Notifications Tab

**What:** In-app notification feed. New follower, like on your post, comment on your post.

**Tab:** Add `Notifications` to bottom tab bar (bell icon). Show badge count for unread.

**Firestore:** `notifications/{uid}/items/{notifId}`
```js
{
  type: "follow" | "like" | "comment",
  fromUid: string,
  fromName: string,
  fromPhotoURL: string,
  postId?: string,        // for like/comment
  postPreview?: string,   // first 60 chars of post text
  createdAt: timestamp,
  read: boolean
}
```

**Cloud Functions needed (in `FormantSocial/functions` or new):**
- `onFollowerCreate` — Firestore trigger on `users/{uid}/followers/{followerId}` create → write notification
- `onLikeCreate` — trigger on `posts/{postId}/likes/{uid}` create → write notification to post author
- `onCommentCreate` — trigger on `posts/{postId}/comments/{commentId}` create → write notification to post author

**Badge:** `useNotifications(uid)` hook reads `where("read", "==", false)` → count → show on tab bar

**Files:** New `src/screens/NotificationsScreen.tsx`, new `src/hooks/useNotifications.ts`, new Cloud Functions

---

### 9. Google Sign-In

**What:** One-tap Google login. Google users are pre-verified — skip `VerifyEmailScreen`.

**Packages needed:**
```
npx expo install expo-auth-session expo-web-browser
```

**How:** `useAuthRequest` from `expo-auth-session/providers/google` → get ID token → `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`

**`useAuthState` already handles it:** Google users pass `isEmailVerified` check automatically (providerData check is already in place).

**Files:** `src/screens/LoginScreen.tsx`, `src/lib/auth.ts`, `app.json` (add `scheme`), Google Cloud Console (add OAuth client ID)

---

## Tier 3 — Discovery

---

### 10. Search Screen

**What:** Search users by display name or username handle.

**Tab:** Replace or add `Search` tab (magnifying glass icon).

**How:**
- Add `displayName_lower` field to user docs on creation (lowercase for case-insensitive prefix search)
- Firestore query: `where("displayName_lower", ">=", query), where("displayName_lower", "<=", query + "")`
- Results: list of UserCards (avatar, name, follower count, follow button)
- Debounce input 300ms before querying

**Files:** New `src/screens/SearchScreen.tsx`, update `AppNavigator.tsx`, update signup batch write to include `displayName_lower`

---

### 11. Explore / Trending Tab

**What:** Discovery feed — posts from accounts you don't follow, or top posts by likes.

**Two modes:**
- **Trending:** query `posts`, `orderBy("likes", "desc")`, `limit(30)` — shows what's hot globally
- **New:** query `posts`, `orderBy("createdAt", "desc")`, `limit(50)` — unfiltered (basically current feed)

Toggle between modes with a segmented control at the top.

**Files:** New `src/screens/ExploreScreen.tsx`, update tab navigator

---

### 12. Edit Profile Screen

**What:** Edit display name, bio, username, avatar from the profile screen.
Currently only avatar can be changed from `ProfileScreen` — display name and bio can't be edited after onboarding.

**Fields:**
- Display name (32 char max)
- Username / @handle (20 chars, alphanumeric + underscore, unique)
- Bio (150 chars)
- Avatar (already working in ProfileScreen)

**Username uniqueness:** Query `where("username", "==", newUsername)` before saving — reject if taken.

**Files:** New `src/screens/EditProfileScreen.tsx`, update `ProfileScreen.tsx` (add Edit button)

---

## Tier 4 — Polish & Fun

---

### 13. Reactions (beyond likes)

**What:** Long-press the like button → emoji reaction picker. 🔥 💯 🎵 👏 😮
Show reaction counts per type below posts.

**Firestore:** Change `posts/{postId}/likes/{uid}` to store `{ reaction: "fire" | "100" | "music" | "clap" | "wow", ... }`.
Aggregate counts stored on the post doc: `reactions: { fire: 3, 100: 1, ... }`.

**Files:** `PostCard.tsx`, Cloud Function to maintain reaction counts

---

### 14. In-App Video Player

**What:** YouTube posts currently open the YouTube app via `Linking.openURL`.
Replace with an in-app WebView player so users stay in the app.

**How:** `expo-web-browser` or a `WebView` (`react-native-webview`) rendering `https://www.youtube.com/embed/{videoId}?autoplay=1`.
Full-screen modal on tap.

**Files:** New `src/components/VideoModal.tsx`, update `PostCard.tsx`

---

### 15. Repost

**What:** Share someone else's post to your own feed (like a retweet/boost).

**Firestore:**
```js
{
  uid: currentUser.uid,
  type: "repost",
  originalPostId: post.id,
  originalAuthorName: post.authorName,
  originalContent: post.content,
  authorName: currentUser.displayName,
  createdAt: serverTimestamp(),
  likes: 0,
  commentCount: 0
}
```

**UI:** Repost icon in PostCard footer (between like and comment). Tap → confirm sheet → posts.

**Files:** `PostCard.tsx`, new repost card variant in `PostCard.tsx` or new `RepostCard.tsx`

---

### 16. Settings Screen

**What:** App preferences. Currently there is no settings surface.

**Options:**
- Push notifications on/off (per type: likes, comments, follows)
- Theme: Dark / Light / System
- Account: change email, change password, delete account
- About: app version, links to TOS / Privacy Policy

**Files:** New `src/screens/SettingsScreen.tsx`, accessible from Profile tab header

---

### 17. Onboarding Flow Upgrade

**What:** Current onboarding asks only for display name + photo.
Add username + bio fields, and show a "suggested accounts to follow" step (Tyler + pets are auto-followed, but let users pick a few music channels too).

**Steps:**
1. Display name + photo (current)
2. Pick a username @handle
3. Write a short bio
4. "People you might like" — show the seeded YouTube channel accounts with follow toggles

**Files:** `OnboardingScreen.tsx` — expand to multi-step with progress indicator

---

## Dependency Map

```
Feed filter (1) ────────────────────────── needs: useFollowing ✅
YouTube field fix (2) ──────────────────── needs: nothing, do now
YouTube profiles (3) ───────────────────── needs: nothing, do now
Post creation (4) ──────────────────────── needs: nothing
Post detail (5) ────────────────────────── needs: nothing
Comments (6) ─────────────────���─────────── needs: Post detail (5)
User profile screen (7) ────────────────── needs: nothing
Notifications (8) ──────────────────────── needs: Cloud Functions, User profile (7)
Google Sign-In (9) ─────────────────────── needs: package install
Search (10) ────────────────────────────── needs: displayName_lower on user docs
Explore (11) ───────────────────────────── needs: nothing
Edit profile (12) ──────────────────────── needs: nothing
Reactions (13) ─────────────────────────── needs: Post detail (5)
In-app video (14) ──────────────────────── needs: nothing
Repost (15) ────────────────────────────── needs: Post creation (4)
Settings (16) ──────────────────────────── needs: nothing
Onboarding upgrade (17) ────────────────── needs: YouTube profiles (3)
```
