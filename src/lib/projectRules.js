export const PROJECT_STATUSES = ['In Progress', 'In Review', 'Completed'];
export const SESSION_STATUSES = ['Upcoming', 'Completed', 'Cancelled', 'Rescheduled'];

export function projectStatusLabel(status) {
  return status === 'In Review' ? 'Client review' : status;
}

export function sessionStatusLabel(status) {
  return ['In Review', 'Recorded'].includes(status) ? `${status} (legacy)` : status;
}

function londonTimestamp(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

export function isSessionOverdue(session, now = new Date()) {
  const status = session.Status?.status ?? session.status;
  if (!['Upcoming', 'Rescheduled'].includes(status) || !session.appointment_date || !session.appointment_time) return false;
  return `${session.appointment_date}T${session.appointment_time}` < londonTimestamp(now);
}

export function sessionNeedsReview(session, now = new Date()) {
  return ['Expired', 'In Review'].includes(session.Status?.status) || isSessionOverdue(session, now);
}

export function normalizePhone(value) {
  return value.trim().replace(/[\s().-]/g, '');
}

export function validateProject(form) {
  if (!form.project_title?.trim()) throw new Error('Enter a project title.');
  if (!form.status_id) throw new Error('Choose a project status.');
  if (!form.date_start) throw new Error('Choose a project start date.');
  if (form.target_end_date && form.target_end_date < form.date_start) {
    throw new Error('The target completion date cannot be before the start date.');
  }
  for (const field of ['agreed_price', 'deposit_amount']) {
    if (form[field] !== '' && form[field] != null && (!Number.isFinite(Number(form[field])) || Number(form[field]) < 0)) {
      throw new Error('Prices and deposits must be zero or more.');
    }
  }
}

export function validateSession(form) {
  if (!form.appointment_date || !form.appointment_time) throw new Error('Choose a session date and time.');
  if (!form.status_id) throw new Error('Choose a session status.');
  if (form.amount_paid !== '' && form.amount_paid != null && (!Number.isFinite(Number(form.amount_paid)) || Number(form.amount_paid) < 0)) {
    throw new Error('The amount paid must be zero or more.');
  }
}
