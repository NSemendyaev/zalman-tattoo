import { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import supabase from '../../lib/supabaseClient';

const upcomingStatus = 4;

export default function ScheduleSession({ onClose, onScheduled, projectId }) {
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const handleSessionScheduling = async (event) => {
        event.preventDefault();
        setFormError('');
        setIsSaving(true);

        const { error } = await supabase
            .from("Session")
            .insert([{
                project_id: projectId,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                status_id: upcomingStatus
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
            <div className="modal-content">
                <button className="close" type="button" onClick={onClose} aria-label="Close" title="Close">
                    <X size={18} aria-hidden="true" />
                </button>
                <div className="modal-heading">
                    <p className="eyebrow">Schedule Session</p>
                </div>
                <form className="form-stack" onSubmit={handleSessionScheduling}>
                    <div className="form-field">
                        <label htmlFor="appointment_date">Appointment Date</label>
                        <input type="date" id="appointment_date" onChange={(event) => setAppointmentDate(event.target.value)} required />
                    </div>

                    <div className="form-field">
                        <label htmlFor="appointment_time">Appointment Time</label>
                        <input type="time" id="appointment_time" onChange={(event) => setAppointmentTime(event.target.value)} required />
                    </div>

                    <div className="form-field">
                        <button className="button button-primary" type="submit" disabled={isSaving}>
                            <CalendarPlus size={16} aria-hidden="true" />
                            {isSaving ? 'Scheduling...' : 'Schedule'}
                        </button>
                    </div>
                    {formError && <p className="form-error" role="alert">{formError}</p>}
                </form>
            </div>
        </div>
    );

}
