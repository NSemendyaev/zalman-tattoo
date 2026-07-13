import { useState } from 'react';
import supabase from '../../lib/supabaseClient';

const upcomingStatus = 4;

export default function ScheduleSession({ onClose, projectId }) {
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");

    const handleSessionScheduling = async () => {
        try {
            const { data, error } = await supabase
                .from("Session")
                .insert([{
                    project_id: projectId,
                    appointment_date: appointmentDate,
                    appointment_time: appointmentTime,
                    status_id: upcomingStatus
                }])
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div id="new-session-modal" className="modal">
            <div className="modal-content">
                <button className="close" type="button" onClick={onClose}>&times;</button>
                <div className="modal-heading">
                    <p className="eyebrow">Schedule Session</p>
                </div>
                <form className="form-stack">
                    <div className="form-field">
                        <label htmlFor="appointment_date">Appointment Date</label>
                        <input type="date" id="appointment_date" onChange={(event) => setAppointmentDate(event.target.value)} />
                    </div>

                    <div className="form-field">
                        <label htmlFor="appointment_time">Appointment Time</label>
                        <input type="time" id="appointment_time" onChange={(event) => setAppointmentTime(event.target.value)} />
                    </div>

                    <div className="form-field">
                        <button type="button" onClick={handleSessionScheduling}>Schedule</button>
                    </div>
                </form>
            </div>
        </div>
    );

}
