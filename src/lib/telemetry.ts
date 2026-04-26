import { addDoc, collection, serverTimestamp, getDocs, query, orderBy, limit, deleteDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const MAX_EVENTS = 200;
const PLATFORM   = "android"; // swap to Platform.OS when needed

/**
 * Log a telemetry event. Silently no-ops if:
 * - No user is logged in
 * - User's telemetryConsent is false/null (checked via cached profile)
 *
 * Writes to `telemetry/{uid}/events` subcollection, capped at MAX_EVENTS.
 * Firebase Analytics integration can be added here later without changing call sites.
 */
export async function trackEvent(
  event: string,
  props?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Consent is stored on the user doc — read from the module-level cache
    // passed in via setTelemetryConsent() below. Avoids a Firestore read per event.
    if (!_consentGranted) return;

    const eventsRef = collection(db, "telemetry", user.uid, "events");

    await addDoc(eventsRef, {
      event,
      props:     props || {},
      platform:  PLATFORM,
      timestamp: serverTimestamp(),
    });

    // Trim to MAX_EVENTS — delete oldest if over limit
    const countSnap = await getDocs(
      query(eventsRef, orderBy("timestamp", "asc"), limit(1))
    );
    // Simple approach: only trim when we write the 201st event
    // Full trim would require a count query — keep it cheap
    const allSnap = await getDocs(query(eventsRef, orderBy("timestamp", "asc")));
    if (allSnap.size > MAX_EVENTS) {
      const oldest = allSnap.docs.slice(0, allSnap.size - MAX_EVENTS);
      await Promise.all(oldest.map(d => deleteDoc(d.ref)));
    }
  } catch {
    // Telemetry must never crash the app
  }
}

// ─── Consent state ──────────────────────────────────────────────────────────

let _consentGranted = false;

/** Call this when the user profile loads so trackEvent can gate on consent. */
export function setTelemetryConsent(consent: boolean) {
  _consentGranted = consent;
}
