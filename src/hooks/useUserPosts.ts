import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Post } from "../components/PostCard";
import { normalizePost } from "../lib/normalizePost";

export function useUserPosts(uid: string | null): { posts: Post[]; loading: boolean } {
  const [posts,   setPosts]   = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setPosts([]); setLoading(false); return; }

    const q = query(
      collection(db, "posts"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(30),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map(d => normalizePost({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        if (err.code !== "permission-denied") console.error(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  return { posts, loading };
}
