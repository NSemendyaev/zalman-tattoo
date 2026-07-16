import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, CalendarPlus, Check, Pencil, SlidersHorizontal, X } from 'lucide-react';
import ScheduleSession from '../../components/modals/ScheduleSession';
import supabase from '../../lib/supabaseClient';
import UpcomingSession from './UpcomingSession';

export default function ProjectsGrid() {
  // `null` represents the loading state; an empty array would mean "loaded, but no projects".
  const [projectSummaries, setProjectSummaries] = useState(null);
  const [sortBy, setSortBy] = useState('');

  useEffect(() => {
    // This relationship select fetches each project together with its client and status labels.
    async function fetchProjectSummaries() {
      const { data, error } = await supabase
        .from('Project')
        .select(`
          id,
          project_title,
          date_start,
          target_end_date,
          client_id,
          Status (
            status
          ),
          Client (
            first_name,
            last_name
          ) 
        `);

      if (error) {
        console.log(error);
        return;
      }

      setProjectSummaries(data);
    }

    fetchProjectSummaries();
  }, []);

  // Sorting is derived data: preserve the fetched array and create a sorted copy for display.
  const sortedProjectSummaries = useMemo(() => {
    if (!projectSummaries) {
      return null;
    }

    // Array.sort mutates its array, so copy state before sorting it.
    const summaries = [...projectSummaries];

    if (sortBy === 'date-new-first') {
      return summaries.sort((a, b) => (b.date_start ?? '').localeCompare(a.date_start ?? ''));
    }

    if (sortBy === 'date-old-first') {
      return summaries.sort((a, b) => (a.date_start ?? '').localeCompare(b.date_start ?? ''));
    }

    // Lower rank values appear first. Selecting a different sort option selects a new ranking.
    const projectStatus = {
      'in-progress': { 'In Progress': 0, 'In Review': 1, 'Completed': 2 },
      'in-review': { 'In Review': 0, 'In Progress': 1, 'Completed': 2 },
      'completed': { 'Completed': 0, 'In Review': 1, 'In Progress': 2 },
    }[sortBy];

    if (projectStatus) {
      return summaries.sort(
        (a, b) => (projectStatus[a.Status.status] ?? Number.MAX_SAFE_INTEGER)
          - (projectStatus[b.Status.status] ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return summaries;
  }, [projectSummaries, sortBy]);

  const isLoading = sortedProjectSummaries === null;

  return (
    <section className="dashboard-section">
      <DashboardHeader
        recordCount={projectSummaries?.length}
        isLoading={isLoading}
        sortBy={setSortBy}
        sortByValue={sortBy}
      />

      <UpcomingSession />

      <div className="cards-grid">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
            <div className="project-card project-card-loading" key={index} />
          ))
          : sortedProjectSummaries.map((project) => (
            <ProjectCard
              key={project.id}
              clientName={`${project.Client.first_name} ${project.Client.last_name}`}
              projectId={project.id}
              projectTitle={project.project_title}
              status={project.Status.status}
            />
          ))}
      </div>
    </section>
  );
}

