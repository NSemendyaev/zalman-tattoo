import { useState } from "react";
import supabase from '../../lib/supabaseClient.js';

let photoId = 0;

export default function FileUploader({ projectId }) {
    const [uploadedFiles, setUploadedFiles] = useState(null);

    function handleFileChange(event) {

        const files = [];

        // The browser gives file inputs a FileList. This uploader currently
        // previews the first selected file only.
        if (event.target.files) {
            for (let file of event.target.files) {
                files.push(file);
            }
            setUploadedFiles(files);
        }
        console.log(files);
    }

    async function handlePhotoUpload(event) {

        let photoIdForThisSession = 1;

        if (uploadedFiles) {

            for (let file of uploadedFiles) {
                try {
                    const { data, error } = await supabase.storage
                        .from('Session Photos')
                        .upload(`project${projectId}/${file.name}${photoIdForThisSession++}`, file)
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }

    return (
        <div>
            <input type="file" onChange={handleFileChange} multiple />
            {uploadedFiles && <button type="button" onClick={handlePhotoUpload}>Upload</button>}
        </div>
    );
}
