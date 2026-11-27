// Shared helpers for PayPal server calls (Cloudflare Pages Functions).
// Needs two environment variables set in Cloudflare Pages: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (Live).
export const API = 'https://api-m.paypal.com';

export async function token(env) {
  // trim: a stray space or new line pasted with a key must not break the login
  const id = String(env.PAYPAL_CLIENT_ID || '').trim(), secret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!id || !secret) throw new Error('PayPal keys are not set');
  const r = await fetch(API + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(id + ':' + secret), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('PayPal auth failed');
  return j.access_token;
}

export function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
