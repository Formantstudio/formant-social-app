import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.info", "guerrillamail.biz",
  "guerrillamail.de", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "grr.la", "sharklasers.com", "spam4.me", "yopmail.com", "yopmail.fr",
  "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj",
  "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
  "dispostable.com", "mailnull.com", "spamgourmet.com", "mailnesia.com",
  "maildrop.cc", "getnada.com", "discard.email", "mailsac.com",
  "spamhereplease.com", "binkmail.com", "bob.email", "inboxbear.com",
  "tempr.email", "nwytg.net", "objectmail.com", "rtrtr.com",
  "spamfree24.org", "tempmail.com", "tempmail.net", "tempail.com",
  "tempe-mail.com", "tmpmail.net", "tmpmail.org", "tmpeml.com",
  "10minutemail.com", "10minutemail.net", "minutemail.com", "emailondeck.com",
  "throwam.com", "fakeinbox.com", "trashmail.com", "temp-mail.org",
  "trashmail.at", "trashmail.io", "trashmail.me", "trashmail.xyz",
  "mailtemp.net", "spamgrap.com", "spamoff.de", "mailzilla.org",
  "0-mail.com", "0815.ru", "0clickemail.com", "027168.com",
  "0wnd.net", "0wnd.org", "10mail.org", "20mail.it", "20minutemail.com",
  "2prong.com", "30minutemail.com", "33mail.com", "3d-painting.com",
]);

const BLOCKED_TERMS = [
  "fuck", "shit", "cunt", "bitch", "ass", "cock", "dick", "pussy", "whore",
  "slut", "fag", "faggot", "dyke", "nigger", "nigga", "chink", "spic", "kike",
  "wetback", "gook", "cracker", "honky", "tranny", "retard", "rape", "rapist",
  "pedo", "pedophile", "nazi", "hitler", "bastard", "jackass", "asshole",
  "motherfuck", "bullshit", "horseshit", "dipshit", "shithead", "dumbass",
  "dumbfuck", "fuckyou", "fuckoff", "goatse", "lemonparty",
];

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

function hasProfanityInEmail(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  return BLOCKED_TERMS.some(term => local.includes(term));
}

export type AuthError =
  | "invalid-email"
  | "wrong-password"
  | "user-not-found"
  | "email-in-use"
  | "weak-password"
  | "network-error"
  | "disposable-email"
  | "inappropriate-email"
  | "unknown";

export function normalizeAuthError(code: string): AuthError {
  if (code.includes("inappropriate-email")) return "inappropriate-email";
  if (code.includes("disposable-email"))    return "disposable-email";
  if (code.includes("invalid-email"))       return "invalid-email";
  if (code.includes("wrong-password") || code.includes("invalid-credential")) return "wrong-password";
  if (code.includes("user-not-found"))      return "user-not-found";
  if (code.includes("email-already-in-use")) return "email-in-use";
  if (code.includes("weak-password"))       return "weak-password";
  if (code.includes("network"))             return "network-error";
  return "unknown";
}

export function authErrorMessage(error: AuthError): string {
  const map: Record<AuthError, string> = {
    "invalid-email":       "Invalid email address.",
    "wrong-password":      "Incorrect email or password.",
    "user-not-found":      "No account found with that email.",
    "email-in-use":        "An account with this email already exists.",
    "weak-password":       "Password must be at least 6 characters.",
    "network-error":       "Network error. Check your connection.",
    "disposable-email":    "Please use a real email address. Disposable or temporary emails are not allowed.",
    "inappropriate-email": "That email address is not allowed.",
    "unknown":             "Something went wrong. Please try again.",
  };
  return map[error];
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUp(email: string, password: string): Promise<UserCredential> {
  const trimmed = email.trim();
  if (hasProfanityInEmail(trimmed)) {
    const err = new Error("Inappropriate email not allowed");
    (err as any).code = "auth/inappropriate-email";
    throw err;
  }
  if (isDisposableEmail(trimmed)) {
    const err = new Error("Disposable email not allowed");
    (err as any).code = "auth/disposable-email";
    throw err;
  }
  const cred = await createUserWithEmailAndPassword(auth, trimmed, password);
  await sendEmailVerification(cred.user);
  return cred;
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
}
