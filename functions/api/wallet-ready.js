import { token } from './_paypal.js';

// Tells the browser whether Apple Pay / Google Pay can be offered: only when the server can talk to PayPal.
// "reason" is a short non-secret hint for the owner when it is not ready.
export async function onRequestGet({ env }) {
  let ready = false, reason = '';
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    reason = 'missing: ' + [!env.PAYPAL_CLIENT_ID && 'PAYPAL_CLIENT_ID', !env.PAYPAL_CLIENT_SECRET && 'PAYPAL_CLIENT_SECRET'].filter(Boolean).join(', ');
  } else {
    try { await token(env); ready = true; } catch (e) { reason = 'PayPal refused the keys (' + String(e && e.message || e).slice(0, 40) + ')'; }
  }
  return new Response(JSON.stringify({ ready, reason }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': ready ? 'public, max-age=300' : 'no-store' } });
}
