import { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";
import AddNewSession from "../../components/modals/AddNewSession";

export default function ProjectsGrid() {
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    // Fetch only the fields needed for the grid cards. The full project record
    // is loaded later, when the user opens a specific project.
    const fetchProjectSummaries = async () => {
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
      console.log(data);
      setProjects(data);
    };

    fetchProjectSummaries();
  }, []);

  if (!projects) {
    return (
      <section className="dashboard-section">
        <div className="dashboard-heading">
          <p className="dashboard-meta">Loading projects...</p>
          <div className="grid-actions">
            <button className="button button-secondary">Sort by</button>
            <button className="button button-secondary">Filter</button>
          </div>
        </div>
        <div className="cards-grid">
          <div className="project-card project-card-loading"></div>
          <div className="project-card project-card-loading"></div>
          <div className="project-card project-card-loading"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <div className="dashboard-heading">
        <p className="dashboard-meta">{projects.length} active records</p>
        <div className="grid-actions">
          <button className="button button-secondary">Sort by</button>
          <button className="button button-secondary">Filter</button>
        </div>
      </div>

      <div className="cards-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.client_id}
            clientName={`${project.Client.first_name} ${project.Client.last_name}`}
            status='PLACEHOLDER'
            nextSessionDate={project.date_end}
            clientId={project.client_id}
          />
        ))}
      </div>
    </section>
  );
}

function ProjectCard({ clientName, status, nextSessionDate, clientId }) {
  const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(false);

  // This button currently acts as a visual project card. The data-* attributes
  // keep useful debugging metadata in the DOM without relying on invalid custom
  // HTML attributes such as `next_session`.
  return (
    <>
      <button
        className="project-card"
        data-client-name={clientName}
        data-status={status}
        data-next-session={nextSessionDate}
        data-client-id={clientId}
        onClick={() => setIsProjectDetailsOpen(true)}
      >
        <span className="project-preview">
          <span className="project-card-kicker">Client</span>
          <strong>{clientName}</strong>
          <span className="status-pill">{status}</span>
          <span className="project-card-meta">Next Session</span>
          <span>{nextSessionDate}</span>
        </span>
      </button>
      {isProjectDetailsOpen ? <ProjectDetails clientId={clientId} onClose={() => setIsProjectDetailsOpen(false)} /> : null}
    </>
  );
}

function ProjectDetails({ onClose, clientId }) {
  const [projectDetails, setProjectDetails] = useState(null);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [isNewSessionFormOpen, setIsNewSessionFormOpen] = useState(false);

  useEffect(() => {
    // The modal receives clientId from the card, then asks Supabase for the
    // detailed project fields that would make the grid too heavy/noisy.
    const fetchProjectDetails = async () => {
      const { data, error } = await supabase
        .from('Project')
        .select(`
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
      console.log(data);
      setProjectDetails(data);
    };

    fetchProjectDetails();
  }, [clientId]);


  if (isNewSessionFormOpen) {
    return <AddNewSession />;
  }

  return (
    <div id="project-details-modal" className="modal">
      <div className="modal-content">
        <button className="close" type="button" onClick={onClose}>&times;</button>
        {projectDetails && projectDetails.map((detail, index) => (
          <div className="project-details" key={index}>
            <h2>{detail.project_title}</h2>
            <div>
              <div className="details-row">
                <span className="details-label">Sessions</span>
                <span><button className="button button-secondary" onClick={() => setIsNewSessionFormOpen(true)}>Add New Session</button></span>
              </div>
              <SessionGrid onClick={() => setIsSessionDetailsOpen(!isSessionDetailsOpen)} />
            </div>

            {/* Session details are placeholder content until sessions are stored
                and fetched from Supabase. */}
            {isSessionDetailsOpen &&
              <>
                <div className="details-row">
                  <span className="details-label">Session Description:</span>
                  <span>Text</span>
                </div>

                <div className="details-row">
                  <span className="details-label">Date:</span>
                  <span>Text</span>
                </div>

                <div className="details-row">
                  <span className="details-label">Duration:</span>
                  <span>Text</span>
                </div>

                <div className="details-row">
                  <span className="details-label">Amount Paid:</span>
                  <span>Text</span>
                </div>

                <div className="details-row">
                  <span className="details-label">Photos:</span>
                  <span>Photo</span>
                </div>

              </>
            }

            <div className="details-row">
              <span className="details-label">Client</span>
              <span>{detail.Client.first_name} {detail.Client.last_name}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Cartridge Brand</span>
              <span>{detail.cartridge_brand}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Configuration</span>
              <span>{detail.configuration}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Start Date</span>
              <span>{detail.date_start}</span>
            </div>
            <div className="details-row">
              <span className="details-label">End Date</span>
              <span>{detail.date_end}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Total Price</span>
              <span>{detail.total_price}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Deposit Paid</span>
              <span>{detail.deposit_paid ? "Yes" : "No"}</span>
            </div>
            <div className="details-row">
              <span className="details-label">Feedback</span>
              <span>{detail.feedback}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionGrid({ onClick }) {
  // These are temporary hard-coded sessions. A next step would be to fetch real
  // session rows and render them from an array, like the project cards above.
  return (
    <div className="cards-grid">
      <Session message="1" onClick={onClick} />
      <Session message="2" onClick={onClick} />
      <Session message="3" onClick={onClick} />
      <Session message="4" onClick={onClick} />
    </div>
  );
}

function Session({ message, onClick }) {
  return (
    <button className="project-card session-card" onClick={onClick}>
      <span className="project-preview">
        <strong>Session {message}</strong>
      </span>
    </button>
  );
}
