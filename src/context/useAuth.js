import { useContext } from 'react';
import { AuthContext } from './AuthContext.js';

// Keeps consumers independent of the context implementation and gives one import to use.
export function useAuth() {
  return useContext(AuthContext);
}
