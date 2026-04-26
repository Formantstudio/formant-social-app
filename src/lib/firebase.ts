import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID as string,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Set debug token before init — Firebase intercepts this on all platforms.
// Web uses EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN, native uses EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN_NATIVE.
// Register the native token in Firebase Console → App Check → Android/iOS app → Manage debug tokens.
const debugToken =
  Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN
    : process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN_NATIVE;

if (debugToken) {
  (globalThis as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}

// App Check — web uses ReCaptcha; native uses the debug token above until
// Play Integrity (Android) / DeviceCheck (iOS) providers are wired in.
if (Platform.OS === "web") {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || "debug"),
    isTokenAutoRefreshEnabled: true,
  });
} else if (debugToken) {
  // Native debug token path — swap for PlayIntegrityProvider / DeviceCheckProvider in production
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("debug"),
    isTokenAutoRefreshEnabled: true,
  });
}

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
