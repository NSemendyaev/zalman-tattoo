import './App.css'
import NavigationBar from './components/layout/NavigationBar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProjectsGrid from './features/projects/ProjectsGrid.jsx';
import { useAuth } from './context/useAuth.js';
import { useNavigate } from 'react-router';
import { useEffect } from 'react';

function App() {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [navigate, session]);

  return (
    <div className='app-layout-grid'>
      <header className='app-layout-header-element'><NavigationBar /></header>
      <main className='app-layout-main-element'>
        <ProjectsGrid />
      </main>
      <footer className='app-layout-footer-element'><Footer /></footer>
    </div>
  );

}

export default App
