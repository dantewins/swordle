'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  signUpNewUser: (email: string, username: string, password: string) => Promise<{ success: boolean; data?: any; error?: AuthError }>;
  signInUser: (identifier: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthProviderProps) => {
  const supabase = createClient(); // Use the browser client here
  const [session, setSession] = useState<Session | null>(null);

  const signUpNewUser = async (email: string, username: string, password: string) => {
    // Check if username is already taken
    const { data: existingUsername, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking username: ", checkError);
      return { success: false, error: new AuthError(checkError.message, 400) };
    }

    if (existingUsername) {
      return { success: false, error: new AuthError('Username already taken', 400) };
    }

    // Sign up with username as metadata (for trigger to populate profiles)
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: password,
      options: {
        data: { username }
      }
    });

    if (error) {
      console.error("Error signing up: ", error);
      // Handle email already taken specifically
      if (error.message === 'User already registered') {
        return { success: false, error: new AuthError('Email already taken', 400) };
      }
      return { success: false, error };
    }

    return { success: true, data };
  };

  // Sign in
  const signInUser = async (identifier: string, password: string) => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('sign-in', {
        body: {
          email: identifier.toLowerCase(),
          password: password,
        },
      });

      if (invokeError) {
        console.error("Invoke error:", invokeError.message);
        return { success: false, error: invokeError.message };
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (setSessionError) {
        console.error("Set session error:", setSessionError.message);
        return { success: false, error: setSessionError.message };
      }

      console.log("Sign-in success:", data);
      return { success: true, data };
    } catch (err: any) {
      console.error("Unexpected error during sign-in:", err.message);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, signUpNewUser, signInUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within an AuthContextProvider');
  }
  return context;
};