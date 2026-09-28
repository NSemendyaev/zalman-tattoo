import test from 'node:test';
import assert from 'node:assert/strict';
import { eventBody } from '../supabase/functions/google-calendar/event.mjs';

test('calendar events retain London wall time across daylight-saving dates', () => {
  for (const date of ['2026-01-15', '2026-07-15']) {
    const event = eventBody({
      id: 42, appointment_date: date, appointment_time: '13:30:00',
      duration: '03:15:00', Project: { project_title: 'Sleeve design' },
    });
    assert.equal(event.id, 'tattoosession2a');
    assert.equal(event.start.dateTime, date + 'T13:30:00');
    assert.equal(event.end.dateTime, date + 'T16:45:00');
    assert.equal(event.start.timeZone, 'Europe/London');
    assert.equal(event.summary, 'Tattoo session · Sleeve design');
  }
});

test('a session without duration gets two hours and can cross midnight', () => {
  const event = eventBody({
    id: 43, appointment_date: '2026-09-28', appointment_time: '23:30',
    duration: null, Project: { project_title: 'Design' },
  });
  assert.equal(event.end.dateTime, '2026-09-29T01:30:00');
});
