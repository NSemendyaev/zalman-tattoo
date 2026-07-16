import { useState } from 'react';
import supabase from '../../lib/supabaseClient.js';

export default function FileUploader({ projectId }) {
  // File inputs expose a FileList, so convert it to a normal array for iteration.
  const [selectedFiles, setSelectedFiles] = useState(null);

  function handleFileSelection(event) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  async function uploadPhotos() {
    if (!selectedFiles) {
      return;
    }

    // A deterministic path keeps each file organized by its owning project.
    let photoNumber = 1;
    for (const file of selectedFiles) {
      const filePath = `project${projectId}/${file.name}${photoNumber++}`;
      const { error } = await supabase.storage
        .from('Session Photos')
        .upload(filePath, file);

      if (error) {
        console.log(error);
      }
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileSelection} multiple />
      {selectedFiles && <button type="button" onClick={uploadPhotos}>Upload</button>}
    </div>
  );
}
