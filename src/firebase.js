import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCqjI8v3JaP14VBg4ygarxXlfjZfTvHlag",
  authDomain: "passwala-75faa.firebaseapp.com",
  projectId: "passwala-75faa",
  storageBucket: "passwala-75faa.firebasestorage.app",
  messagingSenderId: "301031527282",
  appId: "1:301031527282:web:b97b08afb9eafc41fa43eb",
  measurementId: "G-M3X75CXNW4"
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
