
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile, EnterpriseRole } from '../types';
import { getCurrentUserProfile, getUserRoleFromClaims } from '../services/authService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: EnterpriseRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, role: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<EnterpriseRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setUser(fbUser);
        const [prof, userRole] = await Promise.all([
          getCurrentUserProfile(fbUser.uid),
          getUserRoleFromClaims()
        ]);
        setProfile(prof);
        setRole(userRole);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
