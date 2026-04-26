import { useEffect, useState } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";

function isEmailVerified(user: User | null): boolean {
  if (!user) return false;
  const isGoogleUser = user.providerData.some(p => p.providerId === "google.com");
  return isGoogleUser || user.emailVerified;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading, emailVerified: isEmailVerified(user) };
}
