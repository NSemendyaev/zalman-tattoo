import { createContext } from 'react';

// createContext() creates a React Context object.
// Think of it like a shared box for data that many components may need.
// The context does not contain useful auth data by itself yet.
// The actual auth data is added later through:
// <AuthContext.Provider value={{ session, signUpUser, signInUser, signOutUser }}>
// Components can then read that value with useContext(AuthContext)
// or with our custom useAuth() hook.
export const AuthContext = createContext();
