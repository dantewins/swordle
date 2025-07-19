'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AuthError, User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUpNewUser: (email: string, username: string, password: string) => Promise<{ success: boolean; data?: any; error?: AuthError }>;
  signInUser: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  signOut: () => Promise<{ success: boolean, error?: AuthError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthProviderProps) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up
  const signUpNewUser = async (email: string, display_name: string, password: string) => {
    // Perform sign-up with username in metadata
    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: { display_name }
      }
    });

    if (error) {
      return { success: false, error: new AuthError(error.message) };
    }

    return { success: true };
  };

  // Sign in
  const signInUser = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: "Invalid credentials. Please try again." };
    }

    return { success: true };
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: new AuthError(error.message) };
    }

    return { success: true };
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUpNewUser, signInUser, signOut }}>
      {loading ? '' : children} </AuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useUserAuth must be used within an AuthContextProvider');
  }

  return context;
};