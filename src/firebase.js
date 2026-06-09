import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key-passwala",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:1234567890abcdef",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DUMMY"
};

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn("Firebase environment variables are missing! Using mock configuration to prevent script crash.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🛡️ Safely initialize messaging only if supported (prevents crash on insecure IP origins)
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
  } catch (e) {
    console.warn('Messaging not supported in this context');
    return null;
  }
};

export { RecaptchaVerifier, signInWithPhoneNumber };
