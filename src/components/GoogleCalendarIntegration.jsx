import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { calendarAction } from '../lib/googleCalendar.js';

export default function GoogleCalendarIntegration({ visible }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await calendarAction('status');
      setStatus(next);
      setError('');
      return next;
    } catch (problem) {
      setError(problem.message);
      return null;
    }
  }, []);

  const sync = useCallback(async () => {
    try {
      const result = await calendarAction('sync');
      setStatus((current) => current ? {
        ...current, lastSyncedAt: new Date().toISOString(), lastError: null,
      } : current);
      setError('');
      return result;
    } catch (problem) {
      setError(problem.message);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    const start = async () => {
      const next = await refresh();
      if (active && next?.connected) await sync();
    };
    start();
    const onChange = () => { if (active && status?.connected) sync(); };
    const onFocus = () => { if (document.visibilityState === 'visible') onChange(); };
    window.addEventListener('studio:calendar-changed', onChange);
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 120_000);
    return () => {
      active = false;
      window.removeEventListener('studio:calendar-changed', onChange);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [refresh, sync, status?.connected]);

  async function connect() {
    setBusy(true); setError('');
    try {
      const { url } = await calendarAction('connect');
      window.location.assign(url);
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Google Calendar? Events already added there will remain.')) return;
    setBusy(true); setError('');
    try {
      await calendarAction('disconnect');
      setStatus({ connected: false });
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  if (!visible) return null;
  const callbackError = new URLSearchParams(window.location.search).get('calendar') === 'error';
  return <section className="calendar-integration" aria-label="Google Calendar">
    <div className="calendar-integration-copy">
      <span className="calendar-integration-icon"><CalendarDays size={20} aria-hidden="true" /></span>
      <div><strong>Google Calendar</strong><p>{status?.connected
        ? 'Scheduled sessions sync to your Google Calendar. Changes are checked when you use the app and every two minutes while it stays open.'
        : 'Connect your Google account to keep upcoming sessions on your calendar.'}</p></div>
    </div>
    <div className="calendar-integration-actions">
      {status?.connected
        ? <><button className="button button-secondary" type="button" disabled={busy} onClick={async () => { setBusy(true); await sync(); setBusy(false); }}><RefreshCw size={16} aria-hidden="true" />Sync now</button>{status.lastError && <button className="button button-secondary" type="button" disabled={busy} onClick={connect}>Reconnect</button>}<button className="button button-ghost" type="button" disabled={busy} onClick={disconnect}>Disconnect</button></>
        : <button className="button button-secondary" type="button" disabled={busy || status === null} onClick={connect}>Connect Google Calendar</button>}
    </div>
    {(error || status?.lastError || callbackError) && <p className="calendar-integration-error" role="alert">{error || status?.lastError || 'Google connection was not completed. Please try again.'}</p>}
    {status?.connected && status.lastSyncedAt && <small className="calendar-integration-updated">Last checked {new Date(status.lastSyncedAt).toLocaleString('en-GB')}</small>}
  </section>;
}
