import FileUploader from "../../features/uploader/FileUploader";

export default function AddNewSession() {
    // This modal is the UI skeleton for adding session data. It collects the same
    // kind of fields shown in ProjectDetails, but it does not save to Supabase yet.
    return (
        <div id="new-session-modal" className="modal">
            <div className="modal-content">
                <button className="close" type="button" onClick={null}>&times;</button>
                <div className="modal-heading">
                    <p className="eyebrow">Session</p>
                    <h2>Add session</h2>
                </div>
                <form action="" method="get" className="form-example">

                    <div className="form-example">
                        <label htmlFor="session-description">Session Description: </label>
                        <input type="text" id="session-description" />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-date">Date: </label>
                        <input type="date" id="session-date" />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-duration">Duration: </label>
                        <input type="number" id="session-duration" />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-price">Amount Paid: </label>
                        <input type="number" id="session-price" />
                    </div>

                    <div className="form-example">
                        <label htmlFor="session-photos">Photos: </label>
                        <FileUploader />
                    </div>

                    <div className="form-example">
                        <button type="button">Add</button>
                    </div>

                </form>

            </div >
        </div >
    );
}
