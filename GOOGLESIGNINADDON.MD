# Google Sign-In + Email Anti-Spoofing — Implementation Plan

## Plan 1: Email Anti-Spoofing

The problem: formant-social-app has zero validation — anyone can sign up with a fake, disposable,
or offensive email and go straight to the feed.

FormantSocial already solved this. We port it over.

---

### Phase 1 — Pre-signup validation (client-side, src/lib/auth.ts)

- Port the disposable email blocklist (70+ domains: mailinator, guerrillamail, 10minutemail, etc.)
- Port the profanity/slur blocklist in the email local part (47 terms)
- Add basic email format regex check
- These run before createUserWithEmailAndPassword() is ever called

### Phase 2 — Email verification gate

- After signup, call sendEmailVerification(user)
- Add a VerifyEmailScreen (port from FormantSocial's VerifyEmail.tsx):
  - Shows the user's email
  - "Resend" button with 60s cooldown
  - "I've verified" button calls auth.currentUser.reload() then checks emailVerified
- Update AppNavigator.tsx to route unverified users to VerifyEmailScreen
  (can't reach Feed until verified)

### Phase 3 — Firestore rule hardening

- Add request.auth.token.email_verified == true to post/write rules
  so unverified accounts can't write even if they bypass the app

---

## Plan 2: Google Sign-In Security

The problem: No Google sign-in exists in formant-social-app yet, but GoogleAuthProvider is
already exported from firebase.ts. It needs to be wired up correctly and securely.

---

### Phase 1 — Wire up Google Sign-In

- Add Google sign-in button to LoginScreen.tsx
- Use signInWithRedirect (native) via expo-auth-session or
  @react-native-google-signin/google-signin — NOT signInWithPopup (web-only)
- Configure OAuth client ID in app.json for Android

### Phase 2 — Post-auth user profile guard

- On Google sign-in success, check if users/{uid} doc exists in Firestore
- If new user → route to OnboardingScreen (same as email flow)
- If returning user → route to Feed
- Prevents a Google user from skipping onboarding

### Phase 3 — Trust model

- Google users are pre-verified (Google already confirmed the email)
- In useAuthState.ts, mark Google users as emailVerified = true via provider check:
    user.providerData.some(p => p.providerId === 'google.com')
- They skip VerifyEmailScreen entirely
- Firestore rules still apply — Firebase automatically sets email_verified = true
  for OAuth providers, so the same token check works

### Phase 4 — Account linking guard (edge case)

- If a user tries to Google sign-in with an email that already has an
  email/password account, Firebase throws auth/account-exists-with-different-credential
- Handle this explicitly in the catch block:
  "You already have an account with this email — sign in with your password instead"
- Without this it's a silent failure that confuses users

---

## Reference: FormantSocial source files to port from

- src/lib/auth.ts — disposable + profanity blocklists, signUp(), signInWithGoogle()
- src/context/AuthContext.tsx — emailVerified flag, Google provider check
- src/pages/VerifyEmail.tsx — full verification screen with resend + cooldown
- src/pages/Login.tsx — Google OAuth button, error handling

## Current formant-social-app files to modify

- src/lib/firebase.ts — GoogleAuthProvider already exported, needs native OAuth setup
- src/hooks/useAuthState.ts — add emailVerified + provider detection
- src/screens/LoginScreen.tsx — add Google button, pre-signup validation
- src/navigation/AppNavigator.tsx — add VerifyEmailScreen route + guard
- firestore.rules — add email_verified token check to write rules
