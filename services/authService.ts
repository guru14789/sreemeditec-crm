
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, EnterpriseRole } from '../types';

export const getCurrentUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return { ...userDoc.data(), uid } as UserProfile;
  }
  return null;
};

export const getUserRoleFromClaims = async (): Promise<EnterpriseRole> => {
  const token = await auth.currentUser?.getIdTokenResult();
  // Fix: Default to SYSTEM_STAFF to match types.ts
  return (token?.claims.role as EnterpriseRole) || 'SYSTEM_STAFF';
};
