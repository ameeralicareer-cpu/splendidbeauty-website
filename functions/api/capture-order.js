import { API, token, json } from './_paypal.js';

// Adds the delivery address from Apple Pay / Google Pay to the order, then captures the payment.
export async function onRequestPost({ request, env }) {
  try {
    const { id, shipping } = await request.json();
    if (!/^[A-Z0-9]{10,30}$/.test(String(id || ''))) return json({ error: 'bad id' }, 400);
    const t = await token(env);
    const H = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' };
    if (shipping && shipping.address && shipping.address.address_line_1) {
      const s = {
        name: { full_name: String(shipping.name || '').slice(0, 300) },
        address: {
          address_line_1: String(shipping.address.address_line_1).slice(0, 300),
          address_line_2: String(shipping.address.address_line_2 || '').slice(0, 300) || undefined,
          admin_area_2: String(shipping.address.admin_area_2 || '').slice(0, 120),
          admin_area_1: String(shipping.address.admin_area_1 || '').slice(0, 300) || undefined,
          postal_code: String(shipping.address.postal_code || '').slice(0, 60),
          country_code: 'GB'
        }
      };
      await fetch(API + '/v2/checkout/orders/' + id, {
        method: 'PATCH', headers: H,
        body: JSON.stringify([{ op: 'add', path: "/purchase_units/@reference_id=='default'/shipping", value: s }])
      });
    }
    const r = await fetch(API + '/v2/checkout/orders/' + id + '/capture', { method: 'POST', headers: H, body: '{}' });
    const j = await r.json();
    if (j.status !== 'COMPLETED') return json({ error: 'not completed', status: j.status }, 402);
    return json({ id: j.id, status: j.status });
  } catch (e) {
    return json({ error: 'server error' }, 500);
  }
}
