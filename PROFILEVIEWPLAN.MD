# User Profile View — Implementation Plan

**Status:** 📋 Planned (Tier 2, item 7 in NEWFUNCTIONALITYADDON.MD)
**Dependencies:** None — can be built now
**Unlocks:** Notifications (8), Onboarding upgrade (17)

---

## What This Is

A screen that lets any user tap on another user's name or avatar anywhere in the app
and see their public profile. Includes their posts, follower/following counts, and a follow button.

This is separate from `ProfileScreen.tsx` which is the **own profile** view (already exists).

---

## Entry Points (where it gets opened from)

- `PostCard` — tap author avatar or author name → push `UserProfileScreen`
- `NotificationsScreen` (future) — tap a notification → push profile of the person who acted
- `SearchScreen` (future) — tap a search result → push profile
- `FollowersList` / `FollowingList` (future) — tap any name in the list

---

## Route

Add to `RootStackParamList` in `AppNavigator.tsx`:
```ts
UserProfile: { uid: string }
```

Navigate with:
```ts
navigation.push("UserProfile", { uid: post.uid })
```

---

## Screen Layout

```
┌─────────────────────────────────────────┐
│  ← Back                                 │  ← header
├─────────────────────────────────────────┤
│                                         │
│         [ Avatar — 88px ]               │
│         Display Name                    │
│         @username (if set)              │
│         Bio (if set)                    │
│                                         │
│   [ X Following ]   [ X Followers ]     │
│                                         │
│   [ Follow ]  or  [ Following ✓ ]       │  ← button
│                                         │
├─────────────────────────────────────────┤
│  AdMob BANNER (320×50) pinned bottom    │
├─────────────────────────────────────────┤
│  ── Posts ──                            │
│  [ PostCard ]                           │
│  [ PostCard ]                           │
│  [ AdMob MEDIUM_RECTANGLE ]             │  ← injected after 5 posts
│  [ PostCard ]                           │
│  ...                                    │
└─────────────────────────────────────────┘
```

**Own profile guard:** If `uid === auth.currentUser?.uid`, navigate to `ProfileScreen` instead
(or show an "Edit Profile" button in place of Follow).

---

## Data

| Data | Source |
|---|---|
| Profile info | `useUserProfile(uid)` — already exists, works for any UID |
| Following state | `useFollowing(currentUserUid)` — check if `uid` is in the set |
| Their posts | Firestore query: `where("uid", "==", uid), orderBy("createdAt", "desc"), limit(20)` |

New hook needed: `useUserPosts(uid)` — `onSnapshot` query for the above.

---

## Follow / Unfollow

Reuse the exact same batch write logic from `PostCard.tsx` `toggleFollow()`.
Extract it to a shared utility `src/lib/followUser.ts` so both `PostCard` and `UserProfileScreen` call the same function — no duplication.

```ts
// src/lib/followUser.ts
export async function toggleFollow(
  currentUid: string,
  targetUid: string,
  isFollowing: boolean
): Promise<void>
```

---

## System / Pet Account Profiles

YouTube channel accounts and pet accounts (`isSystemAccount: true`) get a slightly different header:
- No follow button shown for pet accounts (they're auto-followed on signup)
- Show a "🎵 Music Channel" or "🐾 Formant Pet" badge under their name
- Still show their posts

---

## Follower / Following Count Taps (stretch)

Tap the Following count → `FollowingListScreen` (list of who they follow)
Tap the Followers count → `FollowerListScreen` (list of their followers)

These are separate screens, not required for MVP of UserProfileScreen.
Query: `collection(db, "users", uid, "following")` — get UIDs, load their user docs.

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/screens/UserProfileScreen.tsx` | New screen |
| `src/hooks/useUserPosts.ts` | New hook |
| `src/lib/followUser.ts` | Extract from PostCard, shared utility |
| `src/navigation/AppNavigator.tsx` | Add `UserProfile` route |
| `src/components/PostCard.tsx` | Make author avatar + name tappable, call `followUser.ts` |
| `src/screens/ProfileScreen.tsx` | Call `followUser.ts` instead of inline logic |
| `COREFUNCTIONALITY.MD` | Update when live |
| `README.MD` | Update when live |

---

## Doc Updates When This Ships

Per `RMUPDATE.MD`:
1. Add `UserProfileScreen` + `useUserPosts` to COREFUNCTIONALITY.MD
2. Remove gap #5 from Known Issues in COREFUNCTIONALITY.MD
3. Mark item 7 ✅ Live in NEWFUNCTIONALITYADDON.MD
4. Update ADMOBADDON.MD — mark User Profile ad placements as implemented
5. Add "View any user's profile" to README.MD What's Live
