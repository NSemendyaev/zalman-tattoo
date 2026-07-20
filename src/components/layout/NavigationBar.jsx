import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/useAuth.js';

export default function NavigationBar() {
  const { signOutUser } = useAuth();
  const navigate = useNavigate();

  // Sign-out is asynchronous because Supabase needs to clear the auth session
  // before the app sends the user back to the login route.
  const handleSignOut = async (event) => {
    event.preventDefault();

    try {
      await signOutUser();
      navigate('/login');
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <>
      <nav className="nav-bar">
        <div className="brand-lockup">
          <span className="brand-mark">ZT</span>
          <div className="brand-title-row">
            <p className="brand-title">Zalman Tattoo</p>
          </div>
        </div>

        <div className="nav-actions">
          <button className="button button-ghost" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </nav>

    </>
  );
}
