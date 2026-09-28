import { useState } from 'react';
import { LogIn, X } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../../context/useAuth.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const { signInUser, session, authError } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (event) => {
    // Prevent the browser's normal form submission, which would reload the page.
    event.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      // The auth provider keeps Supabase-specific authentication code in one place.
      const result = await signInUser(email, password);

      if (result?.success) {
        navigate('/');
      } else {
        setLoginError(result?.error || 'Could not sign in.');
      }
    } catch {
      setLoginError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (session) return <Navigate to="/" replace />;

  return (
    <>
      {(loginError || authError) && <LoginErrorToast message={loginError || authError} onClose={() => setLoginError('')} />}
      <div className="landing-page">
        <div className="login-form">
          <div className="login-brand">
            <span className="brand-mark">ZT</span>
            <div>
              <h1>Zalman Tattoo</h1>
              <p>Studio dashboard</p>
            </div>
          </div>
          <form onSubmit={handleSignIn}>
            <label htmlFor="login-email">Email</label><br />
            <input type="email" id="login-email" autoComplete="username" required onChange={event => setEmail(event.target.value)} autoFocus /><br />

            <label htmlFor="login-password">Password</label><br />
            <input type="password" id="login-password" autoComplete="current-password" required onChange={event => setPassword(event.target.value)} /><br />

            <button type="submit" disabled={loading}>
              <LogIn size={16} aria-hidden="true" />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function LoginErrorToast({ onClose, message }) {
  return (
    <div className="toast">
      <button className="toast-close" type="button" onClick={onClose} aria-label="Dismiss message" title="Dismiss message">
        <X size={16} aria-hidden="true" />
      </button>
      <p className="toast-message" role="alert">{message}</p>
    </div >
  );
}
