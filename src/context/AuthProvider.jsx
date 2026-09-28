import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient.js';
import { AuthContext } from './AuthContext.js';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [authError, setAuthError] = useState('');

  async function signInUser(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch { return { success: false, error: 'Could not connect. Check your connection and try again.' }; }
  }

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedEvent = true;
      if (active) { setSession(nextSession); setAuthError(''); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedEvent) return;
      if (error) throw error;
      setSession(data.session);
    }).catch(() => {
      if (active) { setSession(null); setAuthError('Could not restore your session. Please sign in again.'); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signOutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return <AuthContext.Provider value={{ session, authError, signInUser, signOutUser }}>{children}</AuthContext.Provider>;
}
