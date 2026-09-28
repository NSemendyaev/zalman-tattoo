import { cloneElement, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpDown, CalendarPlus, Check, ChevronDown, CircleCheck, FolderKanban, LoaderCircle, Pencil, Plus, Search, SearchCheck, Trash2, UserPlus, X } from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';
import { AddClientModal } from '../../components/modals/AddClientModal';
import { CreateProjectModal } from '../../components/modals/CreateProjectModal';
import ScheduleSession from '../../components/modals/ScheduleSession';
import supabase from '../../lib/supabaseClient';
import UpcomingSession from './UpcomingSession';
import PrivatePhoto from '../../components/PrivatePhoto.jsx';
import { PHOTO_BUCKET, uploadPhotos, removePhotos } from '../../lib/photos.js';
import { PROJECT_STATUSES, SESSION_STATUSES, validateProject, validateSession, normalizePhone, isSessionOverdue, sessionNeedsReview, projectStatusLabel, sessionStatusLabel } from '../../lib/projectRules.js';
import { notifyCalendarChanged } from '../../lib/googleCalendar.js';

const statusClassNames = {
  'In Progress': 'status-pill--in-progress',
  'In Review': 'status-pill--in-review',
  Completed: 'status-pill--completed',
};

function messageFor(error, fallback) {
  return error?.message ? `${fallback} ${error.message}` : fallback;
}

export default function ProjectsGrid({ onProjectCreated }) {
  const [projectSummaries, setProjectSummaries] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const refreshProjects = useCallback(async () => {
    setLoadError('');
    const { data, error } = await supabase
      .from('Project')
      .select(`id, project_title, date_start, target_end_date, status_id, Client (first_name, last_name, instagram, phone), Status (status)`);

    if (error) {
      setLoadError(messageFor(error, 'Could not load projects.'));
      setProjectSummaries([]);
      return;
    }
    setProjectSummaries(data ?? []);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    const load = window.setTimeout(refreshProjects, 0);
    return () => window.clearTimeout(load);
  }, [refreshProjects]);

  const sortedProjectSummaries = useMemo(() => {
    if (!projectSummaries) {
      return null;
    }

    const query = search.trim().toLowerCase();
    const summaries = projectSummaries.filter((project) => `${project.project_title} ${project.Client?.first_name ?? ''} ${project.Client?.last_name ?? ''}`.toLowerCase().includes(query));

    if (sortBy === 'date-new-first') {
      return summaries.sort((a, b) =>
        (b.date_start ?? '').localeCompare(a.date_start ?? ''),
      );
    }

    if (sortBy === 'date-old-first') {
      return summaries.sort((a, b) =>
        (a.date_start ?? '').localeCompare(b.date_start ?? ''),
      );
    }

    const ranks = {
      'in-progress': { 'In Progress': 0, 'In Review': 1, Completed: 2 },
      'in-review': { 'In Review': 0, 'In Progress': 1, Completed: 2 },
      completed: { Completed: 0, 'In Review': 1, 'In Progress': 2 },
    }[sortBy];
    if (!ranks) {
      return summaries;
    }

    return summaries.sort(
      (a, b) =>
        (ranks[a.Status?.status] ?? Number.MAX_SAFE_INTEGER) -
        (ranks[b.Status?.status] ?? Number.MAX_SAFE_INTEGER),
    );
  }, [projectSummaries, sortBy, search]);

  return (
    <section className="dashboard-section">
      <DashboardHeader
        projectSummaries={projectSummaries}
        onAddClient={() => setIsClientModalOpen(true)}
        onCreateProject={() => setIsProjectModalOpen(true)}
      />
      {loadError && (
        <p className="form-error" role="alert">
          {loadError}
        </p>
      )}
      <div className="dashboard-highlight">
        <UpcomingSession revision={revision} onProjectChanged={refreshProjects} />
      </div>
      <SessionsToReview revision={revision} onProjectChanged={refreshProjects} />
      <div className="project-list-header">
        <div><p className="eyebrow">Workspace</p><h2>All projects</h2></div>
        <div className="project-tools">
          <label className="project-search"><Search size={18} aria-hidden="true" /><span className="visually-hidden">Search projects or clients</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or clients" /></label>
          <label className="sort-control"><ArrowUpDown size={17} aria-hidden="true" /><span className="visually-hidden">Sort projects</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="">Default</option><option value="date-new-first">Newest</option><option value="date-old-first">Oldest</option><option value="in-progress">In progress</option><option value="in-review">Client review</option><option value="completed">Completed</option></select></label>
        </div>
      </div>
      <div className="cards-grid">
        {sortedProjectSummaries === null &&
          Array.from({ length: 3 }, (_, index) => (
            <div
              className="project-card project-card-loading"
              key={index}
            />
          ))}
        {sortedProjectSummaries?.length === 0 && (
          <EmptyState text={search ? "No projects match your search." : "No projects yet. Add a client, then create their first project."} />
        )}
        {sortedProjectSummaries?.map((project) => (
          <ProjectCard key={project.id} revision={revision} project={project} onProjectChanged={refreshProjects} />
        ))}
      </div>
      {isClientModalOpen && <AddClientModal onClose={() => setIsClientModalOpen(false)} />}
      {isProjectModalOpen && (
        <CreateProjectModal
          onClose={() => setIsProjectModalOpen(false)}
          onCreated={() => {
            setIsProjectModalOpen(false);
            refreshProjects();
            onProjectCreated?.();
          }}
        />
      )}
    </section>
  );
}