function DashboardHeader({ recordCount, isLoading, sortBy, sortByValue }) {
  return (
    <div className="dashboard-heading">
      <div className="dashboard-title-group">
        <p className="eyebrow">Studio workspace</p>
        <h1>Projects</h1>
        <p className="dashboard-meta">
          {isLoading ? 'Loading projects...' : `${recordCount} active records`}
        </p>
      </div>
      <div className="grid-actions">
        <label className="sort-control">
          <ArrowUpDown size={16} aria-hidden="true" />
          <span>Sort by</span>
          {/* The setter is passed from the parent; changing it recomputes the memoized display list. */}
          <select name="sort-options" id="sort-options" value={sortByValue} onChange={(e) => sortBy(e.target.value)}>
            <option value="">Default order</option>
            <option value="date-new-first">Project Date: New First</option>
            <option value="date-old-first">Project Date: Old First</option>
            <option value="in-progress">Status: In Progress</option>
            <option value="in-review">Status: In Review</option>
            <option value="completed">Status: Completed</option>
          </select>
        </label>
        <button className="button button-ghost">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filter
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ clientName, projectId, projectTitle, status }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const statusClassName = {
    'In Progress': 'status-pill--in-progress',
    'In Review': 'status-pill--in-review',
    'Completed': 'status-pill--completed',
  }[status] ?? 'status-pill--default';

  const [upcomingSession, setUpcomingSession] = useState('Not Scheduled');

  useEffect(() => {
    // Each card independently asks the database for this project's nearest future session.
    const fetchUpcomingSession = async () => {
      try {
        const { data, error } = await supabase
          .rpc('fetch_upcoming_session', { p_project_id: projectId, });

        if (data && data.length > 0) {
          console.log(data);
          setUpcomingSession(data);
        }
        else {
          console.log(error);
        }

      } catch (error) {
        console.log(error);
      }

    }

    fetchUpcomingSession();
  }, [projectId]);

  return (
    <>
      <button className="project-card" onClick={() => setIsDetailsOpen(true)}>
        <span className="project-preview">
          <span className="project-card-topline">
            <span className="project-card-kicker">Project</span>
            <span className={`status-pill ${statusClassName}`}>{status}</span>
          </span>
          <strong>{projectTitle}</strong>
          <span className="project-client">{clientName}</span>
          <span className="project-card-footer">
            <span className="project-card-meta">Upcoming Session</span>
            <span className="project-card-date">{upcomingSession}</span>
          </span>
        </span>
      </button>
      {isDetailsOpen && (
        <ProjectDetails
          projectId={projectId}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </>
  );
}

export function ProjectDetails({ onClose, projectId }) {
  const [projects, setProjects] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isNewSessionFormOpen, setIsNewSessionFormOpen] = useState(false);
  const [projectIdForNewSession, setProjectIdForNewSession] = useState(null);
  // Incrementing this key remounts SessionGrid after a session is created or edited.
  const [sessionsVersion, setSessionsVersion] = useState(0);

  useEffect(() => {
    async function fetchProjectDetails() {
      const { data, error } = await supabase
        .from('Project')
        .select(`
          id,
          project_title,
          placement,
          size,
          style,
          reference,
          design_notes,
          cartridge_brand,
          needle_config,
          date_start,
          target_end_date,
          agreed_price,
          deposit_amount,
          deposit_received,
          client_feedback,
          artist_notes,
          Status (
            status
          ),
          Client (
            first_name,
            last_name
          )
        `)
        .eq('id', projectId);

      if (error) {
        console.log(error);
        return;
      }

      setProjects(data);
    }

    fetchProjectDetails();
  }, [projectId]);

  function openNewSessionForm(projectId) {
    // Keep the ID here so ScheduleSession knows which project to attach the row to.
    setProjectIdForNewSession(projectId);
    setIsNewSessionFormOpen(true);
  }

  if (isNewSessionFormOpen) {
    return (
      <ScheduleSession
        onClose={() => setIsNewSessionFormOpen(false)}
        onScheduled={() => {
          setSessionsVersion((version) => version + 1);
          setIsNewSessionFormOpen(false);
        }}
        projectId={projectIdForNewSession}
      />
    );
  }

  return (
    <div id="project-details-modal" className="modal">
      <div className="modal-content project-details-modal-content">
        <button className="close" type="button" onClick={onClose} aria-label="Close" title="Close">
          <X size={18} aria-hidden="true" />
        </button>
        {projects?.map((project) => (
          <div className="project-details" key={project.id}>
            <div className="project-details-header">
              <span className="project-card-kicker">Project</span>
              <h2>{project.project_title}</h2>
            </div>

            <div className="project-detail-sections">
              <section className="details-section sessions-section">
                <div className="details-section-heading">
                  <div>
                    <span className="project-card-kicker">Sessions</span>
                    <h3>Session History</h3>
                  </div>
                  <button
                    className="button button-secondary"
                    onClick={() => openNewSessionForm(project.id)}
                  >
                    <CalendarPlus size={16} aria-hidden="true" />
                    Schedule Session
                  </button>
                </div>
                <SessionGrid
                  key={sessionsVersion}
                  onSelectSession={setSelectedSession}
                  projectId={project.id}
                />
                {selectedSession && (
                  <SessionDetails
                    key={selectedSession.id}
                    session={selectedSession}
                    projectId={projectId}
                    onUpdated={(updatedSession) => {
                      setSelectedSession(updatedSession);
                      setSessionsVersion((version) => version + 1);
                    }}
                  />
                )}
              </section>

              <ProjectInfo project={project} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionGrid({ onSelectSession, projectId }) {
  const [sessions, setSessions] = useState(null);

  useEffect(() => {
    // This query runs whenever a different project is opened.
    async function fetchSessions() {
      const { data, error } = await supabase
        .from('Session')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.log(error);
        return;
      }

      setSessions(data);
    }

    fetchSessions();
  }, [projectId]);

  if (!sessions) {
    return <div className="session-timeline" />;
  }

  return (
    <div className="session-timeline">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          onClick={() => onSelectSession(session)}
          session={session}
        />
      ))}
    </div>
  );
}

function SessionCard({ onClick, session }) {
  // Split the ISO date for the compact timeline badge without changing the stored value.
  const [year, month, day] = session.appointment_date?.split('-') ?? [];
  const monthLabel = month
    ? new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(`${year}-${month}-15T12:00:00`)).toUpperCase()
    : 'TBC';
  const hasUpcomingStatus = session.status_id === 4;

  return (
    <button className="session-timeline-card" onClick={onClick}>
      <span className="session-timeline-marker" aria-hidden="true" />
      <span className="session-date-badge">
        <strong>{day ?? '--'}</strong>
        <small>{monthLabel}</small>
      </span>
      <span className="session-summary">
        <span className="session-summary-topline">
          <strong>{session.appointment_time || 'Time not set'}</strong>
          <span>{session.duration || 'Duration not set'}</span>
          <span className={`session-status ${hasUpcomingStatus ? 'session-status--upcoming' : ''}`}>
            {hasUpcomingStatus ? 'Upcoming' : 'Recorded'}
          </span>
          {session.amount_paid && <span className="session-payment">£{session.amount_paid}</span>}
        </span>
        <span className="session-summary-notes">{session.session_notes || 'No session notes added yet.'}</span>
      </span>
    </button>
  );
}

function SessionDetails({ onUpdated, session, projectId }) {
  // Editing uses local copies so Cancel/Edit mode never mutates the selected session object directly.
  const [editSessionDetails, setSessionDetails] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [appointmentDate, setAppointmentDate] = useState(session.appointment_date);
  const [status, setStatus] = useState(session.status_id);
  const [duration, setDuration] = useState(session.duration);
  const [amountPaid, setAmountPaid] = useState(session.amount_paid);
  const [sessionNotes, setSessionNotes] = useState(session.session_notes);

  function handleFileSelection(event) {
    // Convert the browser FileList into an array so it can be uploaded with a for...of loop.
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  // This path is used both when uploading a file and when retrieving its URL.
  function getPhotoPath(file, photoNumber) {
    return `project_${projectId}/session_${session.id}/${file.name}${photoNumber}`;
  }

  async function uploadSessionPhotos() {
    if (!selectedFiles) {
      return;
    }

    // Upload sequentially so each generated storage path receives a stable photo number.
    let photoNumber = 1;
    for (const file of selectedFiles) {
      const filePath = getPhotoPath(file, photoNumber++);
      const { error } = await supabase.storage
        .from('Session Photos')
        .upload(filePath, file);

      if (error) {
        throw error;
      }
    }
  }

  async function updateSession() {
    // Public URLs are stored in the Session table only after their storage files exist.
    const imageUrls = [];
    let photoNumber = 1;

    for (const file of selectedFiles ?? []) {
      const { data } = supabase.storage
        .from('Session Photos')
        .getPublicUrl(getPhotoPath(file, photoNumber++));
      imageUrls.push(data.publicUrl);
    }

    const { data, error } = await supabase
      .from('Session')
      .update({
        appointment_date: appointmentDate ?? session.appointment_date,
        status_id: status,
        duration: duration ?? session.duration,
        amount_paid: amountPaid ?? session.amount_paid,
        session_notes: sessionNotes ?? session.session_notes,
        img_urls: [...(session.img_urls ?? []), ...imageUrls]
      })
      .eq('id', session.id)
      .select()

    if (error) {
      throw error;
    }

    return data[0];
  }

  async function handleUpdateSession() {
    setFormError('');
    setIsSaving(true);
    try {
      // Keep these awaits in order: upload files first, then save their URLs with the session.
      await uploadSessionPhotos();
      const updatedSession = await updateSession();
      onUpdated(updatedSession);
      setSessionDetails(false);
    } catch (error) {
      console.log(error);
      setFormError('Could not update this session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="session-details-panel">
      <div className='details-section-heading'>
        <span className="project-card-kicker">Selected Session</span>
        <button className="button button-secondary" onClick={() => {
          if (!editSessionDetails) {
            setSessionDetails(true);
          } else setSessionDetails(false);
        }}>
          <Pencil size={16} aria-hidden="true" />
          Edit
        </button>
      </div>
      <DetailRow label="Date" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <label htmlFor="appointment_date">Appointment Date</label>
          <input type="date" id="appointment_date" value={appointmentDate ?? ''} onChange={(e) => setAppointmentDate(e.target.value)} />
        </div>
      </> : session.appointment_date} />

      <DetailRow label="Status" value={editSessionDetails ? <>
        <div className="form-field">
          <label htmlFor="status">Project status</label>
          <select name="status" id="status" value={status ?? ''} onChange={(e) => setStatus(e.target.value)} required>
            <option value=""></option>
            <option value="1">In Progress</option>
            <option value="2">Completed</option>
            <option value="3">In Review</option>
          </select>
        </div></> : session.status_id} />

      <DetailRow label="Duration" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <label htmlFor="session-duration">Duration</label>
          <input type="time" id="session-duration" value={duration ?? ''} onChange={(e) => setDuration(e.target.value)} />
        </div>
      </> : session.duration} />

      <DetailRow label="Amount Paid" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <label htmlFor="session-amount-paid">Amount paid</label>
          <input type="number" name="amount-paid" id="session-amount-paid" min="0" step="0.01" value={amountPaid ?? ''} onChange={(e) => setAmountPaid(e.target.value)} />
        </div>
      </> : session.amount_paid} />

      <DetailRow label="Session Notes" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <textarea name="session-notes" id="session-notes" rows="4" value={sessionNotes ?? ''} onChange={(e) => setSessionNotes(e.target.value)} />
        </div>
      </> : session.session_notes} />

      <div className="details-row">
        <span className="details-label">Photos</span>
        <div className="session-photo-grid">
          {session.img_urls?.map((url) => (
            <img className="session-photo" key={url} src={url} alt="Session work" />
          ))}
          {editSessionDetails &&
            <>
              <div className="form-field">
                <label htmlFor="session-photos">Photos</label>
                <input type="file" id="session-photos" onChange={handleFileSelection} multiple />
              </div>
            </>}
        </div>
      </div>

      {editSessionDetails && <DetailRow value={
        <div className=''>
          <span className="project-card-kicker"></span>
          <button className="button button-secondary" onClick={handleUpdateSession} disabled={isSaving}>
            <Check size={16} aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      } />}
      {formError && <p className="form-error" role="alert">{formError}</p>}

    </div>
  );
}

