import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Comment {
  id:             string;
  authorId:       string;
  authorName:     string;
  authorPhotoURL: string;
  text:           string;
  createdAt:      any;
}

export function useComments(postId: string): { comments: Comment[]; loading: boolean } {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!postId) { setComments([]); setLoading(false); return; }

    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
        setLoading(false);
      },
      (err) => {
        if (err.code !== "permission-denied") console.error(err);
        setLoading(false);
      },
    );
    return unsub;
  }, [postId]);

  return { comments, loading };
}