function DashboardHeader({ projectSummaries, onAddClient, onCreateProject }) {
  const counts = useMemo(
    () =>
      (projectSummaries ?? []).reduce(
        (result, project) => {
          const status = project.Status?.status;

          if (Object.hasOwn(result, status)) {
            result[status] += 1;
          }

          return result;
        },
        { 'In Progress': 0, 'In Review': 0, Completed: 0 },
      ),
    [projectSummaries],
  );

  return (
    <div className="dashboard-heading">
      <div className="dashboard-title-group">
        <p className="eyebrow">Studio overview</p>
        <h1>Good to see you.</h1>
        {projectSummaries && (
          <p className="dashboard-meta">
            <span className="project-card-topline">
              <span className="status-count">
                <FolderKanban size={15} aria-hidden="true" />
                {projectSummaries.length} projects
              </span>
              <span className="status-count status-count--in-progress">
                <LoaderCircle size={15} aria-hidden="true" />
                {counts['In Progress']} In Progress
              </span>
              <span className="status-count status-count--in-review">
                <SearchCheck size={15} aria-hidden="true" />
                {counts['In Review']} Client review
              </span>
              <span className="status-count status-count--completed">
                <CircleCheck size={15} aria-hidden="true" />
                {counts.Completed} Completed
              </span>
            </span>
          </p>
        )}
      </div>
      <div className="grid-actions">
        <button className="button button-secondary" type="button" onClick={onAddClient}>
          <UserPlus size={16} aria-hidden="true" />
          Add Client
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={onCreateProject}
        >
          <Plus size={16} aria-hidden="true" />
          Create Project
        </button>
      </div>
    </div>
  );
}

function SessionsToReview({ revision, onProjectChanged }) {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [showAll, setShowAll] = useState(false);
  const [openedSession, setOpenedSession] = useState(null);

  useEffect(() => {
    let active = true;
    supabase.from('Session')
      .select('id, project_id, appointment_date, appointment_time, Status(status), Project(project_title, Client(first_name, last_name))')
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) { setError('Could not check sessions needing review.'); return; }
        setError('');
        setSessions(data ?? []);
        setNow(new Date());
      });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const due = sessions.filter((session) => sessionNeedsReview(session, now))
    .sort((a, b) => `${b.appointment_date}T${b.appointment_time}`.localeCompare(`${a.appointment_date}T${a.appointment_time}`));

  if (error) return <p className="form-error dashboard-review-error" role="alert">{error}</p>;
  if (!due.length) return null;

  return <section className="sessions-to-review" aria-labelledby="sessions-to-review-title">
    <div className="review-heading"><div className="review-heading-title"><AlertCircle size={20} aria-hidden="true" /><div><h2 id="sessions-to-review-title">Sessions to review <span>{due.length}</span></h2><p>Resolve past appointments and old session statuses.</p></div></div>{due.length > 3 && <button type="button" className="review-toggle" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show fewer' : `Show all ${due.length}`}</button>}</div>
    <div className="review-list">{(showAll ? due : due.slice(0, 3)).map((session) => <button className="review-item" key={session.id} type="button" onClick={() => setOpenedSession(session)}><span><strong>{session.Project?.project_title ?? 'Project'}</strong><small>{session.Project?.Client?.first_name} {session.Project?.Client?.last_name}</small></span><span className="review-item-date">{session.appointment_date} · {session.appointment_time?.slice(0, 5)}</span><span className="review-item-status">{session.Status?.status === 'Expired' ? 'Expired' : session.Status?.status === 'In Review' ? sessionStatusLabel('In Review') : 'Overdue'}</span></button>)}</div>
    {openedSession && <ProjectDetails key={openedSession.id} projectId={openedSession.project_id} initialSessionId={openedSession.id} onClose={() => setOpenedSession(null)} onProjectChanged={onProjectChanged} />}
  </section>;
}

