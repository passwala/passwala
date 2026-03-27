import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export { RecaptchaVerifier, signInWithPhoneNumber };
