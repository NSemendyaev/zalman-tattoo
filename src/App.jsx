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
  const [projectsVersion, setProjectsVersion] = useState(0);

  useEffect(() => {
    if (session === null) {
      navigate('/login');
    }
  }, [navigate, session]);

  if (session === undefined) {
    return null;
  }

  return (
    <div className='app-layout-grid'>
      <header className='app-layout-header-element'>
        <NavigationBar onProjectCreated={() => setProjectsVersion((version) => version + 1)} />
      </header>
      <main className='app-layout-main-element'>
        <ProjectsGrid key={projectsVersion} />
      </main>
      <footer className='app-layout-footer-element'><Footer /></footer>
    </div>
  );

}

export default App
