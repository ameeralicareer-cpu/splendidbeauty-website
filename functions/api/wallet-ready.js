import { token } from './_paypal.js';

// Tells the browser whether Apple Pay / Google Pay can be offered: only when the server can talk to PayPal.
export async function onRequestGet({ env }) {
  let ready = false;
  try { await token(env); ready = true; } catch (e) {}
  return new Response(JSON.stringify({ ready }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': ready ? 'public, max-age=300' : 'no-store' } });
}
