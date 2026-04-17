import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  followingCount: number;
  followersCount: number;
  createdAt?: any;
}

export function useUserProfile(uid: string | null) {
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!uid) { setProfile(null); setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setLoading(false);
      },
      (err) => {
        // permission-denied fires transiently during auth token propagation — ignore
        if (err.code !== "permission-denied") console.error(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  return { profile, loading };
}