function ProjectInfo({ project }) {
  // A data-driven list keeps the detail layout consistent for every project field.
  const details = [
    ['Client', `${project.Client.first_name} ${project.Client.last_name}`],
    ['Status', project.Status?.status],
    ['Placement', project.placement],
    ['Approximate Size', project.size],
    ['Tattoo Style', project.style],
    ['Reference Link', project.reference],
    ['Design Notes', project.design_notes],
    ['Cartridge Brand', project.cartridge_brand],
    ['Needle Configuration', project.needle_config],
    ['Project Start Date', project.date_start],
    ['Target Completion Date', project.target_end_date],
    ['Agreed Project Price', project.agreed_price],
    ['Deposit Amount', project.deposit_amount],
    ['Deposit Received', project.deposit_received ? 'Yes' : 'No'],
    ['Client Feedback', project.client_feedback],
    ['Private Artist Notes', project.artist_notes],
  ];

  return (
    <section className="details-section project-info-section">
      <div className="details-section-heading">
        <div>
          <span className="project-card-kicker">Details</span>
          <h3>Project Information</h3>
        </div>
      </div>
      <div className="project-info-grid">
        {details.map(([label, value]) => (
          <DetailRow key={label} label={label} value={value} />
        ))}
      </div>
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="details-row">
      <span className="details-label">{label}</span>
      <span className="details-content">{value}</span>
    </div>
  );
}
