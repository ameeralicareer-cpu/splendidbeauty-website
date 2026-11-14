/* Splendid Beauty: simple shopping cart (browser storage) + cart page checkout with PayPal/card. */
(function () {
  var KEY = 'sb_cart_v1', CLIENT_ID = 'BAAuhtNT9MmOUY3SZjfAycOq_RiWaaaE2EtfZnR-9XKp2w-jCwjOJVBJQHHOSGUazzYjPLgQsm4GYMSfPQ';
  var mem = [];
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return mem; } }
  function write(a) { mem = a; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} changed(); }
  function money(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  function count() { return read().reduce(function (s, i) { return s + i.qty; }, 0); }
  function total() { return read().reduce(function (s, i) { return s + Math.round(i.price * 100) * i.qty; }, 0) / 100; }
  var SBCart = window.SBCart = {
    get: read, count: count, total: total, money: money,
    add: function (it) {
      var a = read(), k = it.code + '|' + it.label, f = null;
      a.forEach(function (x) { if (x.key === k) f = x; });
      if (f) f.qty = Math.min(10, f.qty + it.qty); else a.push({ key: k, code: it.code, name: it.name, label: it.label, price: it.price, qty: Math.min(10, it.qty), url: it.url, img: it.img });
      write(a);
    },
    setQty: function (k, q) { var a = read(); a.forEach(function (x) { if (x.key === k) x.qty = Math.max(1, Math.min(10, q)); }); write(a); },
    remove: function (k) { write(read().filter(function (x) { return x.key !== k; })); },
    clear: function () { write([]); }
  };

  /* floating cart pill on every page */
  var pill;
  function changed() {
    if (!pill) return;
    var n = count();
    pill.style.display = n ? 'flex' : 'none';
    pill.innerHTML = 'Cart (' + n + ') &middot; ' + money(total());
  }
  function initPill() {
    if (/^\/cart/.test(location.pathname) || /^\/thank-you/.test(location.pathname)) return;
    var st = document.createElement('style');
    st.textContent = '#sbCartPill{position:fixed;left:16px;bottom:20px;z-index:11;display:none;align-items:center;padding:12px 18px;border-radius:999px;background:#101010;color:#D9B66C;border:1px solid #B68D3C;font:600 13px Montserrat,system-ui,sans-serif;letter-spacing:.04em;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.25)}@media(max-width:700px){#sbCartPill{bottom:84px}}';
    document.head.appendChild(st);
    pill = document.createElement('a'); pill.id = 'sbCartPill'; pill.href = '/cart'; pill.setAttribute('aria-label', 'View cart');
    document.body.appendChild(pill); changed();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPill); else initPill();

  /* ---------- cart page ---------- */
  var root = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function parsePrices(html) {
    var d = new DOMParser().parseFromString(html, 'text/html'), out = {};
    d.querySelectorAll('.prices .r').forEach(function (r) {
      var sp = r.querySelector('span'), b = r.querySelector('b'); if (!sp || !b) return;
      var c = sp.cloneNode(true); c.querySelectorAll('small').forEach(function (s) { s.remove(); });
      out[c.textContent.replace(/\s+/g, ' ').trim()] = parseFloat(b.textContent.replace(/[^0-9.]/g, ''));
    });
    return out;
  }
  function verify() { /* re-read current prices from product pages so stored prices cannot go stale */
    var a = read(), jobs = a.map(function (it) {
      return fetch(it.url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (h) {
        if (!h) return; var p = parsePrices(h);
        if (p[it.label] > 0) it.price = p[it.label]; else it.gone = true;
      }).catch(function () {});
    });
    return Promise.all(jobs).then(function () { var ok = a.filter(function (i) { return !i.gone; }); write(ok); });
  }
  function render() {
    var a = read();
    if (!a.length) { root.innerHTML = '<p>Your cart is empty.</p><p><a class="btn" style="text-decoration:none" href="/barber-scissors">Browse barber scissors</a></p>'; return; }
    var h = '<div id="cartRows">';
    a.forEach(function (it) {
      var opts = ''; for (var n = 1; n <= 10; n++) opts += '<option' + (n === it.qty ? ' selected' : '') + '>' + n + '</option>';
      h += '<div class="crow" data-k="' + esc(it.key) + '"><a href="' + esc(it.url) + '">' + (it.img ? '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" width="72" height="72">' : '') + '</a>'
        + '<div class="ci"><a href="' + esc(it.url) + '"><b>' + esc(it.name) + '</b></a><div class="cs">' + esc(it.label) + ' &middot; ' + money(it.price) + ' each</div>'
        + '<div class="cq"><select aria-label="Quantity">' + opts + '</select> <a href="#" class="rm">Remove</a></div></div><div class="lt">' + money(it.price * it.qty) + '</div></div>';
    });
    h += '</div><div class="ctot"><span>Total (free UK delivery)</span><b>' + money(total()) + '</b></div><div id="cartBtns"></div>'
      + '<p class="cmsg" id="cartMsg">Pay with PayPal or a debit/credit card. Need more than 10 of an item or your own branding? <a href="https://wa.me/447946633362" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p>'
      + '<p><a href="/barber-scissors">&larr; Continue shopping</a></p>';
    root.innerHTML = h;
    root.querySelectorAll('.crow').forEach(function (row) {
      var k = row.getAttribute('data-k');
      row.querySelector('select').addEventListener('change', function (e) { SBCart.setQty(k, +e.target.value); render(); mountPay(); });
      row.querySelector('.rm').addEventListener('click', function (e) { e.preventDefault(); SBCart.remove(k); render(); mountPay(); });
    });
  }
  var sdkState = 0, btnsRendered = false;
  function mountPay() {
    if (!read().length) return;
    var box = document.getElementById('cartBtns'), msg = document.getElementById('cartMsg'); if (!box) return;
    function draw() {
      box = document.getElementById('cartBtns'); if (!box) return;
      paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },
        createOrder: function (d, actions) {
          var a = read(); if (!a.length) throw new Error('empty');
          var t = total().toFixed(2);
          return actions.order.create({
            purchase_units: [{ description: 'Splendid Beauty order', amount: { currency_code: 'GBP', value: t, breakdown: { item_total: { currency_code: 'GBP', value: t } } },
              items: a.map(function (i) { return { name: (i.name + ' (' + i.label + ')').slice(0, 127), sku: i.code, quantity: String(i.qty), unit_amount: { currency_code: 'GBP', value: i.price.toFixed(2) }, category: 'PHYSICAL_GOODS' }; }) }],
            application_context: { brand_name: 'Splendid Beauty', shipping_preference: 'GET_FROM_FILE', user_action: 'PAY_NOW' }
          });
        },
        onApprove: function (d, actions) {
          var val = total();
          return actions.order.capture().then(function (o) {
            try { if (window.gtag) gtag('event', 'purchase', { transaction_id: o.id, value: val, currency: 'GBP' }); } catch (e) {}
            try { if (window.fbq) fbq('track', 'Purchase', { value: val, currency: 'GBP' }); } catch (e) {}
            location.href = '/thank-you?cart=1&order=' + encodeURIComponent(o.id);
          });
        },
        onCancel: function () { var m = document.getElementById('cartMsg'); if (m) m.textContent = 'Payment cancelled. Your cart is saved, you can try again.'; },
        onError: function () { var m = document.getElementById('cartMsg'); if (m) m.innerHTML = 'Payment could not be completed. Please try again or <a href="https://wa.me/447946633362" target="_blank" rel="noopener">order on WhatsApp</a>.'; }
      }).render('#cartBtns');
    }
    if (window.paypal) return draw();
    if (sdkState) return;
    sdkState = 1;
    var s = document.createElement('script');
    s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(CLIENT_ID) + '&currency=GBP&components=buttons&intent=capture&enable-funding=card&disable-funding=paylater,credit';
    s.onload = function () { sdkState = 2; if (window.paypal) draw(); };
    s.onerror = function () { if (msg) msg.textContent = 'Online payment is not available right now. Please order on WhatsApp.'; };
    document.head.appendChild(s);
  }
  function initCart() {
    root = document.getElementById('cartRoot'); if (!root) return;
    var st = document.createElement('style');
    st.textContent = '.crow{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid #e4dccb}.crow img{border-radius:8px;object-fit:cover;background:#fff}.ci{flex:1;min-width:0}.cs{font-size:13px;color:#6b6458;margin:2px 0 6px}.cq select{padding:6px;font-size:14px}.rm{font-size:13px;margin-left:10px;text-decoration:underline}.lt{font-weight:700}.ctot{display:flex;justify-content:space-between;font-size:18px;margin:18px 0 12px}.cmsg{font-size:13px;color:#6b6458;margin:12px 0}';
    document.head.appendChild(st);
    verify().then(function () { render(); mountPay(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCart); else initCart();

  /* thank-you page after a cart checkout empties the cart */
  if (/^\/thank-you/.test(location.pathname) && /[?&]cart=1/.test(location.search)) { try { localStorage.removeItem(KEY); } catch (e) {} }
})();
