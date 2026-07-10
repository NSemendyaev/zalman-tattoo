import { useContext } from 'react';
import { AuthContext } from './AuthContext.js';

// Keeps consumers independent of the context implementation.
export function useAuth() {
  return useContext(AuthContext);
}
