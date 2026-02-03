
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, EnterpriseRole } from '../types';

// Reuse config from main firebase.ts but it needs to be available
const firebaseConfig = {
  apiKey: "AIzaSyD0mlqOrMgpc0F5mlwunK033gD9KYyYUJ4",
  authDomain: "sreemeditec-app.firebaseapp.com",
  projectId: "sreemeditec-app",
  storageBucket: "sreemeditec-app.firebasestorage.app",
  messagingSenderId: "376656303612",
  appId: "1:376656303612:web:bc844a8db07b329d1a0e79",
  measurementId: "G-BJMPX7QYZX"
};

export const getCurrentUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDoc = await getDoc(doc(db, "employees", uid));
  if (userDoc.exists()) {
    return { ...userDoc.data(), uid } as UserProfile;
  }
  return null;
};

export const getUserRoleFromClaims = async (): Promise<EnterpriseRole> => {
  // In a real production app with Custom Claims enabled, we would check the token.
  // For this client-side implementation, we rely on the Firestore profile.
  const token = await (getAuth()).currentUser?.getIdTokenResult();
  return (token?.claims.role as EnterpriseRole) || 'SYSTEM_STAFF';
};

/**
 * Registers a new employee in Firebase Auth without logging out the current admin.
 * Uses a secondary Firebase App instance for the creation lifecycle.
 */
export const registerNewEmployeeAuth = async (email: string, password: string): Promise<string> => {
    const secondaryAppName = `SecondaryApp-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const uid = userCredential.user.uid;
        
        // Sign out from the secondary instance immediately to prevent session pollution
        await signOut(secondaryAuth);
        return uid;
    } finally {
        // Clean up the secondary app to release memory
        await deleteApp(secondaryApp);
    }
};
