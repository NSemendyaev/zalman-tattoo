import { useContext } from 'react';
import { AuthContext } from './AuthContext.js';

// useAuth() is a custom hook: a small helper function that wraps useContext(AuthContext).
// It returns whatever value was passed to the nearest <AuthContext.Provider> above
// this component in the React tree.
// In this project, that value is:
// { session, signUpUser, signInUser, signOutUser }
// This lets components write `const { session, signInUser } = useAuth();`
// instead of importing AuthContext and calling useContext(AuthContext) directly.
export function useAuth() {
  return useContext(AuthContext);
}
