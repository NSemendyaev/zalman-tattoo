import { useEffect, useState } from 'react';
import AddNewSession from '../../components/modals/AddNewSession';
import supabase from '../../lib/supabaseClient';

export default function ProjectsGrid() {
  const [projectSummaries, setProjectSummaries] = useState(null);

  useEffect(() => {
    async function fetchProjectSummaries() {
      const { data, error } = await supabase
        .from('Project')
        .select(`
          date_end,
          client_id,
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
              key={project.client_id}
              clientId={project.client_id}
              clientName={`${project.Client.first_name} ${project.Client.last_name}`}
              nextSessionDate={project.date_end}
              status="PLACEHOLDER"
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

function ProjectCard({ clientId, clientName, nextSessionDate, status }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
      <button className="project-card" onClick={() => setIsDetailsOpen(true)}>
        <span className="project-preview">
          <span className="project-card-kicker">Client</span>
          <strong>{clientName}</strong>
          <span className="status-pill">{status}</span>
          <span className="project-card-meta">Next Session</span>
          <span>{nextSessionDate}</span>
        </span>
      </button>
      {isDetailsOpen && (
        <ProjectDetails
          clientId={clientId}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </>
  );
}

function ProjectDetails({ clientId, onClose }) {
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
          cartridge_brand,
          configuration,
          date_start,
          date_end,
          total_price,
          deposit_paid,
          feedback,
          Client (
            first_name,
            last_name
          )
        `)
        .eq('client_id', clientId);

      if (error) {
        console.log(error);
        return;
      }

      setProjects(data);
    }

    fetchProjectDetails();
  }, [clientId]);

  function openNewSessionForm(projectId) {
    setProjectIdForNewSession(projectId);
    setIsNewSessionFormOpen(true);
  }

  if (isNewSessionFormOpen) {
    return (
      <AddNewSession
        onClose={() => setIsNewSessionFormOpen(false)}
        projectId={projectIdForNewSession}
      />
    );
  }

  return (
    <div id="project-details-modal" className="modal">
      <div className="modal-content">
        <button className="close" type="button" onClick={onClose}>&times;</button>
        {projects?.map((project) => (
          <div className="project-details" key={project.id}>
            <div className="project-details-header">
              <span className="project-card-kicker">Project</span>
              <h2>{project.project_title}</h2>
            </div>

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
                  Add New Session
                </button>
              </div>
              <SessionGrid
                onSelectSession={setSelectedSession}
                projectId={project.id}
              />
              {selectedSession && <SessionDetails session={selectedSession} />}
            </section>

            <ProjectInfo project={project} />
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
        <strong>Date: {session.date}</strong>
      </span>
    </button>
  );
}

function SessionDetails({ session }) {
  return (
    <div className="session-details-panel">
      <span className="project-card-kicker">Selected Session</span>
      <DetailRow label="Session Description" value={session.session_description} />
      <DetailRow label="Date" value={session.date} />
      <DetailRow label="Duration" value={session.duration} />
      <DetailRow label="Amount Paid" value={session.amount_paid} />
      <div className="details-row">
        <span className="details-label">Photos</span>
        <div className="session-photo-grid">
          {session.img_urls?.map((url) => (
            <img className="session-photo" key={url} src={url} alt="Session work" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectInfo({ project }) {
  const details = [
    ['Client', `${project.Client.first_name} ${project.Client.last_name}`],
    ['Cartridge Brand', project.cartridge_brand],
    ['Configuration', project.configuration],
    ['Start Date', project.date_start],
    ['End Date', project.date_end],
    ['Total Price', project.total_price],
    ['Deposit Paid', project.deposit_paid ? 'Yes' : 'No'],
    ['Feedback', project.feedback],
  ];

  return (
    <section className="details-section project-info-section">
      <div className="details-section-heading">
        <div>
          <span className="project-card-kicker">Details</span>
          <h3>Project Information</h3>
        </div>
      </div>
      {details.map(([label, value]) => (
        <DetailRow key={label} label={label} value={value} />
      ))}
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
