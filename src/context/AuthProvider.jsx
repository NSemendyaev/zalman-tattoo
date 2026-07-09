import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient.js';
import { AuthContext } from './AuthContext.js';

// This is a "Provider component" pattern. It wraps part of your app (or all of it)
// and supplies auth-related data/functions to everything inside it.
// `children` is a special React prop: it's whatever JSX gets nested between
// <AuthProvider> and </AuthProvider> wherever this is used.
export function AuthProvider({ children }) {
  // useState returns a pair: [currentValue, setterFunction].
  // Calling setSession(...) does two things: updates the value, AND tells React
  // to re-render this component (and anything consuming `session` via context).
  // Starts as `undefined` to represent "haven't checked yet" (as opposed to
  // `null`, which we use later to mean "checked, and nobody is logged in").
  const [session, setSession] = useState(undefined);

  const signUpUser = async (email, password) => {
    // supabase.auth.signUp() sends a request to Supabase's auth service to create
    // a new user record. It returns a Promise that resolves to an object shaped
    // like { data, error }. `await` pauses this function until that Promise
    // resolves, so `error` here is the actual resolved value, not a Promise.
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
      // supabase.auth.signInWithPassword() checks the given credentials against
      // Supabase's auth service. Like signUp, it returns a Promise resolving
      // to { data, error }. `data` contains session/user info on success.
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
      // This catch only fires for unexpected thrown errors (e.g. network failure),
      // not for the normal "wrong password" case - Supabase reports that via
      // the `error` object above, not by throwing.
      console.log(error);
    }
  };

  // useEffect lets you run code in response to the component rendering, separate
  // from the render itself (these are called "side effects" - things like
  // network requests, subscriptions, timers).
  // The second argument, [], is the "dependency array". An empty array means
  // "only run this once, right after the component's first render, and never again."
  useEffect(() => {
    // supabase.auth.getSession() checks if there's already a valid session stored
    // (e.g. in localStorage from a previous visit) and returns it as a Promise.
    // .then() runs once that Promise resolves. The destructuring
    // `{ data: { session } }` reaches into the resolved object's `data` property
    // and pulls out its `session` field directly.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // supabase.auth.onAuthStateChange() sets up a subscription (not a one-time
    // check) - it registers a callback that Supabase calls every time auth state
    // changes: sign-in, sign-out, token refresh, etc. `_event` is the type of
    // change (prefixed with _ by convention to signal "we're not using this
    // parameter", though it's still passed positionally).
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Returning a cleanup function prevents duplicate auth listeners if this
    // provider is ever mounted/unmounted during development or future routing.
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

  // The Provider component. `value` is the object made available to every
  // descendant component via useContext - here, that's the current session
  // plus the three auth functions.
  return (
    <AuthContext.Provider value={{ session, signUpUser, signInUser, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}
