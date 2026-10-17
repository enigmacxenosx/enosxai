/**
 * Firebase Authentication and user profile context.
 * Signed-in identity is owned by Firebase Auth; user preferences are synced to Firestore.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth, firebaseConfigured, requireFirebase } from "@/lib/firebase";
import { loadUserProfile, saveUserProfile } from "@/lib/firebaseStorage";
import { reportClientError } from "@/lib/errorReporting";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: "google" | "email" | "github" | "guest";
  theme?: string;
  wallpaper?: string;
  aiPersonality?: string;
  language?: string;
  gender?: string;
  notifications?: boolean;
  compactMode?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => void;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<boolean>;
  continueAsGuest: () => void;
  signOut: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const GUEST_STORAGE_KEY = "enosx-guest-profile";

function providerFor(user: FirebaseUser): UserProfile["provider"] {
  const providerId = user.providerData[0]?.providerId;
  return providerId === "google.com" ? "google" : providerId === "github.com" ? "github" : "email";
}

function userFromFirebase(user: FirebaseUser, saved: Record<string, unknown> | null): UserProfile {
  return {
    id: user.uid,
    email: user.email || "",
    displayName: user.displayName || String(saved?.displayName || "User"),
    avatarUrl: user.photoURL || (typeof saved?.avatarUrl === "string" ? saved.avatarUrl : undefined),
    provider: providerFor(user),
    theme: typeof saved?.theme === "string" ? saved.theme : undefined,
    wallpaper: typeof saved?.wallpaper === "string" ? saved.wallpaper : undefined,
    aiPersonality: typeof saved?.aiPersonality === "string" ? saved.aiPersonality : undefined,
    language: typeof saved?.language === "string" ? saved.language : undefined,
    gender: typeof saved?.gender === "string" ? saved.gender : undefined,
    notifications: typeof saved?.notifications === "boolean" ? saved.notifications : undefined,
    compactMode: typeof saved?.compactMode === "boolean" ? saved.compactMode : undefined,
    createdAt: typeof saved?.createdAt === "string" ? saved.createdAt : undefined,
    updatedAt: typeof saved?.updatedAt === "string" ? saved.updatedAt : undefined,
  };
}

function loadGuest(): UserProfile | null {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    return stored ? JSON.parse(stored) as UserProfile : null;
  } catch {
    return null;
  }
}

function firebaseErrorMessage(error: unknown): string {
  reportClientError(error, "auth");
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/operation-not-allowed") return "Enable this sign-in method in Firebase Console → Authentication → Sign-in method.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") return "Invalid email or password.";
  if (code === "auth/email-already-in-use") return "An account already exists for this email. Try signing in.";
  if (code === "auth/weak-password") return "Choose a stronger password (at least 6 characters).";
  if (code === "auth/unauthorized-domain") return "Add this app's domain to Firebase Authentication → Settings → Authorized domains.";
  if (error instanceof Error) return error.message;
  return "Authentication failed. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: firebaseConfigured ? null : loadGuest(),
    isLoading: firebaseConfigured,
    isAuthenticated: !firebaseConfigured && !!loadGuest(),
    error: null,
  });

  useEffect(() => {
    if (!firebaseAuth) {
      setState((previous) => ({ ...previous, isLoading: false }));
      return;
    }
    return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        const guest = loadGuest();
        setState((previous) => ({ ...previous, user: guest, isAuthenticated: !!guest, isLoading: false }));
        return;
      }
      try {
        const savedProfile = await loadUserProfile(firebaseUser.uid);
        const profile = userFromFirebase(firebaseUser, savedProfile);
        setState((previous) => ({ ...previous, user: profile, isAuthenticated: true, isLoading: false, error: null }));
        void saveUserProfile(firebaseUser.uid, profile as unknown as Record<string, unknown>).catch((error) => console.error("Firebase profile sync failed:", error));
      } catch (error) {
        console.error("Could not load Firebase profile:", error);
        const profile = userFromFirebase(firebaseUser, null);
        setState((previous) => ({ ...previous, user: profile, isAuthenticated: true, isLoading: false }));
      }
    });
  }, []);

  const signInWithGoogle = () => {
    if (!firebaseAuth) {
      reportClientError("Firebase is not configured for authentication.", "auth.configuration");
      setState((previous) => ({ ...previous, error: "Firebase is not configured. Set the VITE_FIREBASE_* values before signing in." }));
      return;
    }
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    void signInWithPopup(firebaseAuth, new GoogleAuthProvider())
      .catch((error) => setState((previous) => ({ ...previous, isLoading: false, error: firebaseErrorMessage(error) })));
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    if (!firebaseAuth) {
      reportClientError("Firebase is not configured for authentication.", "auth.configuration");
      setState((previous) => ({ ...previous, error: "Firebase is not configured. Set the VITE_FIREBASE_* values before signing in." }));
      return false;
    }
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
      return true;
    } catch (error) {
      setState((previous) => ({ ...previous, isLoading: false, error: firebaseErrorMessage(error) }));
      return false;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<boolean> => {
    if (!firebaseAuth) {
      reportClientError("Firebase is not configured for authentication.", "auth.configuration");
      setState((previous) => ({ ...previous, error: "Firebase is not configured. Set the VITE_FIREBASE_* values before creating an account." }));
      return false;
    }
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
      await updateFirebaseProfile(credential.user, { displayName: displayName.trim() });
      const profile = userFromFirebase(credential.user, null);
      try {
        await saveUserProfile(credential.user.uid, { ...profile, createdAt: new Date().toISOString() });
      } catch (error) {
        // Auth accounts remain valid if Firestore rules/database setup is still pending.
        console.error("Firebase profile write failed:", error);
      }
      setState((previous) => ({ ...previous, user: profile, isAuthenticated: true, isLoading: false, error: null }));
      return true;
    } catch (error) {
      setState((previous) => ({ ...previous, isLoading: false, error: firebaseErrorMessage(error) }));
      return false;
    }
  };

  const continueAsGuest = () => {
    const guest: UserProfile = {
      id: `guest_${crypto.randomUUID()}`,
      email: "",
      displayName: "Guest",
      avatarUrl: "https://ui-avatars.com/api/?name=Guest&background=4b5563&color=fff",
      provider: "guest",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    setState((previous) => ({ ...previous, user: guest, isAuthenticated: true, isLoading: false, error: null }));
  };

  const signOut = () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    if (firebaseAuth) {
      void firebaseSignOut(firebaseAuth).catch((error) => console.error("Firebase sign-out failed:", error));
    } else {
      setState((previous) => ({ ...previous, user: null, isAuthenticated: false, isLoading: false }));
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!state.user) return false;
    const updated: UserProfile = { ...state.user, ...updates, updatedAt: new Date().toISOString() };
    try {
      if (state.user.provider !== "guest") {
        const { auth } = requireFirebase();
        const currentUser = auth.currentUser;
        if (!currentUser || currentUser.uid !== state.user.id) throw new Error("Your Firebase session has expired. Sign in again.");
        if (updates.displayName !== undefined || updates.avatarUrl !== undefined) {
          await updateFirebaseProfile(currentUser, {
            displayName: updates.displayName ?? currentUser.displayName,
            photoURL: updates.avatarUrl ?? currentUser.photoURL,
          });
        }
        await saveUserProfile(state.user.id, updated as unknown as Record<string, unknown>);
      } else {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
      }
      setState((previous) => ({ ...previous, user: updated, isLoading: false, error: null }));
      return true;
    } catch (error) {
      setState((previous) => ({ ...previous, isLoading: false, error: firebaseErrorMessage(error) }));
      return false;
    }
  };

  const clearError = () => setState((previous) => ({ ...previous, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, signInWithGoogle, signInWithEmail, signUpWithEmail, continueAsGuest, signOut, updateProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
