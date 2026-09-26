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

const ADMIN_EMAIL = 'younes.ahdidou@gmail.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Subscribe to App Settings safely
  useEffect(() => {
    let unsubSettings: (() => void) | undefined;
    try {
      const settingsDoc = doc(db, 'settings', 'global');
      unsubSettings = onSnapshot(
        settingsDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            setAppSettings({ ...DEFAULT_APP_SETTINGS, ...snapshot.data() });
          } else {
            // Only admin can write default settings, otherwise use client-side defaults
            if (userProfile?.role === 'admin') {
              setDoc(settingsDoc, DEFAULT_APP_SETTINGS).catch(console.error);
            }
          }
        },
        (err) => {
          console.warn('Firestore settings subscription notice (using local defaults):', err.message);
        }
      );
    } catch (e) {
      console.warn('Firestore settings initialization error:', e);
    }

    return () => {
      if (unsubSettings) unsubSettings();
    };
  }, [userProfile?.role]);

  // Listen to Auth State
  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          setUser(currentUser);
          if (currentUser) {
            // Fetch or create user doc
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userDocRef);

            const isAdmin = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              // Ensure admin status is updated if user matches admin email
              if (isAdmin && (data.role !== 'admin' || data.status !== 'active')) {
                await updateDoc(userDocRef, { role: 'admin', status: 'active' });
                data.role = 'admin';
                data.status = 'active';
              }
              setUserProfile(data);
            } else {
              // New User Registration
              const newProfile: UserProfile = {
                id: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'مستخدم'),
                role: isAdmin ? 'admin' : 'user',
                status: isAdmin ? 'active' : 'pending', // Pending activation for regular users
                tokens: isAdmin ? 999999 : 50, // 50 starting tokens for trial
                freeTrialsRemaining: isAdmin ? 999999 : DEFAULT_APP_SETTINGS.freeTrialsDefaultCount,
                freeTrialMaxSeconds: DEFAULT_APP_SETTINGS.freeTrialMaxSeconds,
                subscriptionTier: isAdmin ? 'unlimited' : 'free',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            }

            // Live snapshot listener for user profile updates
            unsubProfile = onSnapshot(
              userDocRef,
              (snap) => {
                if (snap.exists()) {
                  setUserProfile(snap.data() as UserProfile);
                }
              },
              (profileErr) => {
                console.warn('Profile sync notice:', profileErr.message);
              }
            );
          } else {
            setUserProfile(null);
          }
        } catch (authErr) {
          console.error('Error handling auth state change:', authErr);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('onAuthStateChanged error:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
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
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      displayName: name || email.split('@')[0],
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
