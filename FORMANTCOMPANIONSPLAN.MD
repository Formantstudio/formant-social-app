# Formant Companions — Virtual Pet System Plan

**Feature name:** Formant Companions
**Tagline:** Your pet, your vibe.
**Status:** 📋 Planned — design phase
**Dependencies:** UserProfileScreen (profile is where the pet lives), Edit Profile (username)

---

## Concept

Every user gets one virtual pet that lives on their profile. The pet has needs —
hunger, happiness, energy, cleanliness — that decay over time. You keep it alive
by checking in and interacting with it. Neglect it and it gets sad. Take good care
of it and it levels up, changes appearance, and earns display rewards.

The pet is visible to anyone who views your profile. Other users can interact
with your pet too (gift it a treat, play with it) — this is the social hook.

This is separate from the Formant Audio pet personas (Hemi, Bubbles, Pearl, etc.)
which are content accounts. Companions are user-owned personal pets.

---

## Pet Species

| Species | Personality vibe | Notes |
|---|---|---|
| 🐱 Cat | Aloof, independent | Needs less attention, harder to max happiness |
| 🐶 Dog | Eager, loyal | Happiness decays faster, easier to level up |
| 🐹 Hamster | Hyperactive, chaotic | Needs more food, very reactive to play |
| 🐍 Snake | Chill, mysterious | Eats rarely, low maintenance, slow leveler |
| 🦎 Bearded Dragon | Laid back, social | Loves sunbathing (timed daily action) |
| 🐰 Bunny | Soft, jumpy | Needs lots of play, comfort-focused |

Each species has different stat decay rates — a dog's happiness drops faster than
a snake's. This gives each species a distinct maintenance personality.

---

## Pet Stats

| Stat | Range | Decays over time? | Visible to others? |
|---|---|---|---|
| Hunger | 0–100 | Yes — drops ~10/hr | Yes (emoji indicator) |
| Happiness | 0–100 | Yes — drops ~8/hr | Yes |
| Energy | 0–100 | Yes — drops ~6/hr | No (internal only) |
| Cleanliness | 0–100 | Yes — drops ~4/hr | Yes |
| Health | 0–100 | Only if other stats hit 0 | Yes |
| Level | 1–50 | Never — only goes up | Yes (shown on profile) |
| XP | 0–XP_NEXT | Never decays | No |

**Health penalty:** If Hunger OR Happiness hits 0 for more than 2 hours, Health
starts dropping. At Health 0 the pet enters a "worn out" state — not dead,
but visually distressed and all interactions are locked until Health is restored
with a "Rest" action.

---

## Actions (what you can do with your pet)

