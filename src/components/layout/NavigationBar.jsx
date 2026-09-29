import { ChartNoAxesCombined, Globe2, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../context/useAuth.js';
import { useState } from 'react';

export default function NavigationBar() {
  const { signOutUser } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  // Sign-out is asynchronous because Supabase needs to clear the auth session
  // before the app sends the user back to the login route.
  const handleSignOut = async (event) => {
    event.preventDefault();

    try {
      await signOutUser();
      navigate('/login');
    } catch {
      setErrorMessage('Could not sign out. Please try again.');
    }
  }

  return (
    <>
      <nav className="nav-bar">
        <div className="brand-lockup">
          <div className="brand-title-row">
            <p className="brand-title">Zalman Tattoo</p>
          </div>
        </div>

        <div className="nav-links">
          <NavLink to="/" end><LayoutDashboard size={16} aria-hidden="true" />Projects</NavLink>
          <NavLink to="/insights"><ChartNoAxesCombined size={16} aria-hidden="true" />Insights</NavLink>
          <NavLink to="/portfolio"><Globe2 size={16} aria-hidden="true" />Portfolio</NavLink>
        </div>

        <div className="nav-actions">
          <button className="button button-ghost" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </nav>
      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

    </>
  );
}
