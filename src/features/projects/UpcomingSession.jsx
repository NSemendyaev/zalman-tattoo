import { useEffect, useState } from "react"
import supabase from "../../lib/supabaseClient";
import { ProjectDetails } from "./ProjectsGrid";
import { ArrowUpRight, CalendarDays } from 'lucide-react';

export default function UpcomingSession({ revision, onProjectChanged }) {
    // The RPC returns the nearest upcoming session across every project.
    const [upcomingSession, setUpcomingSession] = useState(undefined);
    const [loadError, setLoadError] = useState('');
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        // Refresh the appointment summary after project or session changes.
        const fetchUpcomingSession = async () => {
            try {
                const { data, error } = await supabase
                    .rpc('studio_upcoming_session');

                if (error) {
                    setLoadError('Could not load the next appointment.');
                    setUpcomingSession([]);
                    return;
                }
                setLoadError('');
                setUpcomingSession(Array.isArray(data) ? data : data ? [data] : []);

            } catch {
                setLoadError('Could not load the next appointment.');
                setUpcomingSession([]);
            }
        };

        fetchUpcomingSession();
    }, [revision]);

    if (loadError) return <div className="upcoming-sesson"><p className="form-error" role="alert">{loadError}</p></div>;
    if (upcomingSession === undefined) return <div className="upcoming-sesson" role="status">Loading next appointment…</div>;

    // An empty array is truthy, so also confirm that the RPC returned a first row.
    if (upcomingSession?.length > 0) {
        return (
            <>
                <button className='upcoming-sesson' type="button" onClick={() => setIsDetailsOpen(true)}>
                    <span className="upcoming-icon"><CalendarDays size={24} aria-hidden="true" /></span>
                    <span className="upcoming-copy"><span className="eyebrow">Next appointment</span><strong>{upcomingSession[0].project_title}</strong><span>{upcomingSession[0].first_name} {upcomingSession[0].last_name}</span></span>
                    <span className="upcoming-date"><strong>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${upcomingSession[0].appointment_date}T12:00:00Z`))}</strong><span>{upcomingSession[0].appointment_time?.slice(0, 5)}</span></span>
                    <ArrowUpRight className="upcoming-arrow" size={22} aria-hidden="true" />
                </button>
                {isDetailsOpen && (
                    // Reuse the project modal so the summary card opens the same detail view.
                    <ProjectDetails
                        onProjectChanged={onProjectChanged}
                        projectId={upcomingSession[0].project_id}
                        onClose={() => setIsDetailsOpen(false)}
                    />
                )}
            </>
        );
    } else {
        return (
            <div className='upcoming-sesson upcoming-sesson--empty'>
                <span className="upcoming-icon"><CalendarDays size={24} aria-hidden="true" /></span>
                <span className="upcoming-copy"><span className="eyebrow">Next appointment</span><strong>Nothing on the calendar</strong><span>Scheduled sessions will appear here.</span></span>
            </div>
        );
    }
}
