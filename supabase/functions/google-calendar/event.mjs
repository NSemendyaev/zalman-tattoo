export function eventId(sessionId) {
  // Google event IDs accept lowercase base32hex characters (0-9, a-v).
  return 'tattoosession' + Number(sessionId).toString(16);
}

export function eventBody(session) {
  const date = String(session.appointment_date);
  const time = String(session.appointment_time).slice(0, 5);
  const duration = typeof session.duration === 'string' && /^\d\d:\d\d/.test(session.duration)
    ? session.duration : '02:00';
  const [hours, minutes] = duration.slice(0, 5).split(':').map(Number);
  const [startHours, startMinutes] = time.split(':').map(Number);
  const end = new Date(date + 'T00:00:00Z');
  end.setUTCMinutes(startHours * 60 + startMinutes + Math.max(1, hours * 60 + minutes));
  return {
    id: eventId(session.id),
    summary: 'Tattoo session · ' + (session.Project?.project_title ?? 'Project'),
    visibility: 'private',
    start: { dateTime: date + 'T' + time + ':00', timeZone: 'Europe/London' },
    end: { dateTime: end.toISOString().slice(0, 19), timeZone: 'Europe/London' },
    extendedProperties: { private: { studioSessionId: String(session.id) } },
  };
}
