import { useState } from 'react';
import supabase from '../../lib/supabaseClient';

export default function AddNewSession({ onClose, projectId }) {
    // Legacy session form retained for reference; ProjectDetails currently uses ScheduleSession.
    const [sessionDescription, setSessionDescription] = useState('');
    const [sessionDate, setSessionDate] = useState('');
    const [duration, setDuration] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState(null);

    function handleFileSelection(event) {
        setSelectedFiles(Array.from(event.target.files ?? []));
    }

    // This path is used both when uploading a file and when retrieving its URL.
    function getPhotoPath(file, photoNumber) {
        return `project${projectId}/${file.name}${photoNumber}`;
    }

    async function uploadSessionPhotos() {
        // Storage uploads happen before the public URLs are stored in the Session row.
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

    async function insertSession() {
        const imageUrls = [];
        let photoNumber = 1;

        for (const file of selectedFiles ?? []) {
            const { data } = supabase.storage
                .from('Session Photos')
                .getPublicUrl(getPhotoPath(file, photoNumber++));
            imageUrls.push(data.publicUrl);
        }

        if (sessionDescription === '' || sessionDate === '' || duration === '' || amountPaid === 0) {
            return;
        }

        const { error } = await supabase
            .from('Session')
            .insert([
                {
                    project_id: projectId,
                    session_description: sessionDescription,
                    date: sessionDate,
                    duration,
                    amount_paid: amountPaid,
                    img_urls: imageUrls,
                },
            ])
            .select();

        if (error) {
            console.log(error);
        }
    }

    function handleAddSession() {
        uploadSessionPhotos();
        insertSession();
    }

    return (
        <div id="new-session-modal" className="modal">
            <div className="modal-content">
                <button className="close" type="button" onClick={onClose}>&times;</button>
                <div className="modal-heading">
                    <p className="eyebrow">Session</p>
                    <h2>Add session</h2>
                </div>
                <form className="form-stack">

                    <div className="form-field">
                        <label htmlFor="session-date">Appointment Date</label>
                        <input type="date" id="session-date" onChange={(event) => setSessionDate(event.target.value)} />
                    </div>

                    <div className="form-field">
                        <label htmlFor="session-description">Session Description</label>
                        <input type="text" id="session-description" onChange={(event) => setSessionDescription(event.target.value)} />
                    </div>

                    <div className="form-field">
                        <label htmlFor="session-duration">Duration</label>
                        <input type="time" id="session-duration" onChange={(event) => setDuration(event.target.value)} />
                    </div>

                    <div className="form-field">
                        <label htmlFor="session-price">Amount Paid</label>
                        <input type="number" id="session-price" onChange={(event) => setAmountPaid(event.target.value)} />
                    </div>

                    <div className="form-field">
                        <label htmlFor="session-photos">Photos</label>
                        <input type="file" id="session-photos" onChange={handleFileSelection} multiple />
                    </div>

                    <div className="form-field">
                        <button type="button" onClick={handleAddSession}>Add</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
