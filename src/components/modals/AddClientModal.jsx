import { useState } from 'react';
import supabase from '../../lib/supabaseClient.js';

export function AddClientModal({ onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [origin, setOrigin] = useState('');
  const [isLondonBased, setIsLondonBased] = useState(false);

  async function insertNewClient() {
    console.log('Inserting...');

    const { data, error } = await supabase
      .from('Client')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          instagram: instagram,
          origin: origin,
          london_based: isLondonBased,
        },
      ])
      .select();

    if (error) {
      console.log(error);
      return;
    }

    console.log(data);
  }

  return (
    <div id="add-client-modal" className="modal">
      <div className="modal-content">
        <button className="close" type="button" onClick={onClose}>&times;</button>
        <div className="modal-heading">
          <p className="eyebrow">Client</p>
          <h2>Add new client</h2>
        </div>
        <form className="form-stack">
          <div className="form-field">
            <label htmlFor="client-first-name">First Name: </label>
            <input type="text" name="first-name" id="client-first-name" onChange={event => setFirstName(event.target.value)} placeholder="Alex" required />
          </div>
          <div className="form-field">
            <label htmlFor="client-last-name">Last Name: </label>
            <input type="text" name="last-name" id="client-last-name" onChange={event => setLastName(event.target.value)} placeholder="Zalman" required />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone: </label>
            <input type="text" name="phone" id="phone" onChange={event => setPhone(event.target.value)} placeholder="Phone number with country code" required />
          </div>
          <div className="form-field">
            <label htmlFor="instagram">Instagram: </label>
            <input type="url" name="instagram" id="instagram" onChange={event => setInstagram(event.target.value)} placeholder="https://www.instagram.com/zalman.tattoo/" required />
          </div>
          <div className="form-field">
            <label htmlFor="country">Country of Origin: </label>
            <input type="text" name="country" id="country" onChange={event => setOrigin(event.target.value)} placeholder="Latvia" />
          </div>
          <div className="form-field">
            <label htmlFor="from-london">Is London Based: </label>
            <input type="checkbox" name="from-london" id="from-london" onChange={event => setIsLondonBased(event.target.checked)} />
          </div>
          <div className="form-field">
            <button type="button" onClick={insertNewClient}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
