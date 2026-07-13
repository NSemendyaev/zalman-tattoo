import { useEffect, useState } from 'react';
import AddNewSession from '../../components/modals/AddNewSession';
import ScheduleSession from '../../components/modals/ScheduleSession';
import supabase from '../../lib/supabaseClient';

export default function ProjectsGrid() {
  const [projectSummaries, setProjectSummaries] = useState(null);

  useEffect(() => {
    async function fetchProjectSummaries() {
      const { data, error } = await supabase
        .from('Project')
        .select(`
          id,
          project_title,
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

  const isLoading = projectSummaries === null;

  return (
    <section className="dashboard-section">
      <DashboardHeader
        recordCount={projectSummaries?.length}
        isLoading={isLoading}
      />

      <div className="cards-grid">
        {isLoading
          ? Array.from({ length: 3 }, (_, index) => (
            <div className="project-card project-card-loading" key={index} />
          ))
          : projectSummaries.map((project) => (
            <ProjectCard
              key={project.id}
              clientName={`${project.Client.first_name} ${project.Client.last_name}`}
              nextSessionDate={project.target_end_date}
              projectId={project.id}
              projectTitle={project.project_title}
              status={project.Status.status}
            />
          ))}
      </div>
    </section>
  );
}

function DashboardHeader({ recordCount, isLoading }) {
  return (
    <div className="dashboard-heading">
      <p className="dashboard-meta">
        {isLoading ? 'Loading projects...' : `${recordCount} active records`}
      </p>
      <div className="grid-actions">
        <button className="button button-secondary">Sort by</button>
        <button className="button button-secondary">Filter</button>
      </div>
    </div>
  );
}

function ProjectCard({ clientName, nextSessionDate, projectId, projectTitle, status }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const statusClassName = {
    'In Progress': 'status-pill--in-progress',
    'In Review': 'status-pill--in-review',
    Completed: 'status-pill--completed',
  }[status] ?? 'status-pill--default';

  return (
    <>
      <button className="project-card" onClick={() => setIsDetailsOpen(true)}>
        <span className="project-preview">
          <span className="project-card-kicker">Client</span>
          <strong>{clientName}</strong>
          <span className="project-card-meta">{projectTitle}</span>
          <span className={`status-pill ${statusClassName}`}>{status}</span>
          <span className="project-card-meta">Next Session</span>
          <span>{nextSessionDate}</span>
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

function ProjectDetails({ onClose, projectId }) {
  const [projects, setProjects] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isNewSessionFormOpen, setIsNewSessionFormOpen] = useState(false);
  const [projectIdForNewSession, setProjectIdForNewSession] = useState(null);

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
    setProjectIdForNewSession(projectId);
    setIsNewSessionFormOpen(true);
  }

  if (isNewSessionFormOpen) {
    return (
      <ScheduleSession
        onClose={() => setIsNewSessionFormOpen(false)}
        projectId={projectIdForNewSession}
      />
    );
    /*
    return (
      <AddNewSession
        onClose={() => setIsNewSessionFormOpen(false)}
        projectId={projectIdForNewSession}
      />
    );
    */
  }

  return (
    <div id="project-details-modal" className="modal">
      <div className="modal-content project-details-modal-content">
        <button className="close" type="button" onClick={onClose}>&times;</button>
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
                    Schedule Session
                  </button>
                </div>
                <SessionGrid
                  onSelectSession={setSelectedSession}
                  projectId={project.id}
                />
                {selectedSession && <SessionDetails session={selectedSession} projectId={projectId} />}
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
    return <div className="cards-grid" />;
  }

  return (
    <div className="cards-grid">
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
  return (
    <button className="project-card session-card" onClick={onClick}>
      <span className="project-preview">
        <strong>{session.appointment_date}</strong>
        <strong>{session.appointment_time}</strong>
      </span>
    </button>
  );
}

function SessionDetails({ session, projectId }) {
  const [editSessionDetails, setSessionDetails] = useState(undefined);
  const [selectedFiles, setSelectedFiles] = useState(null);

  const [appointmentDate, setAppointmentDate] = useState(session.appointment_date);
  const [status, setStatus] = useState(session.status_id);
  const [duration, setDuration] = useState(session.duration);
  const [amountPaid, setAmountPaid] = useState(session.amount_paid);
  const [sessionNotes, setSessionNotes] = useState(session.session_notes);

  function handleFileSelection(event) {
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

    let photoNumber = 1;
    for (const file of selectedFiles) {
      const filePath = getPhotoPath(file, photoNumber++);
      const { error } = await supabase.storage
        .from('Session Photos')
        .upload(filePath, file);

      if (error) {
        console.log(error);
      }
    }
  }

  async function updateSession() {
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
      console.log(error);
    }
  }

  async function handleUpdateSession() {
    await uploadSessionPhotos();
    updateSession();
  }

  return (
    <div className="session-details-panel">
      <div className='details-section-heading'>
        <span className="project-card-kicker">Selected Session</span>
        <button className="button button-secondary" onClick={() => {
          if (!editSessionDetails) {
            setSessionDetails(true);
          } else setSessionDetails(false);
        }}>Edit</button>
      </div>
      <DetailRow label="Date" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <label htmlFor="appointment_date">Appointment Date</label>
          <input type="date" id="appointment_date" onChange={(e) => setAppointmentDate(e.target.value)} />
        </div>
      </> : session.appointment_date} />

      <DetailRow label="Status" value={editSessionDetails ? <>
        <div className="form-field">
          <label htmlFor="status">Project status</label>
          <select name="status" id="status" placeholder="Active" onChange={(e) => setStatus(e.target.value)} required>
            <option value=""></option>
            <option value="1">In Progress</option>
            <option value="2">Completed</option>
            <option value="3">In Review</option>
          </select>
        </div></> : session.status_id} />

      <DetailRow label="Duration" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <label htmlFor="session-duration">Duration</label>
          <input type="time" id="session-duration" onChange={(e) => setDuration(e.target.value)} />
        </div>
      </> : session.duration} />

      <DetailRow label="Amount Paid" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <label htmlFor="deposit-amount">Deposit amount</label>
          <input type="number" name="deposit-amount" id="deposit-amount" min="0" step="0.01" placeholder="50" onChange={(e) => setAmountPaid(e.target.value)} />
        </div>
      </> : session.amount_paid} />

      <DetailRow label="Session Notes" value={editSessionDetails ? <>
        <div className="form-field form-field--full">
          <textarea name="internal-notes" id="internal-notes" rows="4" onChange={(e) => setSessionNotes(e.target.value)}>{session.session_notes}</ textarea>
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
          <button className="button button-secondary" onClick={handleUpdateSession}>Confirm</button>
        </div>
      } />}

    </div>
  );
}

function ProjectInfo({ project }) {
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
      <span>{value}</span>
    </div>
  );
}
