# AdMob Ad Placement Plan

**Current package:** `react-native-google-mobile-ads` v16.3.2
**Current ads:** Banner (MEDIUM_RECTANGLE) injected every 3–6 posts in Feed
**Required before any of this works:** Set `android_app_id` in `app.json` under `react-native-google-mobile-ads` key — SDK crashes on launch without it.

---

## Ad Unit Types Available (no new packages needed)

| Type | Class | Best for |
|---|---|---|
| Banner | `BannerAd` | Persistent, low-intrusion placements |
| Interstitial | `InterstitialAd` | Full-screen on natural transition points |
| Rewarded | `RewardedAd` | Opt-in, user gets something in return |
| Rewarded Interstitial | `RewardedInterstitialAd` | Less intrusive rewarded — shown without explicit opt-in |
| Native (Advanced) | `NativeAd` | Blends into feed as a card — requires extra setup |

For now, sticking to **Banner** and **Interstitial** as noted. Native ads would give the cleanest feed experience but require a native ad template — flagged for later.

---

## Per-Screen Ad Plan

---

### Feed Screen (`FeedScreen.tsx`)

**Current:** MEDIUM_RECTANGLE banner injected every 3–6 posts via `injectAds()`.

**Additions:**
- No changes needed for now — current placement is solid.
- Future: replace `AdCard` (MEDIUM_RECTANGLE) with a **NativeAd** card that matches PostCard styling for seamless integration.
- Keep injection logic in `injectAds()` — easy to swap ad type without changing feed logic.

**Env vars needed:**
- `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` ✅ already in `.env`
- `EXPO_PUBLIC_ADMOB_BANNER_IOS` ✅ already in `.env`

---

### Profile Screen — Own Profile (`ProfileScreen.tsx`)

**Placement:** Fixed banner at the **bottom** of the screen, above the tab bar.
Pinned with `position: absolute` at the bottom of the ScrollView's parent, not inside the scroll.

**Ad size:** `BannerAdSize.BANNER` (320×50) — less intrusive than MEDIUM_RECTANGLE on a profile page.

**Implementation:**
```tsx
// Wrap root View, add banner pinned to bottom
<View style={{ flex: 1 }}>
  <ScrollView>...</ScrollView>
  <BannerAd unitId={BANNER_UNIT} size={BannerAdSize.BANNER} />
</View>
```

**Env vars needed:**
- Reuse existing `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` / `_IOS`

---

### Other User Profile Screen (planned — `UserProfileScreen.tsx`)

**Placement 1:** **Leaderboard banner** (728×90 on tablet, BANNER on phone) pinned at bottom — same as own profile.

**Placement 2:** After their first 3 posts in the profile post list, inject one MEDIUM_RECTANGLE — same `injectAds()` pattern as Feed.

**Rationale:** Users browse other profiles looking at their content — same scroll pattern as Feed, same injection logic applies.

---

### Post Detail Screen (planned — `PostDetailScreen.tsx`)

**Placement:** One MEDIUM_RECTANGLE banner directly below the post card, above the comments list.

```
[ PostCard ]
[ AdMob MEDIUM_RECTANGLE ]  ← here
[ Comments list ]
```

**Rationale:** Natural pause point — user just finished reading/watching, about to scroll into comments. High attention moment.

**Env vars needed:**
- Reuse existing banner unit IDs

---

### Comments Screen / Modal (planned)

**Placement:** Fixed BANNER (320×50) pinned at the bottom of the comments sheet.
Not injected mid-list — comment threads should feel uninterrupted.

---

### Search / Explore Screen (planned)

**Placement:** MEDIUM_RECTANGLE after the first 5 results in any search result list.
Only shown if results exist — no ad on empty state.

---

### Interstitial — Navigation Events

**Where:** On navigation FROM Feed → Post Detail (not every time — every 4th tap).

**Implementation:**
- Keep a ref counter in Feed: `interstitialCount = useRef(0)`
- On PostCard tap: increment counter → if `count % 4 === 0` → show interstitial → then navigate
- Use `InterstitialAd.createForAdRequest(UNIT_ID)` — preload on Feed mount, reload after shown

```tsx
const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
// preload
interstitial.load();
// on 4th tap
interstitial.show(); // then navigate in the 'closed' event listener
```

**Env vars needed:**
- `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID`
- `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS`

**Important:** Only trigger interstitials on meaningful navigation — not on back, not on tab switch. Google Play policy prohibits interstitials on unexpected/back-button actions.

---

### Rewarded Ad — Optional Feature Unlock (future)

Not planned for current build. Placeholder idea: "Watch an ad to remove ads for 1 hour" — store `adFreeUntil` timestamp in Firestore under the user's doc.

---

## app.json Changes Required

Add to `app.json` under the `expo` key:

```json
{
  "expo": {
    ...
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
        }
      ]
    ]
  }
}
```

Replace with your real AdMob App IDs from the AdMob console (different from the ad unit IDs — the App ID is the `ca-app-pub-XXX~XXX` format under Apps in AdMob).

**This is the fix for the current crash warning.** Without it the native SDK initializes with no app ID and crashes.

---

## .env Additions Needed

```
# Already present
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-xxx/xxx
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-xxx/xxx

# Add these when interstitials are implemented
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-xxx/xxx
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-xxx/xxx
```

---

## Summary — Implementation Order

| Priority | Screen | Type | Status |
|---|---|---|---|
| 1 | Fix `app.json` App ID | Config | Blocking — crashes without it |
| 2 | Feed | MEDIUM_RECTANGLE | ✅ Done |
| 3 | Own Profile | BANNER (bottom) | Ready to implement |
| 4 | Post Detail | MEDIUM_RECTANGLE (below post) | Needs PostDetailScreen first |
| 5 | Other User Profile | BANNER (bottom) + injected | Needs UserProfileScreen first |
| 6 | Comments | BANNER (bottom) | Needs CommentsScreen first |
| 7 | Feed → Post Detail | Interstitial (every 4th tap) | Needs PostDetailScreen + new env vars |
| 8 | Search/Explore | MEDIUM_RECTANGLE (after 5 results) | Needs SearchScreen first |