function ProjectCard({ project, onProjectChanged, revision }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [upcomingSession, setUpcomingSession] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    async function fetchCardData() {
      const [{ data: upcoming }, { data: sessions }] = await Promise.all([
        supabase.rpc('studio_upcoming_session', { p_project_id: project.id }),
        supabase.from('Session').select('img_urls, appointment_date, appointment_time').eq('project_id', project.id).order('appointment_date', { ascending: false }).order('appointment_time', { ascending: false }).limit(1),
      ]);
      setUpcomingSession(Array.isArray(upcoming) ? upcoming[0] ?? null : upcoming ?? null);
      setPreviewUrl(sessions?.[0]?.img_urls?.at(-1) ?? null);
    }
    fetchCardData();
  }, [project.id, revision]);

  const client = project.Client ?? {};
  const clientName =
    [client.first_name, client.last_name].filter(Boolean).join(' ') ||
    'Client unavailable';

  return (
    <>
      <div className="project-card" role="button" tabIndex={0} onClick={() => setIsDetailsOpen(true)} onKeyDown={(event) => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setIsDetailsOpen(true); } }}>
        <span className="project-preview">
          <span className="project-card-topline">
            <span className="project-card-kicker">Project</span>
            <span
              className={`status-pill ${statusClassNames[project.Status?.status] ?? 'status-pill--default'
                }`}
            >
              {projectStatusLabel(project.Status?.status) ?? 'Unknown'}
            </span>
          </span>
          <strong>{project.project_title}</strong>
          {previewUrl && <span className="project-photos-gallery">
              <PrivatePhoto
                className="project-photo"
                path={previewUrl}
                alt="Latest session work"
                width={200}
                height={150}
              />
          </span>}
          <span className="project-client">
            {clientName}
            <span className="project-contact-actions">
              {client.phone && (
                <a
                  className="project-contact-link"
                  href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Open WhatsApp chat with ${clientName}`}
                >
                  <FaWhatsapp aria-hidden="true" />
                </a>
              )}
              {client.instagram && (
                <a
                  className="project-contact-link"
                  href={client.instagram}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Open ${clientName}'s Instagram`}
                >
                  <FaInstagram aria-hidden="true" />
                </a>
              )}
            </span>
          </span>
          <span className="project-card-footer">
            <span className="project-card-meta">Next session</span>
            <span className="project-card-date">
              {upcomingSession
                ? `${upcomingSession.appointment_date} ${upcomingSession.appointment_time ?? ''}`
                : 'Not scheduled'}
            </span>
          </span>
        </span>
      </div>
      {isDetailsOpen && (
        <ProjectDetails
          projectId={project.id}
          onClose={() => setIsDetailsOpen(false)}
          onProjectChanged={onProjectChanged}
        />
      )}
    </>
  );
}

