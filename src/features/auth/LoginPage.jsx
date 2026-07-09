import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/useAuth.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // useAuth is a custom hook from AuthContext. It gives this component access
  // to the current session and auth functions without passing them down as props.
  const { session, signInUser } = useAuth();
  const navigate = useNavigate();

  console.log(session);

  // The form currently supports sign-in only. Sign-up still exists in the auth
  // provider and can be wired to a separate create-account flow later.
  const handleSignIn = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await signInUser(email, password);

      if (result.success) {
        navigate('/');
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setError(true);
      setTimeout(() => { setError(false); }, 10000);
    }
  };

  return (
    <>
      {error && <AlertIncorrectEmailOrPassword onClick={() => setError(false)} />}
      <div className="landing-page">
        <div className="login-form">
          <div className="login-brand">
            <span className="brand-mark">ZT</span>
            <div>
              <h1>Zalman Tattoo</h1>
              <p>Studio dashboard</p>
            </div>
          </div>
          <form action="">
            <label htmlFor="login-email">Email</label><br />
            <input type="text" id="login-email" onChange={event => setEmail(event.target.value)} autoFocus></input><br />

            <label htmlFor="login-password">Password</label><br />
            <input type="password" id="login-password" onChange={event => setPassword(event.target.value)} autoFocus></input><br />

            <button type="button" onClick={handleSignIn} autoFocus>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    </>
  );
}

const AlertIncorrectEmailOrPassword = ({ onClick }) => {
  // Small toast-style alert used when a project cannot be connected to an
  // existing client record.
  return (
    <div className="toast">
      <button className="toast-close" type="button" onClick={onClick} >&times;</button>
      <p className="toast-message">Invalid password or email!</p>
    </div >
  );
};
