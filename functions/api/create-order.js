import { API, token, json } from './_paypal.js';

// Ambassador promo codes: code -> percent off. Keep in step with cart.js.
const PROMOS = { GAVIN15: 15 };

// Creates a PayPal order. Prices are checked against the real product pages, never trusted from the browser.
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const list = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    if (!list.length) return json({ error: 'empty' }, 400);
    const origin = new URL(request.url).origin;
    const pages = {};
    const items = [];
    let cents = 0;
    for (const it of list) {
      const code = String(it.code || '').toUpperCase();
      const qty = Number(it.qty);
      const price = Number(it.price);
      if (!/^SB-[A-Z0-9-]{3,20}$/.test(code) || !Number.isInteger(qty) || qty < 1 || qty > 10 || !(price > 0)) return json({ error: 'bad item' }, 400);
      if (!(code in pages)) {
        const r = await fetch(origin + '/products/' + code.toLowerCase());
        pages[code] = r.ok ? await r.text() : null;
      }
      const html = pages[code];
      if (!html) return json({ error: 'unknown item' }, 400);
      if (html.indexOf('name="sb-stock" content="out"') > -1) return json({ error: 'out of stock', code }, 409);
      const block = (html.split('class="prices"')[1] || '').split('class="cta"')[0];
      const prices = [...block.matchAll(/<b>&pound;([0-9]+(?:\.[0-9]{2})?)<\/b>/g)].map(m => Math.round(parseFloat(m[1]) * 100));
      const pc = Math.round(price * 100);
      if (prices.indexOf(pc) < 0) return json({ error: 'price changed', code }, 409);
      cents += pc * qty;
      items.push({ name: String((it.name || code) + ' (' + (it.label || '') + ')').slice(0, 127), sku: code, quantity: String(qty), unit_amount: { currency_code: 'GBP', value: (pc / 100).toFixed(2) }, category: 'PHYSICAL_GOODS' });
    }
    const promo = String(body.promo || '').toUpperCase();
    const pct = PROMOS[promo] || 0;
    const itemTotal = (cents / 100).toFixed(2);
    const disc = pct ? Math.round(cents * pct / 100) : 0;
    const total = ((cents - disc) / 100).toFixed(2);
    const t = await token(env);
    const r = await fetch(API + '/v2/checkout/orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ description: 'Splendid Beauty order' + (pct ? ' (code ' + promo + ')' : ''), custom_id: pct ? promo : undefined, amount: { currency_code: 'GBP', value: total, breakdown: Object.assign({ item_total: { currency_code: 'GBP', value: itemTotal } }, disc ? { discount: { currency_code: 'GBP', value: (disc / 100).toFixed(2) } } : {}) }, items }]
      })
    });
    const j = await r.json();
    if (!j.id) return json({ error: 'create failed' }, 502);
    return json({ id: j.id, total });
  } catch (e) {
    return json({ error: 'server error' }, 500);
  }
}
