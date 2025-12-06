import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3aAtWB-ds8aYiTl4RiRxzeiFCmjHRe28",
  authDomain: "ruralmed-track-system.firebaseapp.com",
  projectId: "ruralmed-track-system",
  storageBucket: "ruralmed-track-system.firebasestorage.app",
  messagingSenderId: "440927826902",
  appId: "1:440927826902:web:75ce8995c33d97ef36ea77",
  measurementId: "G-PKF2E7J0BG"
};

let app;
let db: any = null;
let isFirebaseInitialized = false;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseInitialized = true;
    console.log("✅ Firebase initialized successfully");
  } else {
    console.warn("⚠️ Firebase Config is missing.");
  }
} catch (error) {
  console.error("❌ Error initializing Firebase:", error);
}

export { db, isFirebaseInitialized };