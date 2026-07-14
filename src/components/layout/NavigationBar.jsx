import { useState } from 'react';
import { LogOut, Plus, UserPlus } from 'lucide-react';
import { AddClientModal } from '../modals/AddClientModal.jsx';
import { CreateProjectModal } from '../modals/CreateProjectModal.jsx';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/useAuth.js';

export default function NavigationBar({ onProjectCreated }) {
  // These booleans decide whether each modal is visible.
  // In React, changing state with the setter function causes this component to
  // render again, so the JSX below can show or hide the matching modal.
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

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
          <button className="button button-primary" onClick={() => setIsProjectModalOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Create Project
          </button>
          <button className="button button-ghost" onClick={() => setIsClientModalOpen(true)}>
            <UserPlus size={16} aria-hidden="true" />
            Add Client
          </button>
          <span className="nav-actions-divider" aria-hidden="true" />
          <button className="button button-ghost" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </nav>

      {isClientModalOpen && (
        <AddClientModal onClose={() => setIsClientModalOpen(false)} />
      )}

      {isProjectModalOpen && (
        <CreateProjectModal
          onClose={() => setIsProjectModalOpen(false)}
          onCreated={() => {
            onProjectCreated();
            setIsProjectModalOpen(false);
          }}
        />
      )}
    </>
  );
}
