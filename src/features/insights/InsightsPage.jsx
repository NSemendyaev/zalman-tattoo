import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CalendarDays, CircleCheck, FolderKanban, PoundSterling, RefreshCw } from 'lucide-react';
import supabase from '../../lib/supabaseClient.js';
import { availableInsightYears, summarizeInsights } from '../../lib/insights.js';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const compactMoney = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

async function fetchAllRows(table, columns) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(start, start + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export default function InsightsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [reload, setReload] = useState(0);
  const autoYear = useRef(true);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setReload((value) => value + 1);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 120_000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAllRows('Project', 'id, date_start, style'),
      fetchAllRows('Session', 'id, appointment_date, amount_paid, Status(status)'),
    ]).then(([projects, sessions]) => {
      if (active) {
        const yearsWithData = availableInsightYears(projects, sessions).filter((value) =>
          projects.some((project) => project.date_start?.startsWith(String(value))) ||
          sessions.some((session) => session.appointment_date?.startsWith(String(value))));
        if (autoYear.current) {
          const currentYear = new Date().getFullYear();
          setYear(yearsWithData.includes(currentYear) ? currentYear : yearsWithData[0] ?? currentYear);
        }
        setData({ projects, sessions });
        setError('');
      }
    }).catch(() => {
      if (active) setError('Could not load studio insights. Please try again.');
    });
    return () => { active = false; };
  }, [reload]);

  const years = useMemo(() => data ? availableInsightYears(data.projects, data.sessions) : [year], [data, year]);
  const summary = useMemo(() => data ? summarizeInsights(data.projects, data.sessions, year) : null, [data, year]);

  return <section className="insights-page">
    <header className="insights-heading">
      <div><p className="eyebrow">Studio insights</p><h1>Know your work.</h1><p>See where your time goes, which styles clients choose, and how recorded payments change through the year.</p></div>
      <label className="insights-year">Year <select value={year} onChange={(event) => { autoYear.current = false; setYear(Number(event.target.value)); }}>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </header>

    {error && <div className="insights-error" role="alert"><p>{error}</p><button className="button button-secondary" type="button" onClick={() => { setData(null); setError(''); setReload((value) => value + 1); }}><RefreshCw size={16} aria-hidden="true" />Retry</button></div>}
    {!data && !error && <p className="insights-loading" role="status">Loading studio insights…</p>}

    {summary && !error && <>
      <div className="insight-metrics">
        <Metric icon={PoundSterling} label="Payments recorded" value={money.format(summary.totalCollected)} detail={`${summary.paidSessions} paid ${summary.paidSessions === 1 ? 'session' : 'sessions'}`} />
        <Metric icon={CalendarDays} label="Top earning month" value={summary.bestMonth?.name ?? '—'} detail={summary.bestMonth ? money.format(summary.bestMonth.amount) : 'No payments recorded'} />
        <Metric icon={CircleCheck} label="Completed sessions" value={summary.completedSessions} detail="Completed or recorded" />
        <Metric icon={FolderKanban} label="Projects started" value={summary.projectCount} detail={`In ${year}`} />
      </div>

      <div className="insights-grid">
        <section className="insights-panel insights-panel--wide" aria-labelledby="monthly-payments-title">
          <div className="insights-panel-heading"><span className="insights-panel-icon"><PoundSterling size={18} aria-hidden="true" /></span><div><h2 id="monthly-payments-title">Payments by month</h2><p>Recorded session payments in {year}</p></div></div>
          {summary.totalCollected !== 0 ? <><span className="chart-scroll-hint">Scroll to see all months →</span><div className="monthly-chart-scroll"><div className="monthly-chart" role="img" aria-label={summary.months.map((month) => `${month.name}: ${money.format(month.amount)}`).join(', ')}>{summary.months.map((month) => <div className="monthly-column" key={month.name}><span className="monthly-amount">{month.amount ? compactMoney.format(month.amount) : ''}</span><div className="monthly-track"><span className="monthly-fill" style={{ height: `${Math.max(0, month.amount / Math.max(...summary.months.map((item) => item.amount)) * 100)}%` }} /></div><span className="monthly-label">{month.name}</span></div>)}</div></div></> : <EmptyChart text="No session payments recorded for this year." />}
          <p className="insight-footnote">Payments are grouped by appointment date. Project deposits are excluded; there is no separate payment date or expense record, so this is not a profit calculation.</p>
        </section>

        <section className="insights-panel" aria-labelledby="styles-title">
          <div className="insights-panel-heading"><span className="insights-panel-icon"><Activity size={18} aria-hidden="true" /></span><div><h2 id="styles-title">Popular tattoo styles</h2><p>Projects started in {year}</p></div></div>
          {summary.styles.length ? <div className="styles-chart">{summary.styles.slice(0, 6).map((style) => <div className="style-row" key={style.name}><div className="style-row-heading"><strong>{style.name}</strong><span>{style.count}</span></div><div className="style-track"><span style={{ width: `${style.count / summary.styles[0].count * 100}%` }} /></div></div>)}</div> : <EmptyChart text="Add a tattoo style to projects to see a breakdown." />}
          <p className="insight-footnote">{summary.unspecifiedStyles} {summary.unspecifiedStyles === 1 ? 'project has' : 'projects have'} no style set. Similar names are grouped without changing saved project data.</p>
        </section>

        <section className="insights-panel insights-panel--full" aria-labelledby="weekdays-title">
          <div className="insights-panel-heading"><span className="insights-panel-icon"><CalendarDays size={18} aria-hidden="true" /></span><div><h2 id="weekdays-title">Busiest workdays</h2><p>Completed sessions by appointment weekday</p></div></div>
          {summary.completedSessions ? <div className="weekday-chart">{summary.weekdays.map((day) => <div className="weekday-column" key={day.name}><span>{day.count}</span><div className="weekday-track"><span style={{ height: `${day.count / Math.max(...summary.weekdays.map((item) => item.count)) * 100}%` }} /></div><strong>{day.name}</strong></div>)}</div> : <EmptyChart text="Complete a session to see your busiest days." />}
        </section>
      </div>
    </>}
  </section>;
}

function Metric({ icon: Icon, label, value, detail }) {
  return <div className="insight-metric"><span className="insight-metric-icon"><Icon size={20} aria-hidden="true" /></span><span className="insight-metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function EmptyChart({ text }) {
  return <p className="insight-empty">{text}</p>;
}
