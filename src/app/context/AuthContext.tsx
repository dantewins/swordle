// context/auth-context.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    signUpNewUser: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: AuthError }>;
    signInUser: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthProviderProps) => {
    const [session, setSession] = useState<Session | null>(null);

    // Sign up
    const signUpNewUser = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email: email.toLowerCase(),
            password: password,
        });

        if (error) {
            console.error("Error signing up: ", error);
            return { success: false, error };
        }

        return { success: true, data };
    };

    // Sign in
    const signInUser = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase(),
                password: password,
            });

            if (error) {
                console.error("Sign-in error:", error.message);
                return { success: false, error: error.message };
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
