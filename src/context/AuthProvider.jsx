import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient.js';
import { AuthContext } from './AuthContext.js';

export function AuthProvider({ children }) {
  // `undefined` means the stored session has not been checked yet.
  const [session, setSession] = useState(undefined);

  const signUpUser = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log(error);
      return { success: false, error };
    }

    return { success: true, error };
  };

  const signInUser = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log(error);
        return { success: false, error: error.message };
      }

      console.log('Sign-In Success: ', data);
      return { success: true, data };
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    // Read the initial session once, then keep it synchronized with future auth events.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Avoid keeping a stale auth listener after the provider unmounts.
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOutUser = async () => {
    // supabase.auth.signOut() clears the local session and invalidates it
    // server-side. Returns a Promise resolving to { error }.
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log(error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, signUpUser, signInUser, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}
