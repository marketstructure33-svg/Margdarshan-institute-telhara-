import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCSfqoWvLjf-p3USWhNVs_A00YwH17_WZA",
  authDomain: "margdarshan-institute-te-22686.firebaseapp.com",
  projectId: "margdarshan-institute-te-22686",
  storageBucket: "margdarshan-institute-te-22686.firebasestorage.app",
  messagingSenderId: "50269739768",
  appId: "1:50269739768:web:b5e1e017883a687d79b90d",
  measurementId: "G-WXWE4MB2FL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
