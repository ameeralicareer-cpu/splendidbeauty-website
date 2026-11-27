import { API, token, json } from './_paypal.js';

// PayPal webhook: when a payment is captured, send the shop owner a Telegram message.
// Needs Cloudflare variables: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID (Live),
// TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Without them this does nothing and never blocks a sale.

async function verified(request, raw, env, t) {
  const h = request.headers;
  const r = await fetch(API + '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: h.get('paypal-auth-algo'), cert_url: h.get('paypal-cert-url'), transmission_id: h.get('paypal-transmission-id'),
      transmission_sig: h.get('paypal-transmission-sig'), transmission_time: h.get('paypal-transmission-time'),
      webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: JSON.parse(raw)
    })
  });
  const j = await r.json();
  return j.verification_status === 'SUCCESS';
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.PAYPAL_WEBHOOK_ID || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ ok: true, skipped: 'not configured' });
    const raw = await request.text();
    const t = await token(env);
    if (!(await verified(request, raw, env, t))) return json({ error: 'bad signature' }, 400);
    const ev = JSON.parse(raw);
    if (ev.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return json({ ok: true, ignored: ev.event_type });
    const cap = ev.resource || {};
    const orderId = cap.supplementary_data && cap.supplementary_data.related_ids && cap.supplementary_data.related_ids.order_id;
    let lines = ['NEW SALE: ' + (cap.amount ? cap.amount.currency_code + ' ' + cap.amount.value : '')];
    if (orderId) {
      const r = await fetch(API + '/v2/checkout/orders/' + orderId, { headers: { Authorization: 'Bearer ' + t } });
      const o = await r.json();
      const pu = (o.purchase_units || [])[0] || {};
      (pu.items || []).forEach(i => lines.push(i.quantity + ' x ' + i.name));
      const code = pu.custom_id && !/^SB-/i.test(pu.custom_id) ? pu.custom_id : '';
      if (code) lines.push('PROMO CODE: ' + code);
      else if (/\(code ([A-Z0-9]+)\)/.test(pu.description || '')) lines.push('PROMO CODE: ' + RegExp.$1);
      const sh = pu.shipping || {};
      const a = sh.address || {};
      const addr = [sh.name && sh.name.full_name, a.address_line_1, a.address_line_2, a.admin_area_2, a.admin_area_1, a.postal_code].filter(Boolean).join(', ');
      lines.push('SHIP TO: ' + (addr || 'address not received, check PayPal'));
      if (o.payer && o.payer.email_address) lines.push('Email: ' + o.payer.email_address);
      lines.push('PayPal order: ' + orderId);
    } else lines.push('PayPal capture: ' + cap.id);
    await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lines.join('\n') })
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'server error' }, 500);
  }
}
