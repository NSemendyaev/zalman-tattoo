import { useState } from 'react';
import supabase from '../../lib/supabaseClient.js';

export function AddClientModal({ onClose }) {
  // Each form field gets its own piece of state. This makes the current input
  // values available to insertNewClient() when the user clicks Add.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [origin, setOrigin] = useState('');
  const [isLondonBased, setIsLondonBased] = useState(false);

  async function insertNewClient() {
    console.log('Inserting...');

    // Supabase table columns use snake_case, so this object maps the React
    // state names into the database column names expected by the `Client` table.
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
        <form action="" method="get" className="form-example">
          <div className="form-example">
            <label htmlFor="client-first-name">First Name: </label>
            <input type="text" name="first-name" id="client-first-name" onChange={event => setFirstName(event.target.value)} placeholder="Alex" required />
          </div>
          <div className="form-example">
            <label htmlFor="client-last-name">Last Name: </label>
            <input type="text" name="last-name" id="client-last-name" onChange={event => setLastName(event.target.value)} placeholder="Zalman" required />
          </div>
          <div className="form-example">
            <label htmlFor="phone">Phone: </label>
            <input type="text" name="phone" id="phone" onChange={event => setPhone(event.target.value)} placeholder="Phone number with country code" required />
          </div>
          <div className="form-example">
            <label htmlFor="instagram">Instagram: </label>
            <input type="url" name="instagram" id="instagram" onChange={event => setInstagram(event.target.value)} placeholder="https://www.instagram.com/zalman.tattoo/" required />
          </div>
          <div className="form-example">
            <label htmlFor="country">Country of Origin: </label>
            <input type="text" name="country" id="country" onChange={event => setOrigin(event.target.value)} placeholder="Latvia" />
          </div>
          <div className="form-example">
            <label htmlFor="from-london">Is London Based: </label>
            <input type="checkbox" name="from-london" id="from-london" onChange={event => {
              if (event.target.value) {
                setIsLondonBased(true);
              }
            }} />
          </div>
          <div className="form-example">
            <button type="button" onClick={insertNewClient}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
