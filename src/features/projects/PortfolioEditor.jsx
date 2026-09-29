import { useEffect, useState } from 'react';
import { Globe2, Save, EyeOff } from 'lucide-react';
import supabase from '../../lib/supabaseClient.js';
import { portfolioPhotos, removePublicFiles } from '../../lib/portfolio.js';

export default function PortfolioEditor({ projectId, onChanged }) {
  const [portfolio, setPortfolio] = useState(undefined);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    supabase.from('PortfolioProject')
      .select('id, project_id, public_title, public_summary, published')
      .eq('project_id', projectId).maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setPortfolio(null);
          setError('Could not load public portfolio settings. Apply the portfolio migration first.');
        }
        else {
          setPortfolio(data);
          setTitle(data?.public_title ?? '');
          setSummary(data?.public_summary ?? '');
        }
      });
    return () => { active = false; };
  }, [projectId]);

  async function publish(event) {
    event.preventDefault();
    setError(''); setNotice('');
    if (!title.trim()) { setError('Choose a public title that does not identify your client.'); return; }
    setBusy(true);
    const payload = { public_title: title.trim(), public_summary: summary.trim(), published: true };
    const query = portfolio
      ? supabase.from('PortfolioProject').update(payload).eq('id', portfolio.id)
      : supabase.from('PortfolioProject').insert({ ...payload, project_id: projectId });
    const { data, error: saveError } = await query
      .select('id, project_id, public_title, public_summary, published').single();
    if (saveError) setError(saveError.message);
    else {
      setPortfolio(data);
      setNotice('Public overview saved. Select individual session photos to show with it.');
      onChanged?.();
    }
    setBusy(false);
  }

  async function unpublish() {
    if (!window.confirm('Remove this project and its selected photos from the public portfolio?')) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      const photos = await portfolioPhotos(supabase, portfolio.id);
      await removePublicFiles(supabase, photos.map((photo) => photo.public_path));
      const { error: photoError } = await supabase.from('PortfolioPhoto')
        .delete().eq('portfolio_project_id', portfolio.id);
      if (photoError) throw photoError;
      const { data, error: projectError } = await supabase.from('PortfolioProject')
        .update({ published: false }).eq('id', portfolio.id)
        .select('id, project_id, public_title, public_summary, published').single();
      if (projectError) throw projectError;
      setPortfolio(data);
      setNotice('Removed from the public portfolio.');
      onChanged?.();
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  return <section className="details-section portfolio-editor" aria-labelledby="portfolio-editor-title">
    <div className="details-section-heading"><div><span className="project-card-kicker">Curated work</span><h3 id="portfolio-editor-title">Public portfolio</h3></div><Globe2 size={20} aria-hidden="true" /></div>
    <p className="portfolio-editor-intro">Only the title and summary you write here, plus photos you select, appear publicly. Do not include client names, contact details, or private notes.</p>
    {portfolio === undefined ? <p role="status">Loading portfolio settings…</p> : <form onSubmit={publish} className="portfolio-editor-form">
      <div className="form-field"><label htmlFor={`public-title-${projectId}`}>Public title</label><input id={`public-title-${projectId}`} maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example: Floral sleeve" required /></div>
      <div className="form-field"><label htmlFor={`public-summary-${projectId}`}>Short overview</label><textarea id={`public-summary-${projectId}`} maxLength={500} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe the work without personal details." /></div>
      <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy}><Save size={16} aria-hidden="true" />{portfolio?.published ? 'Save public overview' : 'Publish overview'}</button>{portfolio?.published && <button className="button button-ghost" type="button" disabled={busy} onClick={unpublish}><EyeOff size={16} aria-hidden="true" />Unpublish</button>}</div>
    </form>}
    {portfolio?.published && <p className="portfolio-editor-live">Visible on the public portfolio</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p className="form-success" role="status">{notice}</p>}
  </section>;
}
