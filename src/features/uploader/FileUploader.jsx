import { useState } from "react";
import supabase from '../../lib/supabaseClient.js';

let photoId = 0;

export default function FileUploader() {
    const [file, setFile] = useState(null);

    function handleFileChange(event) {
        // The browser gives file inputs a FileList. This uploader currently
        // previews the first selected file only.
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    }

    async function handlePhotoUpload(event) {

        try {
            const sessionPhoto = event.target.files[0]
            const { data, error } = await supabase.storage
                .from('Session Photos')
                .upload('', sessionPhoto)
        } catch (error) {
            console.log(error);
        }

    }

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            {file && (
                <div>
                    <p>File Name: {file.name}</p>
                    <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
                    <p>Type: {file.type}</p>
                </div>
            )}
            {file && <button>Upload</button>}
        </div>
    );
}
