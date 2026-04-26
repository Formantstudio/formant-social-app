import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export async function toggleFollow(
  currentUid: string,
  targetUid: string,
  isFollowing: boolean,
): Promise<void> {
  const followRef   = doc(db, "users", currentUid, "following", targetUid);
  const followerRef = doc(db, "users", targetUid,  "followers", currentUid);
  const authorRef   = doc(db, "users", targetUid);
  const meRef       = doc(db, "users", currentUid);

  if (isFollowing) {
    await deleteDoc(followRef);
    await deleteDoc(followerRef);
    await updateDoc(authorRef, { followersCount: increment(-1) });
    await updateDoc(meRef,     { followingCount: increment(-1) });
  } else {
    await setDoc(followRef,   { uid: targetUid,   followedAt: serverTimestamp() });
    await setDoc(followerRef, { uid: currentUid,  followedAt: serverTimestamp() });
    await updateDoc(authorRef, { followersCount: increment(1) });
    await updateDoc(meRef,     { followingCount: increment(1) });
  }
}
