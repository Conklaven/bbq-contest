'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  getIdTokenResult,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface Claims {
  isAdmin?: boolean;
  isJudge?: boolean;
  isTeam?: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  claims: Claims | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  claims: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<Claims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const tokenResult = await getIdTokenResult(firebaseUser, true);
        setClaims(tokenResult.claims as Claims);
      } else {
        setClaims(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, claims, loading, signOut: () => signOut(auth) }}
    >
      {children}
    </AuthContext.Provider>
  );
};
