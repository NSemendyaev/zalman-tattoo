import './App.css'
import NavigationBar from './components/layout/NavigationBar.jsx';
import Footer from './components/layout/Footer.jsx';
import ProjectsGrid from './features/projects/ProjectsGrid.jsx';
import InsightsPage from './features/insights/InsightsPage.jsx';
import GoogleCalendarIntegration from './components/GoogleCalendarIntegration.jsx';
import PortfolioPage from './features/portfolio/PortfolioPage.jsx';
import { useAuth } from './context/useAuth.js';
import { Navigate } from 'react-router';
import { useState } from 'react';

function App({ page = 'projects' }) {
  const { session } = useAuth();
  // Changing this key deliberately remounts the grid after a project is created,
  // causing it to fetch the latest project list.
  const [projectsVersion, setProjectsVersion] = useState(0);

  if (session === undefined) return <p role="status">Restoring your session…</p>;
  if (!session) return page === 'projects' ? <PortfolioPage /> : <Navigate to="/" replace />;

  return (
    <div className='app-layout-grid'>
      <header className='app-layout-header-element'>
        <NavigationBar />
      </header>
      <main className='app-layout-main-element'>
        {import.meta.env.VITE_GOOGLE_CALENDAR_ENABLED === 'true' && <GoogleCalendarIntegration visible={page === 'projects'} />}
        {page === 'insights' ? <InsightsPage /> : <ProjectsGrid
          key={projectsVersion}
          onProjectCreated={() => setProjectsVersion((version) => version + 1)}
        />}
      </main>
      <footer className='app-layout-footer-element'><Footer /></footer>
    </div>
  );

}

export default App
