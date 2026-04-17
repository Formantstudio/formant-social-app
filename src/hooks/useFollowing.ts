import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

// Returns the set of UIDs the given user is following
export function useFollowing(uid: string | null): Set<string> {
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) { setFollowing(new Set()); return; }
    const unsub = onSnapshot(
      collection(db, "users", uid, "following"),
      (snap) => setFollowing(new Set(snap.docs.map(d => d.id))),
      () => {},
    );
    return unsub;
  }, [uid]);

  return following;
}
