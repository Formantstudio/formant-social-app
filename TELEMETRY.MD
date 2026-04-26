# Formant Social — Telemetry Plan

**Status:** 📋 Planned — implementation ready
**Consent gate:** Users must accept the telemetry disclosure in onboarding before any events are logged.
**Legal basis:** Consent stored per-user (`tosAcceptedAt`, `telemetryConsent`). You noted telemetry rights are covered in your Play Store listing — this doc is the technical implementation plan.

---

## What We Track

### User Activity Events

| Event | When | Properties |
|---|---|---|
| `app_open` | App foregrounded | `uid`, `platform` |
| `screen_view` | Each screen push/focus | `screen_name`, `uid` |
| `post_created` | User publishes a post | `uid`, `type` (text/youtube_video) |
| `post_liked` | User likes a post | `uid`, `post_id`, `post_author_uid` |
| `post_unliked` | User unlikes a post | `uid`, `post_id` |
| `comment_written` | User submits a comment | `uid`, `post_id` |
| `video_opened` | User taps a YouTube post | `uid`, `video_id`, `post_id` |
| `follow` | User follows someone | `uid`, `target_uid` |
| `unfollow` | User unfollows someone | `uid`, `target_uid` |
| `profile_viewed` | User opens a profile (not own) | `uid`, `target_uid` |
| `post_detail_opened` | User opens post detail | `uid`, `post_id` |
| `create_post_opened` | User opens CreatePost screen | `uid` |
| `search_query` | User submits a search (future) | `uid`, `query_length` (not the query itself) |
| `feedback_submitted` | User submits in-app feedback | `uid`, `category` |
| `report_submitted` | User reports a post or user | `uid`, `report_type` |
| `sign_up` | New account created | `uid`, `method` (email) |
| `sign_in` | User signs in | `uid`, `method` |
| `sign_out` | User signs out | `uid` |
| `pet_action` (future) | Companion interaction | `uid`, `action_type`, `pet_species` |

### What We Do NOT Track

- Message content, post text, comment text
- Search query strings (only query length)
- Exact GPS location (platform/country from Firebase is fine)
- Any data from users who declined telemetry consent

---

## Storage Architecture

### Layer 1 — Firebase Analytics (aggregate / funnel)

Use Firebase Analytics via `@react-native-firebase/analytics`.

**Why:** Built-in retention, funnel, and cohort analysis in Firebase Console. Zero cost up to standard limits. Automatic session tracking, crash context, etc.

**Install:**
```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```
Requires bare/EAS build (already using EAS). Add `google-services.json` to Android.

**Usage:**
```ts
import analytics from "@react-native-firebase/analytics";
await analytics().logEvent("post_created", { type: "text" });
```

### Layer 2 — Custom Firestore Events (per-user audit trail)

For events where you need to query per-user history (admin review, moderation, debugging):

```
telemetry/{uid}/events/{eventId}
  event:     string
  props:     object
  timestamp: timestamp
  platform:  "android" | "ios" | "web"
```

Cap at **200 events per user** — trim oldest on write (client-side or Cloud Function trigger).

This layer is only written if `user.telemetryConsent === true`.

---

## Consent Check

All telemetry goes through a single utility:

```ts
// src/lib/telemetry.ts
export async function trackEvent(
  event: string,
  props?: Record<string, string | number | boolean>
): Promise<void>
```

Inside:
1. Read `telemetryConsent` from cached user profile
2. If `false` or `null` → return immediately, no log
3. If Firebase Analytics available → `analytics().logEvent(event, props)`
4. Write to `telemetry/{uid}/events` subcollection (trimmed to 200)

---

## Consent Data Model

Stored on `users/{uid}`:
```
tosAcceptedAt:      timestamp   // null if not yet accepted
tosVersion:         string      // "1.0" — bump when TOS changes
telemetryConsent:   boolean     // true = tracking on
telemetryUpdatedAt: timestamp   // when they last changed this setting
```

If `tosVersion` on user doc is older than current app TOS version → show re-consent screen.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/lib/telemetry.ts` | `trackEvent()` — consent gate + dual-write to Analytics + Firestore |
| `src/screens/OnboardingScreen.tsx` | Step 0: TOS + telemetry PSA before profile setup |
| `src/screens/SettingsScreen.tsx` | (future) Toggle telemetry on/off, show consent status |

---

## Current TOS Version

```
TOS_VERSION = "1.0"
```

Increment this string any time the TOS or data collection practices materially change. Users on older versions will see the re-consent screen on next login.

---

## Privacy Notes

- No PII in event property values (no names, emails, post content)
- `uid` is included — this is internal, not exposed to other users
- Users can withdraw consent from Settings → data collection stops immediately
- Retroactive deletion: if user deletes account, `telemetry/{uid}` subcollection is deleted with it (add to account deletion Cloud Function when built)
