import { useState } from "react";
import supabase from '../../lib/supabaseClient.js';
import FileUploader from "../../features/uploader/FileUploader.jsx";

export function CreateProjectModal({ onClose }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [status, setStatus] = useState(0);
  const [cartridgeBrand, setCartridgeBrand] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [dateStart, setStartDate] = useState("");
  const [dateEnd, setEndDate] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [depositPaid, setDepositPaid] = useState(false);
  const [feedback, setFeedback] = useState(false);

  const [userAlert, setUserAlert] = useState(false);

  async function insertNewProject() {
    const { data: matchingClients, error: clientLookupError } = await supabase
      .from('Client')
      .select("id")
      .eq('first_name', firstName)
      .eq('last_name', lastName);

    if (clientLookupError) {
      console.log(clientLookupError);
      return;
    }

    if (matchingClients && matchingClients.length > 0) {
      const { data, error } = await supabase
        .from('Project')
        .insert([
          {
            client_id: matchingClients[0].id,
            project_title: projectTitle,
            status_id: parseInt(status),
            cartridge_brand: cartridgeBrand,
            configuration: configuration,
            date_start: dateStart,
            date_end: dateEnd,
            total_price: parseFloat(totalPrice),
            deposit_paid: depositPaid,
            feedback: feedback,
          },
        ])
        .select()

      if (error) {
        console.log(error);
        return;
      }

      console.log(data);
    } else {
      setUserAlert(true);
    }

  }

  return (
    <div id="create-project-modal" className="modal">
      {userAlert ? <ClientNotFoundToast firstName={firstName} lastName={lastName} onClose={() => setUserAlert(false)} /> : null}
      <div className="modal-content">
        <button className="close" type="button" onClick={onClose}>&times;</button>
        <div className="modal-heading">
          <p className="eyebrow">Project</p>
          <h2>Create project</h2>
        </div>
        <form className="form-stack">

          <div className="form-field">
            <label htmlFor="project-client-first-name">First Name: </label>
            <input type="text" name="first-name" id="project-client-first-name" placeholder="Alex" onChange={(e) => setFirstName(e.target.value)} required />
          </div>

          <div className="form-field">
            <label htmlFor="project-client-last-name">Last Name: </label>
            <input type="text" name="last-name" id="project-client-last-name" placeholder="Zalman" onChange={(e) => setLastName(e.target.value)} required />
          </div>

          <div className="form-field">
            <label htmlFor="project-title">Project Title: </label>
            <input type="text" name="project-title" id="project-title" placeholder="Duck in Targaryen's Armor" onChange={(e) => setProjectTitle(e.target.value)} required />
          </div>

          <div className="form-field">
            <label htmlFor="status">Status: </label>
            <select name="status" id="status" placeholder="Active" onChange={(e) => { setStatus(e.target.value) }} required>
              <option value=""></option>
              <option value="1">In Progress</option>
              <option value="2">Completed</option>
              <option value="3">In Review</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="cartridge-brand">Cartridge Brand: </label>
            <input type="text" name="cartridge-brand" id="cartridge-brand" placeholder="Kwadron" onChange={(e) => setCartridgeBrand(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="configuration">Configuration: </label>
            <input type="message" name="configuration" id="configuration" onChange={(e) => setConfiguration(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="date-start">Date Start: </label>
            <input type="date" name="date-start" id="date-start" onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="date-end">Date End: </label>
            <input type="date" name="date-end" id="date-end" onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="full-price">Full Price: </label>
            <input type="text" name="full-price" id="full-price" placeholder="350" onChange={(e) => setTotalPrice(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="deposit-paid">Deposit Paid: </label>
            <input type="checkbox" name="deposit-paid" id="deposit-paid" onChange={(event) => setDepositPaid(event.target.checked)} />
          </div>

          <div className="form-field">
            <label htmlFor="feedback">Feedback: </label>
            <input type="text" name="feedback" id="feedback" onChange={(e) => setFeedback(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="file-uploader">Photos: </label>
            <FileUploader />
          </div>

          <div className="form-field">
            <button type="button" onClick={insertNewProject}>Add</button>
          </div>

        </form>

      </div >
    </div >
  );
}

function ClientNotFoundToast({ onClose, firstName, lastName }) {
  return (
    <div className="toast">
      <button className="toast-close" type="button" onClick={onClose}>&times;</button>
      <p className="toast-message">{firstName} {lastName} doesn't exist!</p>
    </div >
  );
}
