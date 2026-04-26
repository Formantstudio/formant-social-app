# Formant Social App

React Native mobile app for the Formant Audio community. Social feed with YouTube content, pet personas, follow system, and AdMob monetization.

**Platform:** Android (primary) / iOS
**Stack:** React Native 0.81 · Expo SDK 54 · Firebase 11 · TypeScript
**Firebase project:** `formant-social` (shared with FormantSocial web app)

---

## What's Live

- Email/password auth with disposable domain + profanity blocklist
- Email verification gate — unverified users can't reach the feed
- Onboarding — TOS + telemetry PSA acceptance (step 0), then display name + avatar setup
- Feed — follow-based (Tyler + pets + followed users), AdMob ads every 3–6 posts
- Like posts, follow/unfollow from feed cards
- Create posts — text posts (280 char) and YouTube link posts with auto-preview
- Tap any post → Post Detail screen with full comments thread
- Write comments on any post
- Tap any author → User Profile screen with their posts + follow button
- Profile screen — avatar (tap to change), display name, follower/following counts
- Auto-follow Tyler + all pet accounts on signup
- Seeded pet accounts: Hemi, Bubbles, Pearl, Cooper, Dozer

---

## What's Coming

See [`NEWFUNCTIONALITYADDON.MD`](NEWFUNCTIONALITYADDON.MD) for the full tiered feature plan.
See [`ADMOBADDON.MD`](ADMOBADDON.MD) for the ad placement plan.
See [`GOOGLESIGNINADDON.MD`](GOOGLESIGNINADDON.MD) for Google Sign-In + email hardening plan.
See [`FORMANTCOMPANIONSPLAN.MD`](FORMANTCOMPANIONSPLAN.MD) for the virtual pet system plan.
See [`TELEMETRY.MD`](TELEMETRY.MD) for the analytics + event tracking plan.
See [`REPORT.MD`](REPORT.MD) for the admin reporting plan.
See [`USERREPORT.MD`](USERREPORT.MD) for the user feedback + content reporting plan.

Current implementation state is tracked in [`COREFUNCTIONALITY.MD`](COREFUNCTIONALITY.MD).

---

## Project Structure

```
src/
  screens/
    LoginScreen.tsx          — auth (sign in + sign up)
    VerifyEmailScreen.tsx    — email verification gate
    OnboardingScreen.tsx     — first-login profile setup
    FeedScreen.tsx           — follow-based content feed + create post FAB
    ProfileScreen.tsx        — own profile
    UserProfileScreen.tsx    — any user's public profile + follow button
    PostDetailScreen.tsx     — full post view + comments
    CreatePostScreen.tsx     — text post + YouTube link post creation
  components/
    PostCard.tsx             — post card (tappable author + post body)
    AdCard.tsx / .native.tsx — AdMob banner (native) / stub (web)
    LogoAnimation.tsx        — animated logo for login
    LogoStamp.tsx            — static logo mark
  hooks/
    useAuthState.ts          — Firebase auth state + emailVerified
    useUserProfile.ts        — real-time user doc listener
    useFollowing.ts          — real-time following set
    useUserPosts.ts          — query posts by uid
    useComments.ts           — real-time comments subcollection listener
  lib/
    firebase.ts              — Firebase app init
    auth.ts                  — sign in/up, validation, error mapping
    followUser.ts            — shared toggleFollow() batch write
    normalizePost.ts         — maps web-ingested posts to PostCard shape
    constants.ts             — TYLER_UID
    petUsers.ts              — PET_UIDS map + ALL_PET_UIDS array
  navigation/
    AppNavigator.tsx         — stack + tab navigation, auth routing
  types/
    index.ts                 — UserProfile, Post, Comment interfaces
```

---

## Setup

```bash
npm install
npx expo start -c
```

Requires `.env` with:
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_YOUTUBE_API_KEY
EXPO_PUBLIC_YOUTUBE_CHANNEL_ID
EXPO_PUBLIC_ADMOB_BANNER_ANDROID
EXPO_PUBLIC_ADMOB_BANNER_IOS
```

---

## Play Store Build

```bash
eas build --platform android --profile production
```

---

## Known Blocking Issues

- `android_app_id` not set in `app.json` for `react-native-google-mobile-ads` — will crash in production. See `ADMOBADDON.MD`.
- YouTube channel accounts (Formant Audio, Hospital Records, Perfect Circuit) have no `users/` docs — can't be followed. Tier 1 fix in `NEWFUNCTIONALITYADDON.MD`.
- Feed filter is client-side (loads 100, filters locally). Fine for current scale.

---

## Documentation Chain

| File | Purpose | Updated when |
|---|---|---|
| `README.MD` | Live state overview, setup, blocking issues | A feature ships to live |
| `COREFUNCTIONALITY.MD` | Full audit of every live screen, hook, and component | Any code change |
| `RMUPDATE.MD` | Doc update protocol + implementation checklist | Process changes only |
| `NEWFUNCTIONALITYADDON.MD` | Tiered feature plan with implementation notes | Feature added/completed/descoped |
| `ADMOBADDON.MD` | Ad placement plan per screen | Ad unit added or screen added |
| `GOOGLESIGNINADDON.MD` | Google Sign-In + email hardening plan | Those phases complete |
| `FORMANTCOMPANIONSPLAN.MD` | Virtual pet system design | Implementation phases complete |
