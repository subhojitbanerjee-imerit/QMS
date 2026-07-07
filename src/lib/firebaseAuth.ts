import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";

// Initialize Firebase App
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

// Google Auth Provider setup with Sheets Readonly scope
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== "undefined" ? localStorage.getItem("sheet_access_token") : null;
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getConfiguredAuth(): Auth | null {
  if (auth) return auth;

  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    return null;
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    return auth;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return null;
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const configuredAuth = getConfiguredAuth();
  if (!configuredAuth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(configuredAuth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Firebase keeps the user signed in after refresh. If the Sheets OAuth
        // access token is gone, keep that user session and let the dashboard ask
        // for one click to refresh the Sheets token instead of signing out.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== "undefined") localStorage.removeItem("sheet_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const configuredAuth = getConfiguredAuth();
  if (!configuredAuth) {
    throw new Error("Firebase environment variables are not configured. Add VITE_FIREBASE_* values in Vercel to enable Google Sheets login.");
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(configuredAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve access token from Google Auth credential");
    }
    cachedAccessToken = credential.accessToken;
    if (typeof window !== "undefined") localStorage.setItem("sheet_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Sheets OAuth authentication error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  const configuredAuth = getConfiguredAuth();
  if (configuredAuth) {
    await configuredAuth.signOut();
  }
  cachedAccessToken = null;
  if (typeof window !== "undefined") localStorage.removeItem("sheet_access_token");
};
