import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import { apiFetch } from "../lib/api";
import { AppSettings, UserProfile } from "../types";
import { DEFAULT_APP_SETTINGS } from "../data/presets";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  appSettings: AppSettings;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const ADMIN_EMAILS = [
  "younes.ahdidou@gmail.com",
  "younes.ahdidou@googlemail.com",
];
export const isUserAdminEmail = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.trim().toLowerCase()));

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    const response = await apiFetch<{
      profile: UserProfile;
      settings?: AppSettings;
    }>("/api/me/bootstrap", {
      method: "POST",
    });
    setUserProfile(response.profile);
    if (response.settings)
      setAppSettings({ ...DEFAULT_APP_SETTINGS, ...response.settings });
  };

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error("Google redirect sign-in failed:", error);
    });

    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setUser(currentUser);
      setUserProfile(null);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        await refreshProfile();
        unsubscribeProfile = onSnapshot(
          doc(db, "users", currentUser.uid),
          (snapshot) =>
            snapshot.exists() && setUserProfile(snapshot.data() as UserProfile),
          (error) => console.warn("Profile listener:", error),
        );
      } catch (error) {
        console.error("Profile bootstrap failed:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    apiFetch<{ settings: AppSettings }>("/api/settings")
      .then(({ settings }) =>
        setAppSettings({ ...DEFAULT_APP_SETTINGS, ...settings }),
      )
      .catch(() => setAppSettings(DEFAULT_APP_SETTINGS));
  }, []);

  const signInWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const redirectFallbackCodes = new Set([
        "auth/invalid-credential",
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
      ]);

      if (redirectFallbackCodes.has(error?.code)) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
  ) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    if (name.trim())
      await updateProfile(credential.user, { displayName: name.trim() });
    await credential.user.getIdToken(true);
    await refreshProfile();
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
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
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
};
