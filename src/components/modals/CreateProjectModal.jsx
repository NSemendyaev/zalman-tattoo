import { useEffect, useEffectEvent, useState } from "react";
import supabase from '../../lib/supabaseClient.js';
import FileUploader from "../../features/uploader/FileUploader.jsx";
import { data } from "react-router";

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
  const [client, setClient] = useState(undefined);
  const [selectedClient, setSelectedClient] = useState(false);

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

  // Fetch Users while typing
  useEffect(() => {
    const fetchClient = async () => {
      const { data, error } = await supabase
        .from('Client')
        .select('*')
        .ilike('first_name', `%${firstName}%`)
        .ilike('last_name', `%${lastName}%`);

      if (data) {
        console.log(data);
        setClient(data[0]);
      }
    }

    fetchClient();
  }, [firstName, lastName]);

  return (
    <div id="create-project-modal" className="modal">
      {userAlert ? <ClientNotFoundToast firstName={firstName} lastName={lastName} onClose={() => setUserAlert(false)} /> : null}
      <div className="modal-content">
        <button className="close" type="button" onClick={onClose}>&times;</button>
        <div className="modal-heading">
          <p className="eyebrow">Project</p>
          <h2>New Project Form</h2>
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

          {client && (
            <section className={selectedClient ? 'client-details' : 'client-details-selected'} aria-label="Matched client details" onClick={() => {
              if (selectedClient) setSelectedClient(false);
              else setSelectedClient(true);
            }}>
              <div className="client-details-header">
                <span className="project-card-kicker">Client match</span>
                <strong>{client.first_name} {client.last_name}</strong>
              </div>
              <div className="client-contact-list">
                <span className="client-contact-label">Phone</span>
                <span> <a href={`https://wa.me/${client.phone}`} target="_blank">{client.phone || 'No phone number'}</a></span>
                <span className="client-contact-label">Instagram</span>
                <span><a href={client.instagram} target="_blank">{client.instagram || 'No Instagram account'}</a></span>
              </div>
            </section>
          )}

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
            <input type="date" name="date-start" id="date-start" onChange={(e) => setStartDate(e.target.value)} required />
          </div>

          <div className="form-field">
            <label htmlFor="date-end">Date End: </label>
            <input type="date" name="date-end" id="date-end" onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="form-field">
            <label htmlFor="full-price">Full Price: </label>
            <input type="text" name="full-price" id="full-price" placeholder="350" onChange={(e) => setTotalPrice(e.target.value)} required />
          </div>

          <div className="form-field">
            <label htmlFor="deposit-paid">Deposit Paid: </label>
            <input type="checkbox" name="deposit-paid" id="deposit-paid" onChange={(event) => setDepositPaid(event.target.checked)} required />
          </div>

          <div className="form-field">
            <label htmlFor="feedback">Feedback: </label>
            <input type="text" name="feedback" id="feedback" onChange={(e) => setFeedback(e.target.value)} />
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
