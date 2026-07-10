import { useState } from 'react';
import supabase from '../../lib/supabaseClient.js';

export default function FileUploader({ projectId }) {
  const [selectedFiles, setSelectedFiles] = useState(null);

  function handleFileSelection(event) {
    setSelectedFiles(Array.from(event.target.files ?? []));
  }

  async function uploadPhotos() {
    if (!selectedFiles) {
      return;
    }

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
