// Shared helpers for PayPal server calls (Cloudflare Pages Functions).
// Needs two environment variables set in Cloudflare Pages: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (Live).
export const API = 'https://api-m.paypal.com';

export async function token(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error('PayPal keys are not set');
  const r = await fetch(API + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('PayPal auth failed');
  return j.access_token;
}

export function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
