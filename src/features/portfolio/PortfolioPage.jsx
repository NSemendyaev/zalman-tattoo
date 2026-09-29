import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router';
import supabase from '../../lib/supabaseClient.js';
import { publicPhotoUrl } from '../../lib/portfolio.js';
import { useAuth } from '../../context/useAuth.js';

export default function PortfolioPage() {
  const { session } = useAuth();
  const [projects, setProjects] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Selected work | Zalman Tattoo';
    let active = true;
    Promise.all([
      supabase.from('PortfolioProject')
        .select('id, public_title, public_summary, created_at')
        .eq('published', true).order('created_at', { ascending: false }),
      supabase.from('PortfolioPhoto')
        .select('id, portfolio_project_id, public_path'),
    ]).then(([projectResult, photoResult]) => {
      if (!active) return;
      if (projectResult.error || photoResult.error) {
        setError('The portfolio is unavailable right now. Please try again later.');
        setProjects([]);
        return;
      }
      setProjects(projectResult.data ?? []);
      setPhotos(photoResult.data ?? []);
    }).catch(() => {
      if (active) { setError('The portfolio is unavailable right now. Please try again later.'); setProjects([]); }
    });
    return () => { active = false; document.title = previousTitle; };
  }, []);

  const photosByProject = useMemo(() => {
    const grouped = new Map();
    for (const photo of photos) {
      const group = grouped.get(photo.portfolio_project_id) ?? [];
      group.push(photo);
      grouped.set(photo.portfolio_project_id, group);
    }
    return grouped;
  }, [photos]);
  const featuredProject = projects?.find((project) => photosByProject.get(project.id)?.length);
  const featuredPhoto = featuredProject && photosByProject.get(featuredProject.id)[0];

  return <div className="public-portfolio">
    <header className="public-portfolio-header">
      <Link className="public-portfolio-brand" to="/portfolio">Zalman Tattoo</Link>
      <nav className="public-portfolio-nav" aria-label="Main navigation">
        <a href="#work">Work</a>
        <Link className="public-portfolio-login" to={session ? '/' : '/login'}>{session ? 'Dashboard' : 'Artist sign in'}<ArrowRight size={16} aria-hidden="true" /></Link>
      </nav>
    </header>
    <main>
      <section className="public-portfolio-hero" aria-labelledby="portfolio-title">
        <div className={`public-portfolio-hero-inner${featuredPhoto ? ' has-photo' : ''}`}>
          <div className="public-portfolio-hero-copy">
            <p className="eyebrow">Independent tattoo artist</p>
            <h1 id="portfolio-title">Tattoo work<br />by Zalman.</h1>
            <p>A selection of pieces made with care, one client at a time.</p>
            <a className="public-portfolio-hero-link" href="#work">View selected work <ArrowRight size={18} aria-hidden="true" /></a>
          </div>
          {featuredPhoto && <div className="public-portfolio-hero-art">
            <img src={publicPhotoUrl(supabase, featuredPhoto.public_path)} alt={`Tattoo from ${featuredProject.public_title}`} />
          </div>}
        </div>
      </section>
      <section className="public-portfolio-work" id="work" aria-labelledby="portfolio-work-title">
        <div className="public-portfolio-section-heading"><h2 id="portfolio-work-title">Selected work</h2></div>
        {projects === null && !error && <p role="status">Loading selected work…</p>}
        {error && <p className="public-portfolio-empty" role="alert">{error}</p>}
        {projects?.length === 0 && !error && <div className="public-portfolio-empty"><ImageIcon size={26} aria-hidden="true" /><p>Selected work will appear here soon.</p></div>}
        {!!projects?.length && <div className="public-portfolio-grid">{projects.map((project) => {
          const projectPhotos = photosByProject.get(project.id) ?? [];
          return <article className="public-portfolio-card" key={project.id}>
            <div className="public-portfolio-card-media">
              {projectPhotos.length
                ? <a href={publicPhotoUrl(supabase, projectPhotos[0].public_path)} target="_blank" rel="noreferrer" aria-label={`View photo of ${project.public_title}`}><img src={publicPhotoUrl(supabase, projectPhotos[0].public_path)} alt={project.public_title} loading="lazy" /></a>
                : <div className="public-portfolio-photo-placeholder"><ImageIcon size={30} aria-hidden="true" /><span>Photo coming soon</span></div>}
            </div>
            <div className="public-portfolio-card-copy"><h3>{project.public_title}</h3>{project.public_summary && <p>{project.public_summary}</p>}{projectPhotos.length > 1 && <div className="public-portfolio-thumbnails" aria-label={`More photos of ${project.public_title}`}>{projectPhotos.slice(1).map((photo, index) => <a key={photo.id} href={publicPhotoUrl(supabase, photo.public_path)} target="_blank" rel="noreferrer" aria-label={`View photo ${index + 2} of ${project.public_title}`}><img src={publicPhotoUrl(supabase, photo.public_path)} alt="" loading="lazy" /></a>)}</div>}</div>
          </article>;
        })}</div>}
      </section>
    </main>
    <footer className="public-portfolio-footer"><span>© {new Date().getFullYear()} Zalman Tattoo</span><span>Independent tattoo artist</span></footer>
  </div>;
}