export function ProjectDetails({ onClose, projectId, onProjectChanged, initialSessionId }) {
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [sessionsVersion, setSessionsVersion] = useState(0);

  const refreshProject = useCallback(async () => {
    const { data, error } = await supabase
      .from('Project')
      .select(
        'id, project_title, client_id, status_id, placement, size, style, reference, design_notes, cartridge_brand, needle_config, date_start, target_end_date, agreed_price, deposit_amount, deposit_received, client_feedback, artist_notes, Status (id, status), Client (first_name, last_name, phone, email, instagram)',
      )
      .eq('id', projectId)
      .single();

    if (error) {
      setLoadError(messageFor(error, 'Could not load this project.'));
      return;
    }

    setProject(data);
  }, [projectId]);

  useEffect(() => {
    const load = window.setTimeout(refreshProject, 0);
    return () => window.clearTimeout(load);
  }, [refreshProject]);
  const refreshSessions = () => {
    setSelectedSession(null);
    setSessionsVersion((version) => version + 1);
    onProjectChanged?.();
  };

  if (isScheduling) {
    return (
      <ScheduleSession
        projectId={projectId}
        onClose={() => setIsScheduling(false)}
        onScheduled={() => {
          setIsScheduling(false);
          refreshSessions();
          notifyCalendarChanged();
        }}
      />
    );
  }

  return <div id="project-details-modal" className="modal"><div className="modal-content project-details-modal-content">
    <button className="close" type="button" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
    {loadError && <p className="form-error" role="alert">{loadError}</p>}
    {!project && !loadError && <p>Loading project…</p>}
    {project && <div className="project-details"><div className="project-details-header"><span className="project-card-kicker">Project workspace</span><h2>{project.project_title}</h2><p>{project.Client?.first_name} {project.Client?.last_name} <span aria-hidden="true">·</span> {projectStatusLabel(project.Status?.status)}</p></div>
      <div className="project-detail-sections"><section className="details-section sessions-section"><div className="details-section-heading"><div><span className="project-card-kicker">Sessions</span><h3>Session History</h3></div><button className="button button-secondary" type="button" onClick={() => setIsScheduling(true)}><CalendarPlus size={16} aria-hidden="true" />Schedule Session</button></div>
        <SessionGrid key={sessionsVersion} projectId={project.id} initialSessionId={initialSessionId} onSelectSession={setSelectedSession} />
        {selectedSession && <SessionDetails key={selectedSession.id} session={selectedSession} projectId={project.id} onUpdated={(session) => { setSelectedSession(session); setSessionsVersion((version) => version + 1); onProjectChanged?.(); }} onDeleted={refreshSessions} />}
      </section><details className="detail-disclosure"><summary><span>Project details <small>Design, pricing and notes</small></span><ChevronDown size={20} aria-hidden="true" /></summary><ProjectInfo project={project} onUpdated={(updated) => { setProject(updated); onProjectChanged?.(); }} onDeleted={() => { onProjectChanged?.(); onClose(); }} /></details><details className="detail-disclosure"><summary><span>Client details <small>Contact information</small></span><ChevronDown size={20} aria-hidden="true" /></summary><ClientInfo client={project.Client} clientId={project.client_id} onUpdated={(client) => { setProject((current) => ({ ...current, Client: client })); onProjectChanged?.(); }} /></details></div>
    </div>}
  </div></div>;
}

function SessionGrid({ projectId, initialSessionId, onSelectSession }) {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSessions() {
      const { data, error: queryError } = await supabase
        .from('Session')
        .select('*, Status (id, status)')
        .eq('project_id', projectId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (queryError) {
        setError(messageFor(queryError, 'Could not load session history.'));
        setSessions([]);
        return;
      }

      setSessions(data ?? []);
      if (initialSessionId) {
        const initial = data?.find((session) => session.id === initialSessionId);
        if (initial) onSelectSession(initial);
      }
    }

    fetchSessions();
  }, [projectId, initialSessionId, onSelectSession]);

  if (!sessions) {
    return <div className="session-timeline">Loading sessions…</div>;
  }

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }

  if (!sessions.length) {
    return <EmptyState text="No sessions have been scheduled for this project." />;
  }

  return (
    <div className="session-timeline">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onClick={() => onSelectSession(session)}
        />
      ))}
    </div>
  );
}

