import supabase from './supabaseClient.js';

export function notifyCalendarChanged() {
  window.dispatchEvent(new Event('studio:calendar-changed'));
}

export async function calendarAction(action) {
  const { data, error } = await supabase.functions.invoke('google-calendar', { body: { action } });
  if (error) throw new Error(data?.error ?? 'Google Calendar is unavailable. Check the integration setup.');
  if (data?.error) throw new Error(data.error);
  return data;
}
