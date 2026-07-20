import './App.css'
import NavigationBar from './components/layout/NavigationBar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProjectsGrid from './features/projects/ProjectsGrid.jsx';
import { useAuth } from './context/useAuth.js';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useState } from 'react';

function App() {
  const navigate = useNavigate();
  const { session } = useAuth();
  // Changing this key deliberately remounts the grid after a project is created,
  // causing it to fetch the latest project list.
  const [projectsVersion, setProjectsVersion] = useState(0);

  // `undefined` means auth is still loading; `null` means no signed-in user.
  useEffect(() => {
    if (session === null) {
      navigate('/login');
    }
  }, [navigate, session]);

  // Wait for Supabase to restore any existing browser session before rendering.
  if (session === undefined) {
    return null;
  }

  return (
    <div className='app-layout-grid'>
      <header className='app-layout-header-element'>
        <NavigationBar />
      </header>
      <main className='app-layout-main-element'>
        <ProjectsGrid
          key={projectsVersion}
          onProjectCreated={() => setProjectsVersion((version) => version + 1)}
        />
      </main>
      <footer className='app-layout-footer-element'><Footer /></footer>
    </div>
  );

}

export default App