function SessionCard({ session, onClick }) {
  const [, month, day] = session.appointment_date?.split('-') ?? [];
  const monthLabel = month ? new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`2000-${month}-15T12:00:00`)).toUpperCase() : 'TBC';
  const label = isSessionOverdue(session) ? 'Overdue' : sessionStatusLabel(session.Status?.status) ?? `Status #${session.status_id}`;
  return <button className="session-timeline-card" type="button" onClick={onClick}><span className="session-timeline-marker" aria-hidden="true" /><span className="session-date-badge"><strong>{day ?? '--'}</strong><small>{monthLabel}</small></span><span className="session-summary"><span className="session-summary-topline"><strong>{session.appointment_time || 'Time not set'}</strong><span>{session.duration || 'Duration not set'}</span><span className={`session-status ${label === 'Upcoming' ? 'session-status--upcoming' : ''} ${label === 'Overdue' || label === 'Expired' ? 'session-status--overdue' : ''}`}>{label}</span>{session.amount_paid != null && <span className="session-payment">£{session.amount_paid}</span>}</span><span className="session-summary-notes">{session.session_notes || 'No session notes added yet.'}</span></span></button>;
}

function SessionDetails({ session, projectId, onUpdated, onDeleted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    appointment_date: session.appointment_date ?? '',
    appointment_time: session.appointment_time ?? '',
    status_id: String(session.status_id ?? ''),
    duration: session.duration ?? '',
    amount_paid: session.amount_paid ?? '',
    session_notes: session.session_notes ?? '',
    img_urls: session.img_urls ?? [],
  });
  const currentStatus = session.Status?.status;
  const legacyStatus = currentStatus && !SESSION_STATUSES.includes(currentStatus);
  const overdue = isSessionOverdue(session);

  useEffect(() => {
    supabase
      .from('Status')
      .select('id, status').in('status', SESSION_STATUSES)
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          setFormError(messageFor(error, 'Could not load session statuses.'));
          return;
        }

        setStatuses(data ?? []);
      });
  }, []);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const storage = supabase.storage.from(PHOTO_BUCKET);
  const storageUrl = import.meta.env.VITE_SUPABASE_URL;

  async function save() {
    setFormError(''); setSuccess(''); setIsSaving(true);
    const uploaded = [];
    try {
      validateSession(form);
      await uploadPhotos(storage, selectedFiles, `projects/${projectId}/sessions/${session.id}`, uploaded);
      const { data, error } = await supabase.from('Session').update({
        appointment_date: form.appointment_date, appointment_time: form.appointment_time,
        status_id: Number(form.status_id), duration: form.duration || null,
        amount_paid: form.amount_paid === '' ? null : Number(form.amount_paid),
        session_notes: form.session_notes || null, img_urls: [...form.img_urls, ...uploaded],
      }).eq('id', session.id).select('*, Status (id, status)').single();
      if (error) throw error;
      setForm((current) => ({ ...current, img_urls: data.img_urls ?? [] }));
      setIsEditing(false); setSelectedFiles([]); setSuccess('Session saved.'); onUpdated(data); notifyCalendarChanged();
    } catch (error) {
      let cleanupMessage = '';
      try { await removePhotos(storage, uploaded, storageUrl); }
      catch { cleanupMessage = ' Uploaded files could not be cleaned up; contact the studio administrator.'; }
      setFormError(messageFor(error, 'Could not save this session.') + cleanupMessage);
    } finally { setIsSaving(false); }
  }

  async function removePhoto(value) {
    if (!window.confirm('Remove this photo from the session?')) return;
    setFormError(''); setIsSaving(true);
    try {
      const next = form.img_urls.filter((item) => item !== value);
      const { data, error } = await supabase.from('Session').update({ img_urls: next }).eq('id', session.id).select('*, Status (id, status)').single();
      if (error) throw error;
      setForm((current) => ({ ...current, img_urls: next })); onUpdated(data);
      try { await removePhotos(storage, [value], storageUrl); }
      catch { setFormError('Photo removed from the session, but storage cleanup failed. Contact the studio administrator.'); }
    } catch (error) { setFormError(messageFor(error, 'Could not remove this photo.')); }
    finally { setIsSaving(false); }
  }

  async function deleteSession() {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    setIsSaving(true); setFormError('');
    try {
      const { error } = await supabase.from('Session').delete().eq('id', session.id);
      if (error) throw error;
      notifyCalendarChanged();
      try { await removePhotos(storage, session.img_urls ?? [], storageUrl); }
      catch { window.alert('Session deleted, but its private photo files need administrator cleanup.'); }
      onDeleted();
    } catch (error) { setFormError(messageFor(error, 'Could not delete this session.')); }
    finally { setIsSaving(false); }
  }
  return <div className="session-details-panel"><div className="details-section-heading"><span className="project-card-kicker">Selected Session</span><div className="button-group"><button className="button button-secondary" type="button" disabled={isSaving} onClick={() => { if (isEditing) { setForm({ appointment_date: session.appointment_date ?? '', appointment_time: session.appointment_time ?? '', status_id: String(session.status_id ?? ''), duration: session.duration ?? '', amount_paid: session.amount_paid ?? '', session_notes: session.session_notes ?? '', img_urls: session.img_urls ?? [] }); setSelectedFiles([]); } setIsEditing(!isEditing); }}><Pencil size={16} aria-hidden="true" />{isEditing ? 'Cancel' : 'Edit'}</button><button className="button button-ghost" type="button" onClick={deleteSession} disabled={isSaving}><Trash2 size={16} aria-hidden="true" />Delete</button></div></div>
    <SessionField editing={isEditing} label="Date"><input type="date" value={form.appointment_date} onChange={(event) => setField('appointment_date', event.target.value)} /></SessionField>
    <SessionField editing={isEditing} label="Time"><input type="time" value={form.appointment_time} onChange={(event) => setField('appointment_time', event.target.value)} /></SessionField>
    <SessionField editing={isEditing} label="Status" displayValue={overdue ? `Overdue · ${currentStatus}` : sessionStatusLabel(currentStatus)}><select value={form.status_id} onChange={(event) => setField('status_id', event.target.value)}>{legacyStatus && <option value={session.status_id}>{sessionStatusLabel(currentStatus)}</option>}{statuses.map((status) => <option key={status.id} value={status.id}>{status.status}</option>)}</select></SessionField>
    {(overdue || ['Expired', 'In Review'].includes(currentStatus)) && <p className="session-attention-note" role="status">Review this session. Mark it completed, cancel it, or choose a new date and mark it rescheduled.</p>}
    <SessionField editing={isEditing} label="Duration"><input type="time" value={form.duration} onChange={(event) => setField('duration', event.target.value)} /></SessionField>
    <SessionField editing={isEditing} label="Amount paid"><input type="number" min="0" step="0.01" value={form.amount_paid} onChange={(event) => setField('amount_paid', event.target.value)} /></SessionField>
    <SessionField editing={isEditing} label="Session notes"><textarea rows="3" value={form.session_notes} onChange={(event) => setField('session_notes', event.target.value)} /></SessionField>
    <div className="details-row"><span className="details-label">Photos</span><div className="session-photo-grid">{form.img_urls.map((url) => <span className="session-photo-wrap" key={url}><PrivatePhoto className="session-photo" path={url} alt="Session work" />{isEditing && <button className="photo-remove" type="button" disabled={isSaving} onClick={() => removePhoto(url)} aria-label="Remove photo">×</button>}</span>)}{isEditing && <div className="form-field"><label htmlFor={`session-photos-${session.id}`}>Add photos</label><input id={`session-photos-${session.id}`} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))} /></div>}</div></div>
    {isEditing && <div className="form-actions"><button className="button button-primary" type="button" onClick={save} disabled={isSaving}><Check size={16} aria-hidden="true" />{isSaving ? 'Saving…' : 'Save session'}</button></div>}
    {formError && <p className="form-error" role="alert">{formError}</p>}{success && <p className="form-success" role="status">{success}</p>}
  </div>;
}

