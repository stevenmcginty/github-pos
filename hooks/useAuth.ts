
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import type { User } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    }, (err) => {
        setError(err.message);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthError = (err: any): string => {
    switch (err.code) {
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'An account already exists with this email address.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters long.';
        default:
            return err.message;
    }
  };
  
  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setError(handleAuthError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setError(handleAuthError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reauthenticate = async (password: string) => {
      setLoading(true);
      setError(null);
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
          const err = new Error("No user is currently signed in or user has no email.");
          setError(err.message);
          setLoading(false);
          throw err;
      }

      const credential = EmailAuthProvider.credential(currentUser.email, password);
      
      try {
          await reauthenticateWithCredential(currentUser, credential);
      } catch (err) {
          setError(handleAuthError(err));
          throw err;
      } finally {
          setLoading(false);
      }
  };

  return { user, loading, error, signIn, signUp, signOut, reauthenticate };
}
