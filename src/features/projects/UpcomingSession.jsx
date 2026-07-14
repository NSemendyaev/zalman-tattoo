import { useEffect, useState } from "react"
import supabase from "../../lib/supabaseClient";
import { ProjectDetails } from "./ProjectsGrid";

export default function UpcomingSession() {
    const [upcomingSession, setUpcomingSession] = useState(undefined);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        const fetchUpcomingSession = async () => {
            try {
                const { data, error } = await supabase
                    .rpc('fetch_upcoming_session_overall');

                if (error) {
                    console.log(error);
                    return;
                } else {
                    console.log(data);
                    setUpcomingSession(data);
                }

            } catch (error) {
                console.log(error);
            }
        };

        fetchUpcomingSession();
    }, []);

    if (upcomingSession) {
        return (
            <>
                <button className='upcoming-sesson' onClick={() => setIsDetailsOpen(true)}>
                    <span className="project-preview">
                        <span className="project-card-topline">
                            <span className="project-card-kicker">Upcoming Session</span>
                        </span>
                        <span><strong>{upcomingSession[0].project_title}</strong></span><br />
                        <span className="project-client">{upcomingSession[0].first_name} {upcomingSession[0].last_name}</span><br />
                        <span className="project-card-footer">
                            <span className="project-card-date">{upcomingSession[0].appointment_date}</span><br />
                            <span className="project-card-date">{upcomingSession[0].appointment_time}</span>
                        </span>
                    </span>
                </button>
                {isDetailsOpen && (
                    <ProjectDetails
                        projectId={upcomingSession[0].project_id}
                        onClose={() => setIsDetailsOpen(false)}
                    />
                )}
            </>
        );
    } else {
        return (
            <div className='upcoming-sesson'>
                <h3>Upcoming Session</h3>
                <p>Not Scheduled</p>
            </div>
        );
    }
}