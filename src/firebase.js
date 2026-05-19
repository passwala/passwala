import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCqjI8v3JaP14VBg4ygarxXlfjZfTvHlag",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "passwala-75faa.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "passwala-75faa",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "passwala-75faa.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "301031527282",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:301031527282:web:b97b08afb9eafc41fa43eb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M3X75CXNW4"
};

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
