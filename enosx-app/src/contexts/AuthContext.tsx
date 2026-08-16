/**
 * AuthContext — User authentication and profile management.
 * Supports Google OAuth (via redirect), email/password, and Neon DB persistence.
 * Profile data is stored in Neon (PostgreSQL) via a lightweight serverless API.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: 'google' | 'email' | 'github';
  // Preferences
  theme?: string;
  wallpaper?: string;
  aiPersonality?: string;
  language?: string;
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

const STORAGE_KEY = 'enosx-auth-user';
const NEON_API_BASE = (import.meta.env.VITE_NEON_API_URL as string | undefined)?.replace(/\/$/, '') || null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveUser(user: UserProfile | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

class AuthApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function apiCall(path: string, method: string, body?: object) {
  if (!NEON_API_BASE) {
    throw new AuthApiError('Remote auth is not configured', 404);
  }

  const res = await fetch(`${NEON_API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new AuthApiError(err.message || 'Request failed', res.status);
  }
  return res.json();
}

function canUseLocalAuthFallback(error: unknown) {
  // Use the local-storage fallback whenever the server route is unreachable:
  // 404/405 (route missing), 500 (server failure), 503 (DATABASE_URL not
  // configured — the production deployment case), or network errors.
  if (error instanceof AuthApiError) {
    return error.status === 404 || error.status === 405 || error.status >= 500;
  }
  // TypeError covers offline/network failures; treat them as fallback-eligible.
  return error instanceof TypeError;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: loadUser(),
    isLoading: false,
    isAuthenticated: !!loadUser(),
    error: null,
  });

  // Handle Google OAuth callback (hash-based token)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('id_token')) {
      handleGoogleCallback(hash);
    }
    // Check for stored Google profile from popup
    const pendingGoogle = sessionStorage.getItem('enosx-google-profile');
    if (pendingGoogle) {
      try {
        const profile = JSON.parse(pendingGoogle);
        sessionStorage.removeItem('enosx-google-profile');
        setUser(profile);
      } catch {}
    }
  }, []);

  const handleGoogleCallback = async (hash: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const params = new URLSearchParams(hash.replace('#', ''));
      const idToken = params.get('id_token') || params.get('access_token');
      if (!idToken) throw new Error('No token in callback');
      // Decode JWT payload (Google id_token)
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      const user: UserProfile = {
        id: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture,
        provider: 'google',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await syncUserToNeon(user);
      setUser(user);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Google sign-in failed' }));
    }
  };

  const syncUserToNeon = async (user: UserProfile) => {
    try {
      await apiCall('/auth/upsert', 'POST', user);
    } catch {
      // Non-fatal: store locally even if Neon sync fails
    }
  };

  const setUser = (user: UserProfile | null) => {
    saveUser(user);
    setState(prev => ({ ...prev, user, isAuthenticated: !!user, isLoading: false, error: null }));
  };

  const signInWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      // Demo mode: create a mock Google user for preview
      const mockUser: UserProfile = {
        id: `google_demo_${Date.now()}`,
        email: 'demo@enosx.ai',
        displayName: 'Demo User',
        avatarUrl: `https://ui-avatars.com/api/?name=Demo+User&background=7c6ff7&color=fff`,
        provider: 'google',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUser(mockUser);
      return;
    }
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const scope = 'openid email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=${encodeURIComponent(scope)}&nonce=${Math.random().toString(36)}`;
    window.location.href = url;
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      let user: UserProfile;
      try {
        const data = await apiCall('/auth/signin', 'POST', { email, password });
        user = data.user;
      } catch (error) {
        if (!canUseLocalAuthFallback(error)) throw error;
        // Server unavailable (missing route, crash, or DATABASE_URL not
        // configured): fall back to locally stored accounts created by a
        // previous sign-up on this device.
        const stored = localStorage.getItem(`enosx-user-${email.toLowerCase()}`);
        if (!stored) {
          throw new Error('No account found with this email. Try signing up first, or continue as a guest.');
        }
        const storedUser = JSON.parse(stored);
        if (storedUser.password !== btoa(password)) throw new Error('Invalid email or password');
        user = storedUser.profile;
      }
      setUser(user);
      return true;
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Sign in failed' }));
      return false;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const newUser: UserProfile = {
        id: `email_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        email,
        displayName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=7c6ff7&color=fff`,
        provider: 'email',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        await apiCall('/auth/signup', 'POST', { ...newUser, password });
      } catch (error) {
        if (!canUseLocalAuthFallback(error)) throw error;
        // Server unavailable: store the account locally so it can be
        // signed in again on this device without a database.
        localStorage.setItem(`enosx-user-${email.toLowerCase()}`, JSON.stringify({ profile: newUser, password: btoa(password) }));
      }
      setUser(newUser);
      return true;
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Sign up failed' }));
      return false;
    }
  };

  const continueAsGuest = () => {
    const guest: UserProfile = {
      id: `guest_${Date.now()}`,
      email: '',
      displayName: 'Guest',
      avatarUrl: `https://ui-avatars.com/api/?name=Guest&background=4b5563&color=fff`,
      provider: 'github',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUser(guest);
  };

  const signOut = () => {
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!state.user) return false;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const updated: UserProfile = {
        ...state.user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      try {
        await apiCall('/auth/update', 'PUT', updated);
      } catch {
        // Non-fatal
      }
      setUser(updated);
      return true;
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: err instanceof Error ? err.message : 'Update failed' }));
      return false;
    }
  };

  const clearError = () => setState(prev => ({ ...prev, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, signInWithGoogle, signInWithEmail, signUpWithEmail, continueAsGuest, signOut, updateProfile, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