function SessionField({ children, editing, label, displayValue }) { return <div className="details-row"><span className="details-label">{label}</span>{editing ? <div className="form-field form-field--full">{cloneElement(children, { 'aria-label': label })}</div> : <span className="details-content">{displayValue ?? (children.props.value === '' || children.props.value == null ? '—' : children.props.value)}</span>}</div>; }

function ProjectInfo({ project, onUpdated, onDeleted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    ...project,
    status_id: String(project.status_id ?? ''),
    deposit_received: Boolean(project.deposit_received),
  });

  useEffect(() => {
    supabase
      .from('Status')
      .select('id, status').in('status', PROJECT_STATUSES)
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          setFormError(messageFor(error, 'Could not load project statuses.'));
          return;
        }

        setStatuses(data ?? []);
      });
  }, []);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const display = (value) =>
    value === null || value === undefined || value === '' ? '—' : value;
  const fields = [
    ['Project Title', 'project_title'],
    ['Placement', 'placement'],
    ['Approximate Size', 'size'],
    ['Tattoo Style', 'style'],
    ['Reference Link', 'reference'],
    ['Design Notes', 'design_notes'],
    ['Cartridge Brand', 'cartridge_brand'],
    ['Needle Configuration', 'needle_config'],
    ['Project Start Date', 'date_start'],
    ['Target Completion Date', 'target_end_date'],
    ['Agreed Project Price', 'agreed_price'],
    ['Deposit Amount', 'deposit_amount'],
    ['Client Feedback', 'client_feedback'],
    ['Private Artist Notes', 'artist_notes'],
  ];
  async function save() { setFormError(''); setSuccess(''); try { validateProject(form); } catch (error) { setFormError(error.message); return; } setIsSaving(true); const payload = { project_title: form.project_title.trim(), status_id: Number(form.status_id), placement: form.placement || null, size: form.size || null, style: form.style || null, reference: form.reference || null, design_notes: form.design_notes || null, cartridge_brand: form.cartridge_brand || null, needle_config: form.needle_config || null, date_start: form.date_start || null, target_end_date: form.target_end_date || null, agreed_price: form.agreed_price === '' ? null : Number(form.agreed_price), deposit_amount: form.deposit_amount === '' ? null : Number(form.deposit_amount), deposit_received: Boolean(form.deposit_received), client_feedback: form.client_feedback || null, artist_notes: form.artist_notes || null }; const { data, error } = await supabase.from('Project').update(payload).eq('id', project.id).select('id, project_title, client_id, status_id, placement, size, style, reference, design_notes, cartridge_brand, needle_config, date_start, target_end_date, agreed_price, deposit_amount, deposit_received, client_feedback, artist_notes, Status (id, status), Client (first_name, last_name, phone, email, instagram)').single(); setIsSaving(false); if (error) { setFormError(messageFor(error, 'Could not save this project.')); return; } setIsEditing(false); setSuccess('Project saved.'); onUpdated(data); notifyCalendarChanged(); }
  async function deleteProject() {
    if (!window.confirm('Delete this project and all its sessions? This cannot be undone.')) return;
    setIsSaving(true); setFormError('');
    try {
      const { data: photos, error } = await supabase.rpc('studio_delete_project', { p_project_id: project.id });
      if (error) throw error;
      notifyCalendarChanged();
      try { await removePhotos(supabase.storage.from(PHOTO_BUCKET), photos ?? [], import.meta.env.VITE_SUPABASE_URL); }
      catch { window.alert('Project deleted, but its private photo files need administrator cleanup.'); }
      onDeleted();
    } catch (error) { setFormError(messageFor(error, 'Could not delete this project.')); }
    finally { setIsSaving(false); }
  }
  return <section className="details-section project-info-section"><div className="details-section-heading"><div><span className="project-card-kicker">Details</span><h3>Project Information</h3></div><div className="button-group"><button className="button button-secondary" type="button" disabled={isSaving} onClick={() => { if (isEditing) setForm({ ...project, status_id: String(project.status_id), deposit_received: Boolean(project.deposit_received) }); setIsEditing(!isEditing); }}><Pencil size={16} aria-hidden="true" />{isEditing ? 'Cancel' : 'Edit'}</button><button className="button button-ghost" type="button" onClick={deleteProject} disabled={isSaving}><Trash2 size={16} aria-hidden="true" />Delete</button></div></div>
    <div className="project-info-grid"><InfoRow label="Client" value={`${project.Client?.first_name ?? ''} ${project.Client?.last_name ?? ''}`} /><InfoRow label="Status" editing={isEditing}><select value={form.status_id} onChange={(event) => setField('status_id', event.target.value)}>{statuses.map((status) => <option key={status.id} value={status.id}>{projectStatusLabel(status.status)}</option>)}</select></InfoRow>{fields.map(([label, key]) => <ProjectField key={key} label={label} field={key} value={form[key]} editing={isEditing} onChange={setField} display={display} />)}<InfoRow label="Deposit Received" value={form.deposit_received ? 'Yes' : 'No'} editing={isEditing}><input type="checkbox" checked={form.deposit_received} onChange={(event) => setField('deposit_received', event.target.checked)} /></InfoRow></div>
    {isEditing && <div className="form-actions"><button className="button button-primary" type="button" onClick={save} disabled={isSaving}><Check size={16} aria-hidden="true" />{isSaving ? 'Saving…' : 'Save project'}</button></div>}{formError && <p className="form-error" role="alert">{formError}</p>}{success && <p className="form-success" role="status">{success}</p>}
  </section>;
}

