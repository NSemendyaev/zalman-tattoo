import { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import supabase from '../../lib/supabaseClient.js';

export function AddClientModal({ onClose }) {
  // These local values make the form controlled: each input updates React state.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [origin, setOrigin] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [isLondonBased, setIsLondonBased] = useState(false);
  const [doesClientExist, setDoesClientExist] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function insertNewClient(event) {
    event.preventDefault();
    setFormError('');
    setDoesClientExist(false);
    setIsSaving(true);

    // Check the phone number first so the UI can prevent an accidental duplicate.
    const { data: existingClients, error: lookupError } = await supabase
      .from('Client')
      .select('id, first_name, last_name')
      .eq('phone', phone);

    if (lookupError) {
      setFormError('Could not check existing clients. Please try again.');
      setIsSaving(false);
      return;
    }

    if (existingClients.length > 0) {
      setDoesClientExist(true);
      setIsSaving(false);
      return;
    }

    // Only insert after the duplicate check has succeeded.
    const { error } = await supabase
      .from('Client')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          instagram: instagram,
          origin: origin,
          london_based: isLondonBased,
          email: email,
          dob: dob
        },
      ])
      .select();

    if (error) {
      setFormError('Could not create the client. Please try again.');
      setIsSaving(false);
      return;
    }

    onClose();
  }

  return (
    <div id="add-client-modal" className="modal">
      <div className="modal-content client-modal-content">
        {doesClientExist && <DoesClientAlreadyExist firstName={firstName} lastName={lastName} onClose={() => setDoesClientExist(false)} />}
        <button className="close" type="button" onClick={onClose} aria-label="Close" title="Close">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="modal-heading">
          <p className="eyebrow">Client</p>
          <h2>Add client</h2>
        </div>
        <form className="form-stack client-form" onSubmit={insertNewClient}>
          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Contact</p>
              <h3>Client details</h3>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="client-first-name">First name</label>
                <input type="text" name="first-name" id="client-first-name" onChange={event => setFirstName(event.target.value)} placeholder="Alex" required />
              </div>
              <div className="form-field">
                <label htmlFor="client-last-name">Last name</label>
                <input type="text" name="last-name" id="client-last-name" onChange={event => setLastName(event.target.value)} placeholder="Zalman" required />
              </div>
              <div className="form-field">
                <label htmlFor="phone">Phone</label>
                <input type="text" name="phone" id="phone" onChange={event => setPhone(event.target.value)} placeholder="Phone number with country code" required />
              </div>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input type="email" name="email" id="email" onChange={event => setEmail(event.target.value)} placeholder="email@address.com" />
              </div>
              <div className="form-field form-field--full">
                <label htmlFor="instagram">Instagram</label>
                <input type="url" name="instagram" id="instagram" onChange={event => setInstagram(event.target.value)} placeholder="https://www.instagram.com/zalman.tattoo/" />
              </div>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <p className="eyebrow">Profile</p>
              <h3>Background</h3>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="dob">Date of birth</label>
                <input type="date" name="dob" id="dob" onChange={event => setDob(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="country">Country of origin</label>
                <input type="text" name="country" id="country" onChange={event => setOrigin(event.target.value)} placeholder="Latvia" />
              </div>
              <div className="form-field form-field--checkbox form-field--full">
                <label htmlFor="from-london">London based</label>
                <input type="checkbox" name="from-london" id="from-london" onChange={event => setIsLondonBased(event.target.checked)} />
              </div>
            </div>
          </section>

          <div className="form-actions">
            <button className="button button-ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={isSaving}>
              <UserPlus size={16} aria-hidden="true" />
              {isSaving ? 'Creating...' : 'Create client'}
            </button>
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </form>
      </div>
    </div>
  );
}

function DoesClientAlreadyExist({ onClose, firstName, lastName }) {
  return (
    <div className="toast">
      <button className="toast-close" type="button" onClick={onClose} aria-label="Dismiss message" title="Dismiss message">
        <X size={16} aria-hidden="true" />
      </button>
      <p className="toast-message">A client named {firstName} {lastName} already has this phone number.</p>
    </div >
  );
}
