import { useState } from "react";
import FileUploader from "../../features/uploader/FileUploader";
import supabase from "../../lib/supabaseClient";

export default function AddNewSession({ onClick, projectId }) {
    const [sessionDescription, setSessionDescription] = useState('');
    const [sessionDate, setSessionDate] = useState('');
    const [duration, setDuration] = useState('');
    const [amountPaid, setAmountPaid] = useState(0);
    const [photos, setPhotos] = useState(undefined);

    async function handleNewSessionInsert(event) {

        if (sessionDescription !== '' && sessionDate !== '' && duration !== '' && amountPaid !== 0) {
            try {
                const { data, error } = await supabase
                    .from('Session')
                    .insert([
                        {
                            project_id: projectId,
                            session_description: sessionDescription,
                            date: sessionDate,
                            duration: duration,
                            amount_paid: amountPaid
                        },
                    ])
                    .select();
            } catch (error) {
                console.log(error);
            }
        }

    }

    console.log(projectId);

    // This modal is the UI skeleton for adding session data. It collects the same
    // kind of fields shown in ProjectDetails, but it does not save to Supabase yet.
    return (
        <div id="new-session-modal" className="modal">
            <div className="modal-content">
                <button className="close" type="button" onClick={onClick}>&times;</button>
                <div className="modal-heading">
                    <p className="eyebrow">Session</p>
                    <h2>Add session</h2>
                </div>
                <form action="" method="get" className="form-example">

                    <div className="form-example">
                        <label htmlFor="session-description">Session Description: </label>
                        <input type="text" id="session-description" onChange={(event) => { setSessionDescription(event.target.value) }} />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-date">Date: </label>
                        <input type="date" id="session-date" onChange={(event) => { setSessionDate(event.target.value) }} />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-duration">Duration: </label>
                        <input type="time" id="session-duration" onChange={(event) => { setDuration(event.target.value) }} />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-price">Amount Paid: </label>
                        <input type="number" id="session-price" onChange={(event) => { setAmountPaid(event.target.value) }} />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-photos">Photos: </label>
                        <FileUploader projectId={projectId} />
                    </div>

                    <div className="form-example">
                        <button type="button" onClick={handleNewSessionInsert}>Add</button>
                    </div>

                </form>

            </div >
        </div >
    );
}
