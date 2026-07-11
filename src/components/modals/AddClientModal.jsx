import { use, useState } from 'react';
import supabase from '../../lib/supabaseClient.js';
import UserProfile from '../../features/profiles/UserProfile.jsx';

export function AddClientModal({ onClose }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [origin, setOrigin] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [isLondonBased, setIsLondonBased] = useState(false);
  const [doesClientExist, setDoesClientExist] = useState(false);

  async function insertNewClient() {

    {
      const { data, error } = await supabase
        .from('Client')
        .select("*")
        .eq('phone', phone);

      if (data) {
        console.log(`Are you trying to add ${data[0].first_name} ${data[0].last_name}?`);
        setDoesClientExist(true);
        return;
      }

    }

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
          email: email,
          dob: dob
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
        {doesClientExist && <DoesClientAlreadyExist firstName={firstName} lastName={lastName} onClick={() => setDoesClientExist(false)} />}
        <button className="close" type="button" onClick={onClose}>&times;</button>
        <div className="modal-heading">
          <p className="eyebrow">Client</p>
          <h2>New Client Form</h2>
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
            <label htmlFor="dob">Date of Birth: </label>
            <input type="date" name="dob" id="dob" onChange={event => setDob(event.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone: </label>
            <input type="text" name="phone" id="phone" onChange={event => setPhone(event.target.value)} placeholder="Phone number with country code" required />
          </div>
          <div className="form-field">
            <label htmlFor="instagram">Instagram: </label>
            <input type="url" name="instagram" id="instagram" onChange={event => setInstagram(event.target.value)} placeholder="https://www.instagram.com/zalman.tattoo/" />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email: </label>
            <input type="text" name="email" id="email" onChange={event => setEmail(event.target.value)} placeholder="email@address.com" />
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

function DoesClientAlreadyExist({ onClose, firstName, lastName }) {
  const [openUserProfile, setOpenUserProfile] = useState(false);

  return (
    <div className="toast">
      {openUserProfile && console.log('Open User Profile')}
      <button className="toast-close" type="button" onClick={onClose}>&times;</button>
      <p className="toast-message" onClick={() => setOpenUserProfile(true)}>Is it {firstName} {lastName}?</p>
    </div >
  );
}
