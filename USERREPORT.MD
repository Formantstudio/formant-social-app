# Formant Social — User Feedback & Reporting Plan

**Status:** 📋 Planned
**Two distinct systems:** (1) In-app feedback from users to Tyler, (2) Content/user reports for moderation

---

## System 1 — In-App Feedback

### What It Is
A screen where users can send Tyler direct feedback about the app — bugs, suggestions, complaints, praise.

### Entry Point
Profile tab → "Send Feedback" button below the sign-out button.

### Screen Layout
```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│                                         │
│  What kind of feedback?                 │
│  [ Bug ]  [ Suggestion ]  [ Other ]     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ Describe the issue or idea...    │   │
│  │                                  │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│  500 chars max                          │
│                                         │
│  [ Send Feedback ]                      │
│                                         │
└─────────────────────────────────────────┘
```

### Firestore Write
```
feedback/{auto-id}:
  uid:         string
  displayName: string
  email:       string
  category:    "bug" | "suggestion" | "other"
  text:        string (max 500 chars)
  appVersion:  string
  platform:    "android" | "ios"
  submittedAt: timestamp
  read:        false
```

### File
- New: `src/screens/FeedbackScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx` — add "Send Feedback" button
- Modify: `src/navigation/AppNavigator.tsx` — add `Feedback` route

---

## System 2 — Content & User Reports

### What It Is
Users can flag posts or other users for violating community guidelines. Reports go into a moderation queue visible in the admin console.

### Entry Points
- **Post report:** Long-press a post (or `⋯` overflow menu on PostCard) → "Report Post"
- **User report:** On `UserProfileScreen` → overflow menu → "Report User"

### Report Categories
```
Post reports:
  "spam"          — spam or irrelevant
  "harassment"    — targeting or bullying
  "inappropriate" — explicit or offensive content
  "misinformation"

User reports:
  "spam_account"  — bot or spam
  "harassment"    — targeting me or others
  "impersonation" — pretending to be someone else
```

### Firestore Write

**Post report:**
```
reports/{auto-id}:
  type:        "post"
  reportedId:  postId
  reportedUid: post.uid
  reporterUid: currentUid
  category:    string
  notes:       string (optional, max 200 chars)
  reportedAt:  timestamp
  status:      "pending" | "resolved" | "dismissed"
  resolvedAt:  timestamp | null
  resolvedBy:  string | null
```

**User report:**
```
reports/{auto-id}:
  type:        "user"
  reportedId:  targetUid
  reportedUid: targetUid
  reporterUid: currentUid
  category:    string
  notes:       string (optional)
  reportedAt:  timestamp
  status:      "pending"
  resolvedAt:  null
  resolvedBy:  null
```

### Rate Limiting
Max **3 reports per hour per user** — enforced via Firestore rule counting recent writes:
```
allow create: if request.auth != null
  && request.resource.data.reporterUid == request.auth.uid;
```
Additional rate limit via `reportRateLimits/{reporterUid}` doc (same pattern as `companionInteractions`).

### Admin Queue (see REPORT.MD)
All `status == "pending"` reports visible in admin console "Reports" tab.
Admin can: **Resolve** (take action, mark resolved) or **Dismiss** (no action needed).
Resolved/dismissed reports stay in Firestore for audit trail.

---

## System 3 — TOS / Telemetry Consent (Onboarding)

### What It Is
Step 0 of onboarding. Before setting up their profile, every new user sees:
- What the app is, who runs it
- TOS summary (what they're agreeing to)
- Data collection / telemetry disclosure (what we track and why)
- Two buttons: **Accept & Continue** | **Sign Out**

No dark patterns — decline = sign out, not a degraded experience.

### TOS Content (v1.0)
```
Formant Social — Terms of Use

By using Formant Social you agree to:
• Not post illegal, abusive, or spam content
• Not impersonate other users
• Give Formant the right to display your posts in the app feed

Privacy & Data:
• We collect basic usage data (which screens you visit, actions you take)
  to improve the app experience
• We do NOT sell your data or share it with advertisers
• You can turn off data collection at any time in Settings

This app is operated by Tyler Johnston-Kent (tyler@formant.ca).
Questions? Email us.
```

### Firestore Write on Accept
```
users/{uid}:
  tosAcceptedAt:      serverTimestamp()
  tosVersion:         "1.0"
  telemetryConsent:   true
  telemetryUpdatedAt: serverTimestamp()
```

### Files to Modify / Create
- Modify: `src/screens/OnboardingScreen.tsx` — add `step` state, render TOS screen at step 0
- No new route needed — it's a step inside the existing OnboardingScreen

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/screens/FeedbackScreen.tsx` | New screen |
| `src/screens/OnboardingScreen.tsx` | Add TOS/PSA step 0 |
| `src/screens/ProfileScreen.tsx` | Add "Send Feedback" + "Report" links |
| `src/screens/UserProfileScreen.tsx` | Add overflow → "Report User" |
| `src/components/PostCard.tsx` | Add long-press / overflow → "Report Post" |
| `src/navigation/AppNavigator.tsx` | Add `Feedback` route |
| `src/lib/telemetry.ts` | `trackEvent()` with consent gate |
| `COREFUNCTIONALITY.MD` | Update when live |
| `README.MD` | Update when live |

---

## Scope Limits

- No automated moderation (AI content scanning) — manual admin review only for now
- No user bans from the mobile app — admin console only
- No in-app notification to reporter when their report is resolved — keep it simple
- No appeals process — Tyler makes the call
