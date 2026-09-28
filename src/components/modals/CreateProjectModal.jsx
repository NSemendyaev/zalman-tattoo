import { useEffect, useState } from "react";
import { Plus, X } from 'lucide-react';
import supabase from '../../lib/supabaseClient.js';
import { PROJECT_STATUSES, validateProject, projectStatusLabel } from '../../lib/projectRules.js';

export function CreateProjectModal({ onClose, onCreated }) {
  // Form state mirrors the Project columns sent in insertNewProject below.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [status, setStatus] = useState('');
  const [statuses, setStatuses] = useState([]);
  const [placement, setPlacement] = useState("");
  const [size, setSize] = useState("");
  const [style, setStyle] = useState("");
  const [reference, setReference] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const [cartridgeBrand, setCartridgeBrand] = useState("");
  const [needleConfiguration, setNeedleConfig] = useState("");
  const [dateStart, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [agreedPrice, setAgreedPrice] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositReceived, setDepositReceived] = useState(false);
  const [clientFeedback, setClientFeedback] = useState('');
  const [artistNotes, setArtistNotes] = useState("");

  const [userAlert, setUserAlert] = useState(false);
  const [client, setClient] = useState(undefined);
  const [selectedClient, setSelectedClient] = useState(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function insertNewProject(event) {
    event.preventDefault();
    setFormError('');
    if (!selectedClient) {
      setFormError('Select a client before creating this project.');
      return;
    }

    if (!status) {
      setFormError('Choose a project status before creating this project.');
      return;
    }

    try {
      validateProject({ project_title: projectTitle.trim(), status_id: status, date_start: dateStart, target_end_date: targetEndDate || null, agreed_price: agreedPrice, deposit_amount: depositAmount });
    } catch (error) {
      setFormError(error.message);
      return;
    }
    setIsSaving(true);

    // Build the database payload explicitly so UI state names can differ from column names.
    const { error } = await supabase
      .from('Project')
      .insert([
        {
          client_id: selectedClient.id,
          project_title: projectTitle.trim(),
          status_id: Number(status),
          placement: placement,
          size: size,
          style: style,
          reference: reference,
          design_notes: designNotes,
          cartridge_brand: cartridgeBrand,
          needle_config: needleConfiguration,
          date_start: dateStart,
          target_end_date: targetEndDate || null,
          agreed_price: Number(agreedPrice),
          deposit_amount: Number(depositAmount),
          deposit_received: depositReceived,
          client_feedback: clientFeedback,
          artist_notes: artistNotes,
        },
      ])
      .select();

    if (error) {
      setFormError('Could not create the project. Please try again.');
      setIsSaving(false);
      return;
    }

    // Let the parent refresh its project list, then close this modal there.
    onCreated();
  }

  // Search for matching clients whenever either name input changes.
  useEffect(() => {
    let active = true;
    const fetchClient = async () => {
      // Avoid an unfiltered query when the search fields are empty.
      if (!firstName && !lastName) {
        setClient([]);
        return;
      }
      const { data, error } = await supabase
        .from('Client')
        .select('*')
        .ilike('first_name', `%${firstName}%`)
        .ilike('last_name', `%${lastName}%`);

      if (!active) return;
      if (error) {
        setFormError('Could not search clients. Please try again.');
        return;
      }

      setClient(data);
    }

    const timer = window.setTimeout(fetchClient, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [firstName, lastName]);

  useEffect(() => {
    async function fetchStatuses() {
      const { data, error } = await supabase.from('Status').select('id, status').in('status', PROJECT_STATUSES).order('id');
      if (error) {
        setFormError('Could not load project statuses. Please try again.');
        return;
      }
      setStatuses(data ?? []);
      const inProgress = data?.find((item) => item.status === 'In Progress');
      setStatus(String(inProgress?.id ?? data?.[0]?.id ?? ''));
    }
    fetchStatuses();
  }, []);

  return (
    <div id="create-project-modal" className="modal">
      {userAlert ? <ClientNotFoundToast firstName={firstName} lastName={lastName} onClose={() => setUserAlert(false)} /> : null}
      <div className="modal-content project-modal-content">
        <button className="close" type="button" onClick={onClose} aria-label="Close" title="Close">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="modal-heading">
          <p className="eyebrow">Project</p>
          <h2>Create project</h2>
        </div>
        <form className="form-stack project-form" onSubmit={insertNewProject}>
          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Client</p>
              <h3>Find and select a client</h3>
            </div>
            <div className="project-form-grid client-search-grid">
              <div className="form-field">
                <label htmlFor="project-client-first-name">Client first name</label>
                <input type="text" name="first-name" id="project-client-first-name" placeholder="Alex" onChange={(e) => { setFirstName(e.target.value); setSelectedClient(undefined); }} />
              </div>

              <div className="form-field">
                <label htmlFor="project-client-last-name">Client last name</label>
                <input type="text" name="last-name" id="project-client-last-name" placeholder="Zalman" onChange={(e) => { setLastName(e.target.value); setSelectedClient(undefined); }} />
              </div>
            </div>

            <div className="client-match-list">
              {/* Clicking a match stores the whole client record for client_id on submit. */}
              {client && client.map((cl, index) => {
                return (
                  <section
                    key={cl.id ?? index}
                    className={`client-details ${selectedClient?.id === cl.id ? 'client-details--selected' : ''}`}
                    aria-label="Matched client details"
                    role="button" tabIndex={0}
                    onKeyDown={(event) => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelectedClient(cl); } }}
                    onClick={() => setSelectedClient(selectedClient?.id === cl.id ? undefined : cl)}
                  >
                    <div className="client-details-header">
                      <span className="project-card-kicker">Client match</span>
                      <strong>{cl.first_name} {cl.last_name}</strong>
                    </div>
                    <div className="client-contact-list">
                      <span className="client-contact-label">Phone</span>
                      <span> <a href={`https://wa.me/${cl.phone}`} target="_blank">{cl.phone || 'No phone number'}</a></span>
                      <span className="client-contact-label">Instagram</span>
                      <span>{cl.instagram ? <a href={cl.instagram} target="_blank" rel="noreferrer">{cl.instagram}</a> : 'No Instagram account'}</span>
                    </div>
                  </section>
                )
              })}
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Artwork</p>
              <h3>Project and design</h3>
            </div>
            <div className="project-form-grid">
              <div className="form-field">
                <label htmlFor="new-project-status">Status</label>
                <select id="new-project-status" value={status} onChange={(event) => setStatus(event.target.value)} required>
                  {statuses.map((item) => <option key={item.id} value={item.id}>{projectStatusLabel(item.status)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="project-title">Project title</label>
                <input type="text" name="project-title" id="project-title" placeholder="Duck in Targaryen's Armor" onChange={(e) => setProjectTitle(e.target.value)} required />
              </div>

              <div className="form-field">
                <label htmlFor="project-placement">Placement</label>
                <input type="text" name="placement" id="project-placement" placeholder="Outer forearm" onChange={(e) => setPlacement(e.target.value)} />
              </div>

              <div className="form-field">
                <label htmlFor="project-size">Approximate size</label>
                <input type="text" name="size" id="project-size" placeholder="12 x 8 cm" onChange={(e) => setSize(e.target.value)} />
              </div>

              <div className="form-field">
                <label htmlFor="project-style">Tattoo style</label>
                <select name="style" id="project-style" defaultValue="" onChange={(e) => setStyle(e.target.value)}>
                  <option value="" disabled>Select a style</option>
                  <option>Fine line</option>
                  <option>Blackwork</option>
                  <option>Realism</option>
                  <option>Traditional</option>
                  <option>Japanese</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="project-reference">Reference link</label>
                <input type="url" name="reference" id="project-reference" placeholder="https://..." onChange={(e) => setReference(e.target.value)} />
              </div>

              <div className="form-field form-field--full">
                <label htmlFor="project-brief">Tattoo brief and design notes</label>
                <textarea name="brief" id="project-brief" rows="4" placeholder="Agreed idea, motifs, direction, and any changes discussed with the client." onChange={(e) => setDesignNotes(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Technical setup</p>
              <h3>Equipment</h3>
            </div>
            <div className="project-form-grid">
              <div className="form-field">
                <label htmlFor="cartridge-brand">Cartridge brand</label>
                <input type="text" name="cartridge-brand" id="cartridge-brand" placeholder="Kwadron" onChange={(e) => setCartridgeBrand(e.target.value)} />
              </div>

              <div className="form-field">
                <label htmlFor="needle-config">Needle configuration</label>
                <input type="text" name="needle-config" id="needle-config" placeholder="3RL, 7RS" onChange={(e) => setNeedleConfig(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Schedule and payment</p>
              <h3>Timing and pricing</h3>
            </div>
            <div className="project-form-grid">
              <div className="form-field">
                <label htmlFor="date-start">Project start date</label>
                <input type="date" name="date-start" id="date-start" onChange={(e) => setStartDate(e.target.value)} required />
              </div>

              <div className="form-field">
                <label htmlFor="date-end">Target completion date</label>
                <input type="date" name="date-end" id="date-end" onChange={(e) => setTargetEndDate(e.target.value)} />
              </div>

              <div className="form-field">
                <label htmlFor="full-price">Agreed project price</label>
                <input type="number" name="full-price" id="full-price" min="0" step="0.01" placeholder="350" onChange={(e) => setAgreedPrice(e.target.value)} required />
              </div>

              <div className="form-field">
                <label htmlFor="deposit-amount">Deposit amount</label>
                <input type="number" name="deposit-amount" id="deposit-amount" min="0" step="0.01" placeholder="50" onChange={(e) => setDepositAmount(e.target.value)} />
              </div>

              <div className="form-field form-field--checkbox">
                <label htmlFor="deposit-paid">Deposit received</label>
                <input type="checkbox" name="deposit-paid" id="deposit-paid" onChange={(event) => setDepositReceived(event.target.checked)} />
              </div>

              <div className="form-field">
                <label htmlFor="client-feedback">Client feedback</label>
                <input type="text" name="client-feedback" id="client-feedback" onChange={(e) => setClientFeedback(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Notes</p>
              <h3>Private artist notes</h3>
            </div>
            <div className="form-field form-field--full">
              <label htmlFor="internal-notes">Notes</label>
              <textarea name="internal-notes" id="internal-notes" rows="4" placeholder="Sizing decisions, healing notes, supply reminders, or anything not shared with the client." onChange={(e) => setArtistNotes(e.target.value)} />
            </div>
          </section>

          <div className="form-actions">
            <button className="button button-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={isSaving}>
              <Plus size={16} aria-hidden="true" />
              {isSaving ? 'Creating...' : 'Create project'}
            </button>
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}

        </form>

      </div >
    </div >
  );
}

function ClientNotFoundToast({ onClose, firstName, lastName }) {
  return (
    <div className="toast">
      <button className="toast-close" type="button" onClick={onClose} aria-label="Dismiss message" title="Dismiss message">
        <X size={16} aria-hidden="true" />
      </button>
      <p className="toast-message">{firstName} {lastName} doesn't exist!</p>
    </div >
  );
}
