import { createClient } from 'npm:@supabase/supabase-js@2';
import { eventBody } from './event.mjs';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') ?? '';
const appOrigin = Deno.env.get('APP_ORIGIN') ?? '';
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const googleApi = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const calendarScope = 'https://www.googleapis.com/auth/calendar.events.owned';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': appOrigin, 'Vary': 'Origin' },
  });
}

function redirect(result: 'connected' | 'error') {
  return Response.redirect(new URL('/?calendar=' + result, appOrigin), 303);
}

async function member(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '') ?? '';
  if (!token) return null;
  const { data: userResult, error } = await admin.auth.getUser(token);
  if (error || !userResult.user) return null;
  const { data: membership, error: memberError } = await admin.from('StudioMember')
    .select('user_id').eq('user_id', userResult.user.id).maybeSingle();
  if (memberError || !membership) return null;
  return userResult.user.id;
}

async function googleToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error('Google authorization expired. Reconnect your calendar.');
  return String(body.access_token);
}

async function googleRequest(token: string, method: string, url: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function hash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function allRows(table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(columns).order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function eventMappings(userId: string) {
  const rows: { session_id: number; event_id: string; payload_hash: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('GoogleCalendarEvent')
      .select('session_id, event_id, payload_hash').eq('user_id', userId)
      .order('session_id').range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function sync(userId: string, refreshToken: string) {
  const token = await googleToken(refreshToken);
  const sessions = await allRows('Session',
    'id, appointment_date, appointment_time, duration, Status(status), Project(project_title)');
  const mappings = await eventMappings(userId);
  const bySession = new Map(mappings.map((row) => [Number(row.session_id), row]));
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const desired = sessions.filter((session) => {
    const status = (session.Status as { status?: string } | null)?.status;
    const existing = bySession.has(Number(session.id));
    return status !== 'Cancelled' && (existing || (
      ['Upcoming', 'Rescheduled'].includes(status ?? '') &&
      String(session.appointment_date) >= today
    ));
  });
  const desiredIds = new Set(desired.map((session) => Number(session.id)));
  let changed = 0;
  for (const session of desired) {
    const id = Number(session.id);
    const body = eventBody(session);
    const fingerprint = await hash(body);
    const old = bySession.get(id);
    if (old?.payload_hash === fingerprint) continue;
    const url = googleApi + '/' + encodeURIComponent(old?.event_id ?? body.id);
    let response = old
      ? await googleRequest(token, 'PATCH', url, body)
      : await googleRequest(token, 'POST', googleApi, body);
    if (old && response.status === 404) {
      response = await googleRequest(token, 'POST', googleApi, body);
    } else if (!old && response.status === 409) {
      response = await googleRequest(token, 'PATCH', url, body);
    }
    if (!response.ok) throw new Error('Google Calendar could not save a session (' + response.status + ').');
    const { error } = await admin.from('GoogleCalendarEvent').upsert({
      user_id: userId, session_id: id, event_id: body.id, payload_hash: fingerprint,
    });
    if (error) throw error;
    changed++;
  }
  for (const mapping of mappings) {
    if (desiredIds.has(Number(mapping.session_id))) continue;
    const response = await googleRequest(token, 'DELETE', googleApi + '/' + encodeURIComponent(mapping.event_id));
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error('Google Calendar could not remove a cancelled or deleted session (' + response.status + ').');
    }
    const { error } = await admin.from('GoogleCalendarEvent').delete()
      .eq('user_id', userId).eq('session_id', mapping.session_id);
    if (error) throw error;
    changed++;
  }
  const { error } = await admin.from('GoogleCalendarConnection').update({
    last_synced_at: new Date().toISOString(), last_error: null,
  }).eq('user_id', userId);
  if (error) throw error;
  return changed;
}

async function callback(url: URL) {
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code');
  if (!state || !code || url.searchParams.has('error')) return redirect('error');
  const { data: saved, error } = await admin.from('GoogleCalendarOAuthState')
    .delete().eq('state', state).select('user_id, expires_at').maybeSingle();
  if (error || !saved || new Date(saved.expires_at).getTime() < Date.now()) return redirect('error');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) return redirect('error');
  const token = await response.json();
  if (!token.refresh_token || !String(token.scope ?? '').split(' ').includes(calendarScope)) return redirect('error');
  const { error: saveError } = await admin.from('GoogleCalendarConnection').upsert({
    user_id: saved.user_id, refresh_token: token.refresh_token,
    connected_at: new Date().toISOString(), last_synced_at: null, last_error: null,
  });
  if (saveError) return redirect('error');
  // A reconnect may select another Google account. Rebuild mappings there;
  // deterministic event IDs prevent duplicates when reconnecting the same one.
  const { error: mappingError } = await admin.from('GoogleCalendarEvent')
    .delete().eq('user_id', saved.user_id);
  return redirect(mappingError ? 'error' : 'connected');
}

Deno.serve(async (req) => {
  if (!appOrigin || !clientId || !clientSecret || !redirectUri || !supabaseUrl || !serviceKey) {
    return json({ error: 'Google Calendar integration is not configured.' }, 503);
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': appOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Vary': 'Origin',
    } });
  }
  try {
    if (req.method === 'GET') return callback(new URL(req.url));
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const userId = await member(req);
    if (!userId) return json({ error: 'Studio sign-in required.' }, 401);
    const { action } = await req.json();
    if (action === 'status') {
      const { data, error } = await admin.from('GoogleCalendarConnection')
        .select('connected_at, last_synced_at, last_error').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return json({ connected: Boolean(data), connectedAt: data?.connected_at,
        lastSyncedAt: data?.last_synced_at, lastError: data?.last_error });
    }
    if (action === 'connect') {
      const state = crypto.randomUUID() + crypto.randomUUID();
      const { error } = await admin.from('GoogleCalendarOAuthState').insert({
        state, user_id: userId, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (error) throw error;
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: calendarScope, access_type: 'offline', prompt: 'consent', state,
      }).toString();
      return json({ url: url.toString() });
    }
    const { data: connection, error } = await admin.from('GoogleCalendarConnection')
      .select('refresh_token').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (!connection) return json({ error: 'Connect Google Calendar first.' }, 409);
    if (action === 'sync') {
      try {
        return json({ changed: await sync(userId, connection.refresh_token) });
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Calendar sync failed.';
        await admin.from('GoogleCalendarConnection').update({ last_error: message }).eq('user_id', userId);
        return json({ error: message }, 502);
      }
    }
    if (action === 'disconnect') {
      // Disconnect stops future writes. Existing Google events stay in the user's calendar.
      const { error: deleteError } = await admin.from('GoogleCalendarConnection')
        .delete().eq('user_id', userId);
      if (deleteError) throw deleteError;
      const { error: mappingError } = await admin.from('GoogleCalendarEvent')
        .delete().eq('user_id', userId);
      if (mappingError) throw mappingError;
      return json({ connected: false });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch {
    return json({ error: 'Calendar request failed. Please try again.' }, 500);
  }
});
