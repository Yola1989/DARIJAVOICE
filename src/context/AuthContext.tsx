import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile, AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS } from '../data/presets';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  consumeTokens: (amount: number, isTrial: boolean) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

export const ADMIN_EMAILS = [
  'younes.ahdidou@gmail.com',
  'younes.ahdidou@googlemail.com',
];

export const isUserAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((admin) => admin.toLowerCase() === normalized);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Subscribe to App Settings
  useEffect(() => {
    const settingsDoc = doc(db, 'settings', 'global');
    const unsubSettings = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) {
        setAppSettings({ ...DEFAULT_APP_SETTINGS, ...snapshot.data() });
      } else {
        // Initialize default settings doc if missing
        setDoc(settingsDoc, DEFAULT_APP_SETTINGS).catch(console.error);
      }
    });

    return () => unsubSettings();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const isAdmin = isUserAdminEmail(currentUser.email);
        const userDocRef = doc(db, 'users', currentUser.uid);

        // Immediate optimistic profile for admin
        if (isAdmin) {
          const optimisticAdminProfile: UserProfile = {
            id: currentUser.uid,
            email: currentUser.email || 'younes.ahdidou@gmail.com',
            displayName: currentUser.displayName || 'مدير الموقع',
            role: 'admin',
            status: 'active',
            tokens: 999999,
            freeTrialsRemaining: 999999,
            freeTrialMaxSeconds: DEFAULT_APP_SETTINGS.freeTrialMaxSeconds,
            subscriptionTier: 'unlimited',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(optimisticAdminProfile);
        }

        try {
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            if (isAdmin) {
              data.role = 'admin';
              data.status = 'active';
              data.tokens = 999999;
              data.freeTrialsRemaining = 999999;
              data.subscriptionTier = 'unlimited';
              // Sync to Firestore
              setDoc(userDocRef, { role: 'admin', status: 'active', tokens: 999999, freeTrialsRemaining: 999999, subscriptionTier: 'unlimited' }, { merge: true }).catch(console.error);
            }
            setUserProfile(data);
          } else {
            // New User Registration
            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'مستخدم'),
              role: isAdmin ? 'admin' : 'user',
              status: isAdmin ? 'active' : 'pending',
              tokens: isAdmin ? 999999 : 50,
              freeTrialsRemaining: isAdmin ? 999999 : DEFAULT_APP_SETTINGS.freeTrialsDefaultCount,
              freeTrialMaxSeconds: DEFAULT_APP_SETTINGS.freeTrialMaxSeconds,
              subscriptionTier: isAdmin ? 'unlimited' : 'free',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (dbErr) {
          console.warn('User profile sync notice:', dbErr);
        }

        // Live snapshot listener for user profile updates
        const unsubProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            const snapData = snap.data() as UserProfile;
            if (isAdmin) {
              snapData.role = 'admin';
              snapData.status = 'active';
              snapData.tokens = 999999;
              snapData.freeTrialsRemaining = 999999;
              snapData.subscriptionTier = 'unlimited';
            }
            setUserProfile(snapData);
          }
        }, (snapErr) => {
          console.warn('Profile snapshot notice:', snapErr);
        });

        setLoading(false);
        return () => unsubProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const isAdmin = isUserAdminEmail(email);
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email.trim(),
      displayName: name || (email ? email.split('@')[0] : 'مستخدم'),
      role: isAdmin ? 'admin' : 'user',
      status: isAdmin ? 'active' : 'pending',
      tokens: isAdmin ? 999999 : 50,
      freeTrialsRemaining: isAdmin ? 999999 : appSettings.freeTrialsDefaultCount,
      freeTrialMaxSeconds: appSettings.freeTrialMaxSeconds,
      subscriptionTier: isAdmin ? 'unlimited' : 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setUserProfile(newProfile);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    }
  };

  const consumeTokens = async (amount: number, isTrial: boolean): Promise<boolean> => {
    if (!user || !userProfile) return false;
    if (userProfile.role === 'admin') return true;

    const userDocRef = doc(db, 'users', user.uid);

    if (isTrial) {
      if (userProfile.freeTrialsRemaining <= 0) return false;
      const updatedTrials = Math.max(0, userProfile.freeTrialsRemaining - 1);
      await updateDoc(userDocRef, {
        freeTrialsRemaining: updatedTrials,
        updatedAt: new Date().toISOString(),
      });
      setUserProfile((prev) => prev ? { ...prev, freeTrialsRemaining: updatedTrials } : null);
      return true;
    } else {
      // Activated user token deduction
      if (userProfile.status !== 'active') return false;
      if (userProfile.tokens < amount) return false;

      const updatedTokens = Math.max(0, userProfile.tokens - amount);
      await updateDoc(userDocRef, {
        tokens: updatedTokens,
        updatedAt: new Date().toISOString(),
      });
      setUserProfile((prev) => prev ? { ...prev, tokens: updatedTokens } : null);
      return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        appSettings,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        consumeTokens,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
