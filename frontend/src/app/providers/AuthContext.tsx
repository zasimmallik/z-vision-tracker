import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
} from '../../shared/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const mapAuthErrorMessage = (err: unknown): string => {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    switch (code) {
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by the browser. Redirecting to Google Sign-In…';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Google Sign-In in Firebase Console (Authentication → Settings → Authorized domains).';
      case 'auth/operation-not-allowed':
        return 'Google Sign-In is not enabled yet in Firebase Console (Authentication → Sign-in method).';
      case 'auth/network-request-failed':
        return 'Network error while connecting to Firebase Auth. Check your internet connection.';
      default:
        break;
    }
  }
  return err instanceof Error ? err.message : 'Unable to sign in with Google.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    getRedirectResult(auth).catch((err) => {
      setError(mapAuthErrorMessage(err));
    });

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth || !googleProvider) {
      setError('Firebase is not configured.');
      return;
    }

    setError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: unknown }).code === 'auth/popup-blocked'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr) {
          setError(mapAuthErrorMessage(redirectErr));
          return;
        }
      }
      setError(mapAuthErrorMessage(err));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    setError(null);
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string> => {
    if (!auth?.currentUser) {
      throw new Error('Not authenticated.');
    }
    return auth.currentUser.getIdToken();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signingIn,
        error,
        isConfigured: isFirebaseConfigured,
        signInWithGoogle,
        signOutUser,
        getIdToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
