# Formant Social — Admin Reporting Plan

**Status:** 📋 Planned
**Audience:** Tyler (admin) only
**Access surface:** Formant Admin Console (`admin-console/`) at `C:/Users/rummy/firebase-projects/formant/admin-console/`
**Data source:** Firestore `telemetry/` collection + `users/` + `posts/` collections

---

## What Reports Are Needed

### 1. Daily Active Users (DAU / MAU)
- Source: `telemetry/{uid}/events` — count distinct UIDs with `app_open` in time window
- Display: line chart, 30-day rolling window
- Admin console widget: "Users" card on dashboard

### 2. New Signups
- Source: `users/` collection `createdAt` field
- Daily count of new docs
- Admin console widget: "Signups" sparkline

### 3. Content Volume
- Posts per day: count `posts/` docs by `createdAt`
- Comments per day: count across `posts/{id}/comments` subcollections
- Admin console widget: "Content" card

### 4. Engagement Rates
- Average likes per post: `posts` collection aggregate
- Average comments per post: `commentCount` field average
- Follow events per day: `telemetry` `follow` events

### 5. Top Posts (by likes)
- Query: `posts` orderBy `likes` desc, limit 20
- Display: table with post preview, author, like count, date
- Admin console: "Top Posts" panel

### 6. User Report Queue (moderation)
- Source: `reports/` collection (see USERREPORT.MD)
- All unresolved reports sorted by `reportedAt` desc
- Admin console: "Reports" tab with resolve/dismiss actions

### 7. Feedback Inbox
- Source: `feedback/` collection
- All submissions sorted by `submittedAt` desc
- Admin console: "Feedback" tab

---

## Implementation Plan

### Phase 1 — Firestore Queries (no Cloud Functions needed)
Build read-only panels in admin console that query Firestore directly.
Works for Tyler-only access, no aggregation needed at current scale.

**Admin console screens to add:**
- `AdminDashboard` — DAU chart, signup count, content volume cards
- `AdminTopPosts` — top 20 posts by likes
- `AdminReports` — unresolved user reports queue
- `AdminFeedback` — feedback submissions inbox

### Phase 2 — Cloud Function Aggregation (when Firestore query limits bite)
Once `posts` collection grows past ~10k docs, direct queries get slow.
Add a scheduled Cloud Function (`functions/reporting/`) that runs nightly:
- Writes `reportingSnapshots/{YYYY-MM-DD}` with pre-computed stats
- Admin console reads from snapshots instead of live collection

**Scheduled function:**
```js
exports.dailyReportSnapshot = onSchedule("every 24 hours", async () => {
  const userCount   = await db.collection("users").count().get();
  const postCount   = await db.collection("posts").count().get();
  await db.collection("reportingSnapshots").doc(todayKey).set({
    userCount: userCount.data().count,
    postCount: postCount.data().count,
    createdAt: FieldValue.serverTimestamp(),
  });
});
```

---

## Firestore Collections Used

| Collection | Purpose |
|---|---|
| `users/` | User counts, signup dates |
| `posts/` | Post counts, like totals |
| `telemetry/{uid}/events` | Per-user event history (if consent given) |
| `reports/` | User-submitted content reports |
| `feedback/` | User-submitted app feedback |
| `reportingSnapshots/{date}` | Pre-computed nightly stats (Phase 2) |

---

## Firestore Rules Notes

- `telemetry/{uid}/events` — read: `uid == request.auth.uid` (own data) OR `request.auth.token.admin == true`
- `reports/` — read: admin only. Write: any authenticated user.
- `feedback/` — read: admin only. Write: any authenticated user.
- `reportingSnapshots/` — read: admin only. Write: Cloud Function service account only.

---

## No External Analytics Service

Firebase Analytics (planned in TELEMETRY.MD) handles behavioral analytics.
This doc covers operational/moderation reporting that lives in Firestore and the admin console.
No Mixpanel, Amplitude, or other third-party services needed — keeps the stack simple and the data yours.
