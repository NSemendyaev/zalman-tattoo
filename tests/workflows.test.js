import test from 'node:test';
import assert from 'node:assert/strict';
import { photoPath, uploadPhotos, removePhotos, validatePhotos, MAX_PHOTO_BYTES } from '../src/lib/photos.js';
import { validateProject, validateSession, normalizePhone, isSessionOverdue, sessionNeedsReview, projectStatusLabel, sessionStatusLabel, SESSION_STATUSES } from '../src/lib/projectRules.js';

const url = 'https://example.supabase.co';
test('legacy public photo URLs become paths; external and traversal paths are refused', () => {
  assert.equal(photoPath(`${url}/storage/v1/object/public/Session%20Photos/projects/a.jpg`, url), 'projects/a.jpg');
  assert.equal(photoPath('projects/a.jpg', url), 'projects/a.jpg');
  assert.throws(() => photoPath('https://another.example/photo.jpg', url));
  assert.throws(() => photoPath('../photo.jpg', url));
});
test('partial upload failure retains exactly the paths that need rollback', async () => {
  const uploaded = []; let calls = 0; let removed;
  const storage = {
    upload: async () => ({ error: ++calls === 2 ? new Error('Upload failed') : null }),
    remove: async (paths) => { removed = paths; return { error: null }; },
  };
  const file = { name: 'photo.jpg', type: 'image/jpeg', size: 100 };
  await assert.rejects(uploadPhotos(storage, [file, file], 'projects/1/sessions/2', uploaded));
  assert.equal(uploaded.length, 1);
  await removePhotos(storage, uploaded, url);
  assert.deepEqual(removed, uploaded);
});
test('validate every photo before beginning an upload', async () => {
  let calls = 0;
  await assert.rejects(uploadPhotos({ upload: async () => { calls++; } }, [
    { name: 'ok.jpg', type: 'image/jpeg', size: 1 },
    { name: 'bad.svg', type: 'image/svg+xml', size: 1 },
  ], 'projects/1', []));
  assert.equal(calls, 0);
  assert.throws(() => validatePhotos([{ type: 'image/png', size: MAX_PHOTO_BYTES + 1 }]));
});
test('zero payments and optional end dates are valid, negative amounts and reversed dates are not', () => {
  const project = { project_title: 'Sleeve', status_id: 1, date_start: '2026-09-28', target_end_date: '', agreed_price: 0, deposit_amount: 0 };
  assert.doesNotThrow(() => validateProject(project));
  assert.throws(() => validateProject({ ...project, target_end_date: '2026-09-27' }));
  assert.throws(() => validateProject({ ...project, deposit_amount: -1 }));
  const session = { appointment_date: '2026-09-28', appointment_time: '12:00', status_id: 4, amount_paid: 0 };
  assert.doesNotThrow(() => validateSession(session));
  assert.throws(() => validateSession({ ...session, appointment_time: '' }));
  assert.throws(() => validateSession({ ...session, amount_paid: -1 }));
});
test('phone formatting normalizes consistently for creation and editing', () => {
  assert.equal(normalizePhone(' +44 (000) 000-0000 '), '+440000000000');
});

test('past unresolved appointments need review in London winter and summer time', () => {
  const upcoming = { Status: { status: 'Upcoming' }, appointment_date: '2026-09-28', appointment_time: '09:30:00' };
  assert.equal(isSessionOverdue(upcoming, new Date('2026-09-28T09:00:00Z')), true); // 10:00 in London
  assert.equal(isSessionOverdue({ ...upcoming, appointment_time: '10:30:00' }, new Date('2026-09-28T09:00:00Z')), false);
  assert.equal(isSessionOverdue({ ...upcoming, appointment_date: '2026-12-01', appointment_time: '09:30:00' }, new Date('2026-12-01T09:00:00Z')), false);
  assert.equal(isSessionOverdue({ ...upcoming, Status: { status: 'Recorded' } }, new Date('2026-09-28T09:00:00Z')), false);
  assert.equal(sessionNeedsReview({ ...upcoming, Status: { status: 'Expired' } }), true);
  assert.equal(sessionNeedsReview({ ...upcoming, Status: { status: 'In Review' } }), true);
  assert.equal(projectStatusLabel('In Review'), 'Client review');
  assert.equal(sessionStatusLabel('In Review'), 'In Review (legacy)');
  assert.deepEqual(SESSION_STATUSES, ['Upcoming', 'Completed', 'Cancelled', 'Rescheduled']);
});
