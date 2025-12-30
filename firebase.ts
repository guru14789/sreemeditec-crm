
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0mlqOrMgpc0F5mlwunK033gD9KYyYUJ4",
  authDomain: "sreemeditec-app.firebaseapp.com",
  projectId: "sreemeditec-app",
  storageBucket: "sreemeditec-app.firebasestorage.app",
  messagingSenderId: "376656303612",
  appId: "1:376656303612:web:bc844a8db07b329d1a0e79",
  measurementId: "G-BJMPX7QYZX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
