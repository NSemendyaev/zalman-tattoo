import { useEffect, useState } from 'react';
import { CalendarDays, CalendarPlus, X } from 'lucide-react';
import supabase from '../../lib/supabaseClient';
import { isSessionOverdue } from '../../lib/projectRules.js';

export default function ScheduleSession({ onClose, onScheduled, projectId }) {
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [statusId, setStatusId] = useState('');

    useEffect(() => {
        async function fetchStatuses() {
            const { data, error } = await supabase.from('Status').select('id').eq('status', 'Upcoming').limit(1).single();
            if (error) {
                setFormError('Could not load session statuses. Please try again.');
                return;
            }
            setStatusId(String(data.id));
        }
        fetchStatuses();
    }, []);

    const handleSessionScheduling = async (event) => {
        // Forms submit by default; prevent that full-page navigation first.
        event.preventDefault();
        setFormError('');
        if (!statusId) { setFormError('Session status is still loading. Please try again.'); return; }
        if (isSessionOverdue({ status: 'Upcoming', appointment_date: appointmentDate, appointment_time: appointmentTime })) {
            setFormError('Choose a future date and time for a new appointment.');
            return;
        }
        setIsSaving(true);

        // The selected project's ID creates the relationship between Session and Project.
        const { error } = await supabase
            .from("Session")
            .insert([{
                project_id: projectId,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                status_id: Number(statusId)
            }]);

        if (error) {
            setFormError('Could not schedule this session. Please try again.');
            setIsSaving(false);
            return;
        }

        onScheduled();
    };

    return (
        <div id="new-session-modal" className="modal">
            <div className="modal-content schedule-session-modal-content">
                <button className="close" type="button" onClick={onClose} aria-label="Close" title="Close">
                    <X size={18} aria-hidden="true" />
                </button>
                <div className="modal-heading">
                    <div className="schedule-session-heading-icon" aria-hidden="true">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <p className="eyebrow">Project session</p>
                        <h2>Schedule session</h2>
                    </div>
                </div>
                <form className="form-stack schedule-session-form" onSubmit={handleSessionScheduling}>
                    <div className="schedule-session-fields">
                        <div className="form-field">
                            <label htmlFor="appointment_date">Date</label>
                            <input type="date" id="appointment_date" onChange={(event) => setAppointmentDate(event.target.value)} required />
                        </div>
                        <div className="form-field">
                            <label htmlFor="appointment_time">Start time</label>
                            <input type="time" id="appointment_time" onChange={(event) => setAppointmentTime(event.target.value)} required />
                        </div>
                    </div>

                    <p className="schedule-session-note">New appointments start as Upcoming. Edit the session later to mark it completed, cancelled, or rescheduled.</p>

                    <div className="form-actions schedule-session-actions">
                        <button className="button button-ghost" type="button" onClick={onClose}>Cancel</button>
                        <button className="button button-primary" type="submit" disabled={isSaving || !statusId}>
                            <CalendarPlus size={16} aria-hidden="true" />
                            {isSaving ? 'Scheduling...' : 'Schedule session'}
                        </button>
                    </div>
                    {formError && <p className="form-error" role="alert">{formError}</p>}
                </form>
            </div>
        </div>
    );

}
