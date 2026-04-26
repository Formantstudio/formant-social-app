# Documentation Update Protocol

This file defines how the markdown chain stays accurate as the app evolves.
The goal: every doc reflects reality, not aspiration. Nothing is marked live until it is.

---

## The Doc Chain

```
README.MD               ← user-facing summary of what's live right now
COREFUNCTIONALITY.MD    ← ground truth of every piece of code in the app
NEWFUNCTIONALITYADDON.MD ← tiered plan for what gets built next
ADMOBADDON.MD           ← ad placement plan per screen
GOOGLESIGNINADDON.MD    ← Google Sign-In + email hardening plan
RMUPDATE.MD             ← this file, the protocol itself
```

**COREFUNCTIONALITY.MD is the source of truth.** README.MD is a summary of it.
If those two disagree, COREFUNCTIONALITY.MD wins.

---

## Status Labels

Use these consistently across all planning docs:

| Label | Meaning |
|---|---|
| ✅ Live | Implemented, tested, in the current build |
| 🔧 In Progress | Currently being built this session |
| 📋 Planned | In the tier plan, not yet started |
| ⚠️ Broken | Exists in code but known to be broken |
| ❌ Descoped | Was planned, decided not to build |

---

## When a Feature is Implemented

Follow this checklist in order. Do not skip steps.

### 1. Code is written and tested on device
- Feature works on Android
- No console errors in the inspector
- Edge cases handled (empty state, loading state, error state)

### 2. Update `COREFUNCTIONALITY.MD`
- Add the new screen/component/hook to the relevant table
- Update the **Known Issues / Gaps** section — remove the gap if fixed, add any new ones discovered
- Update the Firestore data model section if new collections or fields were added
- Mark the feature ✅ Live

### 3. Update the relevant planning doc
- In `NEWFUNCTIONALITYADDON.MD`: mark the feature ✅ Live, add any implementation notes that differ from the plan
- In `ADMOBADDON.MD`: update the summary table status if an ad placement shipped
- In `GOOGLESIGNINADDON.MD`: mark the phase complete if applicable

### 4. Update `README.MD`
- Add the feature to the **What's Live** section (one line, plain English)
- Remove it from **What's Coming** if it was listed there
- Update **Known Blocking Issues** if the feature resolved one or revealed a new one

### 5. Check the dependency map in `NEWFUNCTIONALITYADDON.MD`
- Did this feature unlock any other features that were blocked?
- If yes, note them as ready to start

---

## Implementation Order (Tier System)

Always work Tier 1 → Tier 2 → Tier 3 → Tier 4.
Never implement a Tier 2 feature before all Tier 1 items are live.
Exception: independent features with no dependencies can be pulled forward if Tier 1 is blocked on external factors (e.g. Google Sign-In package install).

### Tier 1 — Foundational (do these first)
1. Follow-based feed filter
2. YouTube post field mapping fix (PostCard)
3. YouTube channel user profiles (seed Firestore docs)
4. Post creation screen
5. Fix `app.json` AdMob App ID (blocking production crash)

### Tier 2 — Core Social
6. Post detail screen
7. Comments
8. Other user profile screen
9. Notifications tab + Cloud Functions
10. Google Sign-In (`GOOGLESIGNINADDON.MD` Plan 2)

### Tier 3 — Discovery
11. Search screen
12. Explore / trending tab
13. Edit profile screen

### Tier 4 — Polish
14. Reactions
15. In-app video player
16. Repost
17. Settings screen
18. Onboarding flow upgrade

---

## When Starting a New Session

Before writing any code, do this:

1. Read `COREFUNCTIONALITY.MD` — know what's actually live
2. Read `NEWFUNCTIONALITYADDON.MD` — check what tier we're on
3. Check the **Known Issues / Gaps** section of `COREFUNCTIONALITY.MD` — anything blocking?
4. Confirm the feature being built this session, its tier, and its dependencies

---

## Rules

- **Never mark something ✅ Live until it's tested on the Android device.** Compiles ≠ works.
- **Never add a feature to README's "What's Live" section speculatively.** Live means live.
- **If a feature is partially done**, mark it 🔧 In Progress in COREFUNCTIONALITY.MD with a note on what's missing.
- **If a gap is discovered during implementation** (something broken or missing that wasn't known), add it to the Known Issues section of COREFUNCTIONALITY.MD immediately — don't wait until it's fixed.
- **If the plan changes** (a feature is descoped, split, or redesigned), update NEWFUNCTIONALITYADDON.MD to reflect the new plan. Don't leave stale planning docs.
- **Doc updates happen in the same session as the code change.** Never defer docs to "later."

---

## Quick Reference — Which Doc to Open

| Task | Open this |
|---|---|
| "What does X screen currently do?" | `COREFUNCTIONALITY.MD` |
| "What should we build next?" | `NEWFUNCTIONALITYADDON.MD` |
| "Where do ads go on the new screen?" | `ADMOBADDON.MD` |
| "How do I set up the project?" | `README.MD` |
| "What's the update process again?" | `RMUPDATE.MD` (this file) |
| "What's the Google Sign-In plan?" | `GOOGLESIGNINADDON.MD` |