function InfoRow({ label, value, editing, children }) { return <div className="details-row"><span className="details-label">{label}</span>{editing ? <div className="form-field form-field--full">{cloneElement(children, { 'aria-label': label })}</div> : <span className="details-content">{children?.type === 'select' ? children.props.children.find((option) => String(option.props.value) === children.props.value)?.props.children : value === '' || value == null ? '—' : value}</span>}</div>; }
function ProjectField({ label, field, value, editing, onChange, display }) { const textarea = ['design_notes', 'client_feedback', 'artist_notes'].includes(field); const type = field.includes('date') ? 'date' : ['agreed_price', 'deposit_amount'].includes(field) ? 'number' : field === 'reference' ? 'url' : 'text'; return <InfoRow label={label} value={display(value)} editing={editing}>{textarea ? <textarea rows="3" value={value ?? ''} onChange={(event) => onChange(field, event.target.value)} /> : <input type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={value ?? ''} onChange={(event) => onChange(field, event.target.value)} />}</InfoRow>; }

function ClientInfo({ client, clientId, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    first_name: client?.first_name ?? '',
    last_name: client?.last_name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    instagram: client?.instagram ?? '',
  });
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  async function save() { setFormError(''); setSuccess(''); setIsSaving(true); const { data, error } = await supabase.from('Client').update({ ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone: normalizePhone(form.phone) }).eq('id', clientId).select('first_name, last_name, phone, email, instagram').single(); setIsSaving(false); if (error) { setFormError(messageFor(error, 'Could not save this client.')); return; } setIsEditing(false); setSuccess('Client saved.'); onUpdated(data); }
  return <section className="details-section project-info-section"><div className="details-section-heading"><div><span className="project-card-kicker">Client</span><h3>Client Information</h3></div><button className="button button-secondary" type="button" disabled={isSaving} onClick={() => { if (isEditing) setForm({ first_name: client?.first_name ?? '', last_name: client?.last_name ?? '', phone: client?.phone ?? '', email: client?.email ?? '', instagram: client?.instagram ?? '' }); setIsEditing(!isEditing); }}><Pencil size={16} aria-hidden="true" />{isEditing ? 'Cancel' : 'Edit'}</button></div><div className="project-info-grid"><ClientField label="First name" field="first_name" value={form.first_name} editing={isEditing} onChange={setField} /><ClientField label="Last name" field="last_name" value={form.last_name} editing={isEditing} onChange={setField} /><ClientField label="Phone" field="phone" value={form.phone} editing={isEditing} onChange={setField} /><ClientField label="Email" field="email" value={form.email} editing={isEditing} onChange={setField} type="email" /><ClientField label="Instagram" field="instagram" value={form.instagram} editing={isEditing} onChange={setField} type="url" /></div>{isEditing && <div className="form-actions"><button className="button button-primary" type="button" onClick={save} disabled={isSaving}><Check size={16} aria-hidden="true" />{isSaving ? 'Saving…' : 'Save client'}</button></div>}{formError && <p className="form-error" role="alert">{formError}</p>}{success && <p className="form-success" role="status">{success}</p>}</section>;
}

function ClientField({ label, field, value, editing, onChange, type = 'text' }) { return <InfoRow label={label} value={value || '—'} editing={editing}><input type={type} value={value} onChange={(event) => onChange(field, event.target.value)} /></InfoRow>; }
function EmptyState({ text }) { return <p className="empty-state">{text}</p>; }