| Action | Effect | Cooldown |
|---|---|---|
| Feed | +25 Hunger, +5 Happiness, +10 XP | 1 hour |
| Play | +30 Happiness, -15 Energy, +15 XP | 2 hours |
| Clean | +40 Cleanliness, +5 Happiness, +5 XP | 3 hours |
| Sleep | +50 Energy, -5 Happiness (they'd rather play), +5 XP | 8 hours |
| Sunbathe (Bearded Dragon only) | +20 Energy, +20 Happiness, +10 XP | 24 hours |
| Rest (recovery) | +30 Health, requires Health < 50 | 6 hours |
| Train | +20 XP, -10 Energy, -5 Hunger | 4 hours |

Cooldowns are stored as timestamps in Firestore so they're enforced server-side,
not just client-side.

---

## Social Actions (other users interacting with your pet)

| Action | Effect on pet | Effect on visitor | Limit |
|---|---|---|---|
| Gift a treat | +15 Hunger, +10 Happiness | None | 3 per day per visitor |
| Play with pet | +15 Happiness, -10 Energy | +5 XP on visitor's own pet | 2 per day per visitor |
| Compliment | +10 Happiness | Shows in owner's notification | 5 per day per visitor |

Social interactions show up in a pet activity log: "Bubbles gifted your snake a treat 2h ago."
This drives return visits and cross-profile engagement.

---

## Leveling System

XP thresholds increase per level. Suggested curve:

| Level | XP needed | What changes |
|---|---|---|
| 1–5 | 50 XP each | Starter appearance |
| 6–10 | 100 XP each | Unlock accessory slot 1 (hats) |
| 11–20 | 200 XP each | Unlock accessory slot 2 (backgrounds) |
| 21–30 | 400 XP each | Unlock color variants |
| 31–40 | 600 XP each | Unlock animated idle |
| 41–50 | 1000 XP each | Max level — special badge on profile |

On level-up: show a celebration animation on the pet, write a post to their feed
automatically ("🎉 [PetName] reached level 12!") unless user opts out.

---

## Pet Appearance

Each pet has:
- **Base sprite** — species-specific pixel art or flat vector (4 emotional states: happy, neutral, sad, worn out)
- **Color variant** — unlocked at level 21+
- **Accessory: hat** — unlocked at level 6, chosen by user
- **Background tile** — unlocked at level 11, shown behind pet on profile card

Emotional state is determined by lowest stat:
- All stats > 60 → happy
- Any stat 30–60 → neutral
- Any stat < 30 → sad
- Health < 20 → worn out (overrides all)

---

## Firestore Data Model

### `users/{uid}/companion/pet`
One document per user (subcollection keeps it clean and permission-scoped):
```
species: "cat" | "dog" | "hamster" | "snake" | "bearded_dragon" | "bunny"
name: string                    // user-chosen pet name
level: number
xp: number
stats: {
  hunger: number,
  happiness: number,
  energy: number,
  cleanliness: number,
  health: number
}
lastUpdated: timestamp          // when stats were last recalculated
cooldowns: {
  feed: timestamp | null,
  play: timestamp | null,
  clean: timestamp | null,
  sleep: timestamp | null,
  rest: timestamp | null,
  train: timestamp | null,
  sunbathe: timestamp | null    // bearded dragon only
}
appearance: {
  colorVariant: string | null,  // null until unlocked
  hat: string | null,
  background: string | null
}
createdAt: timestamp
```

### `users/{uid}/companion/activityLog`
Subcollection of recent events (cap at 50, delete oldest):
```
type: "feed" | "play" | "clean" | "gift" | "levelup" | "social_play"
actorUid: string               // who did the action (owner or visitor)
actorName: string
timestamp: timestamp
details: string                // "gifted a treat", "played fetch", etc.
```

### Social action rate limiting
```
companionInteractions/{visitorUid}_{ownerUid}: {
  giftCount: number,
  playCount: number,
  complimentCount: number,
  windowStart: timestamp       // reset every 24h
}
```

---

## UI Placement

### On own Profile Screen
A dedicated **Companion Card** section between the stats row and the sign-out button:

```
┌─────────────────────────────────────────┐
│  🐍 Noodle  •  Lv.7                     │
│                                         │
│  [ Pet sprite — animated if lv 31+ ]   │
│                                         │
│  😋 Hunger ████████░░  80               │
│  😊 Happy  ██████░░░░  60               │
│  ✨ Clean  █████████░  90               │
│                                         │
│  [ Feed ]  [ Play ]  [ Clean ]  [ … ]  │
└─────────────────────────────────────────┘
```

Actions show cooldown timers when on cooldown: "Feed (42m)".

### On other user's Profile Screen
A read-only **Companion Card** with social action buttons:

```
┌─────────────────────────────────────────┐
│  🐱 Mochi  •  Lv.14  ★                 │
│                                         │
│  [ Pet sprite ]                         │
│                                         │
│  😊 Happy  ███████░░░  70               │
│  ✨ Clean  ████░░░░░░  45               │
│                                         │
│  [ 🍪 Gift Treat ]  [ 🎾 Play ]        │
└─────────────────────────────────────────┘
```

### New Pet Setup (first time)
After onboarding (or from a "Get a Pet" prompt on profile):
1. Choose species — show all 6 with their personality blurb
2. Name your pet (20 char max)
3. Pet appears immediately at Level 1, all stats at 70

---

## Stat Decay Calculation

Stats decay continuously but are NOT stored every second.
Instead, store `lastUpdated` timestamp and calculate current stats on-read:

```ts
function calculateCurrentStats(pet: CompanionData): Stats {
  const hoursElapsed = (Date.now() - pet.lastUpdated.toMillis()) / 3600000;
  return {
    hunger:      clamp(pet.stats.hunger - (decayRates[pet.species].hunger * hoursElapsed), 0, 100),
    happiness:   clamp(pet.stats.happiness - (decayRates[pet.species].happiness * hoursElapsed), 0, 100),
    energy:      clamp(pet.stats.energy - (decayRates[pet.species].energy * hoursElapsed), 0, 100),
    cleanliness: clamp(pet.stats.cleanliness - (decayRates[pet.species].cleanliness * hoursElapsed), 0, 100),
    health:      calculateHealth(pet, hoursElapsed),
  };
}
```

When an action is taken, write the current calculated stats + new `lastUpdated` timestamp back to Firestore.
This avoids continuous writes and scheduled functions just for stat decay.

---

## Species Decay Rates (per hour)

| Species | Hunger | Happiness | Energy | Cleanliness |
|---|---|---|---|---|
| Cat | 8 | 5 | 5 | 3 |
| Dog | 10 | 12 | 7 | 6 |
| Hamster | 14 | 10 | 9 | 8 |
| Snake | 3 | 4 | 3 | 2 |
| Bearded Dragon | 6 | 6 | 4 | 4 |
| Bunny | 9 | 11 | 6 | 7 |

---

## Notifications

Push notification triggers:
- Any stat hits 20 → "🐍 Noodle is getting hungry! Don't forget to check in."
- Any stat hits 0 → "🐍 Noodle is really struggling. Come back soon!"
- Level up → "🎉 Noodle reached Level 8!"
- Someone gifts your pet → "🍪 @username gifted Noodle a treat"

Frequency cap: max 2 decay notifications per pet per day to avoid spam.

---

## Hooks Needed

| Hook | What it does |
|---|---|
| `useCompanion(uid)` | Real-time listener on `users/{uid}/companion/pet`. Calculates live stats on read. |
| `useCompanionActions(uid)` | Exposes `feed()`, `play()`, `clean()`, `sleep()`, `train()`, `rest()` — each checks cooldown, writes new stats + cooldown timestamp |
| `useCompanionLog(uid)` | Reads last 10 activity log entries |
| `useSocialCompanionActions(ownerUid)` | Exposes `giftTreat()`, `socialPlay()`, `compliment()` — enforces per-visitor daily limits |

---

## Firestore Rules Notes

- `users/{uid}/companion/pet` — read: any authenticated user. Write: only `uid` (owner).
- `companionInteractions/{doc}` — read/write: any authenticated user (rate limit enforcement).
- Activity log writes from social actions need a Cloud Function or carefully scoped rules.

---

## Token / Firestore Cost Notes

Stat decay is calculated on-read, not written on a schedule — **zero scheduled function cost**.
Writes only happen when a user takes an action (bounded by cooldowns).
At scale the main cost is the social interaction documents and activity log.
Activity log should be capped at 50 entries per pet with a Cloud Function cleanup trigger
or a client-side trim on write.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/hooks/useCompanion.ts` | Live stat calculation + listener |
| `src/hooks/useCompanionActions.ts` | All owner actions with cooldown logic |
| `src/hooks/useSocialCompanionActions.ts` | Visitor actions with daily rate limits |
| `src/hooks/useCompanionLog.ts` | Activity log reader |
| `src/components/CompanionCard.tsx` | Pet display card (own + other user variants) |
| `src/components/CompanionSetup.tsx` | Species picker + name input (first-time flow) |
| `src/lib/companionDecay.ts` | `calculateCurrentStats()`, decay rate constants |
| `src/types/companion.ts` | All companion TypeScript interfaces |

Modify:
- `src/screens/ProfileScreen.tsx` — add CompanionCard below stats
- `src/screens/UserProfileScreen.tsx` — add read-only CompanionCard with social actions
- `src/navigation/AppNavigator.tsx` — no new routes needed (companion lives on profile screens)
- `COREFUNCTIONALITY.MD` — when live
- `README.MD` — when live

---

## What This Is NOT (scope limits)

- No PvP or pet battles — keep it chill
- No in-app currency or purchases — XP only, no pay-to-win
- No pet trading — the companion is permanently yours
- No death mechanic — "worn out" is the floor, pets don't die
- No breeding — one pet per user
