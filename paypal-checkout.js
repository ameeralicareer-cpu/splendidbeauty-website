/* Splendid Beauty: PayPal checkout (PayPal and debit/credit card, GBP).
   Uses the PayPal JS SDK with the public Live Client ID. The Secret is never used here. */
(function () {
  var CLIENT_ID = 'BAAuhtNT9MmOUY3SZjfAycOq_RiWaaaE2EtfZnR-9XKp2w-jCwjOJVBJQHHOSGUazzYjPLgQsm4GYMSfPQ';
  var rows = document.querySelectorAll('.prices .r');
  var cta = document.querySelector('.cta');
  if (!rows.length || !cta) return;

  var options = [];
  rows.forEach(function (r) {
    var span = r.querySelector('span'), b = r.querySelector('b');
    if (!span || !b) return;
    var c = span.cloneNode(true);
    c.querySelectorAll('small').forEach(function (s) { s.remove(); });
    var label = c.textContent.replace(/\s+/g, ' ').trim();
    var price = parseFloat(b.textContent.replace(/[^0-9.]/g, ''));
    if (label && price > 0) options.push({ label: label, price: price });
  });
  if (!options.length) return;

  var q = function (s) { var e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; };
  var code = q('.code'), series = q('.series'), title = q('h1');
  var baseName = [code, series, title].filter(Boolean).join(' ').slice(0, 90);

  var css = '.pb{margin:18px 0 6px;padding:16px;border:1px solid #e4dccb;border-radius:10px;background:#fff}'
    + '.pb h2{font-size:15px;margin:0 0 10px;letter-spacing:.04em}'
    + '.pb label{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:10px 0 4px;color:#6b6458}'
    + '.pb select{width:100%;padding:10px;font-size:15px;border:1px solid #cfc5b0;border-radius:6px;background:#fff}'
    + '.pb .tot{display:flex;justify-content:space-between;font-weight:700;margin:14px 0 12px;font-size:16px}'
    + '.pb .msg{font-size:13px;margin-top:10px;color:#6b6458}.pb .err{color:#b3261e}'
    + '.pb a{text-decoration:underline}'
    + '.pbadd{width:100%;padding:14px;border:0;border-radius:6px;background:#101010;color:#D9B66C;font:600 14px Montserrat,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;margin-bottom:8px}.pb .or{font-size:12px;color:#6b6458;text-align:center;margin:8px 0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div'); box.className = 'pb';
  var h = '<h2>Order online</h2>';
  if (options.length > 1) {
    h += '<label for="pbSteel">Steel</label><select id="pbSteel">';
    options.forEach(function (o, i) { h += '<option value="' + i + '">' + o.label + ' - &pound;' + o.price.toFixed(2) + '</option>'; });
    h += '</select>';
  }
  h += '<label for="pbQty">Quantity</label><select id="pbQty">';
  for (var n = 1; n <= 10; n++) h += '<option value="' + n + '">' + n + '</option>';
  h += '</select><div class="tot"><span>Total (free UK delivery)</span><span id="pbTot"></span></div>'
    + '<button type="button" id="pbAdd" class="pbadd">Add to cart</button><p class="or">or buy this item now:</p>'
    + '<div id="pbBtns"></div><p class="msg" id="pbMsg">Pay with PayPal or a debit/credit card. Ordering more than 10 or want your own branding? <a href="https://wa.me/447946633362" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p>';
  box.innerHTML = h;
  cta.parentNode.insertBefore(box, cta);

  var selSteel = document.getElementById('pbSteel'), selQty = document.getElementById('pbQty'), tot = document.getElementById('pbTot'), msg = document.getElementById('pbMsg');
  function cur() {
    var o = options[selSteel ? +selSteel.value : 0], qty = +selQty.value;
    return { o: o, qty: qty, total: (Math.round(o.price * 100) * qty) / 100 };
  }
  function upd() { tot.innerHTML = '&pound;' + cur().total.toFixed(2); }
  if (selSteel) selSteel.addEventListener('change', upd);
  selQty.addEventListener('change', upd);
  upd();

  var addBtn = document.getElementById('pbAdd');
  if (!window.SBCart) { addBtn.style.display = 'none'; }
  addBtn.addEventListener('click', function () {
    var c = cur(), img = document.getElementById('mainImg'), src = '';
    try { if (img) src = new URL(img.getAttribute('src'), location.href).pathname.replace(/\.jpg$/i, '-t.webp'); } catch (e) {}
    SBCart.add({ code: code, name: [series, title].filter(Boolean).join(' ') || baseName, label: c.o.label, price: c.o.price, qty: c.qty, url: location.pathname, img: src });
    msg.className = 'msg'; msg.innerHTML = 'Added to your cart. <a href="/cart">View cart</a> or keep shopping.';
  });

  var s = document.createElement('script');
  s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(CLIENT_ID)
    + '&currency=GBP&components=buttons&intent=capture&enable-funding=card&disable-funding=paylater,credit';
  s.onerror = function () { msg.className = 'msg err'; msg.innerHTML = 'Online payment is not available right now. Please order on WhatsApp.'; };
  s.onload = function () {
    if (!window.paypal) return s.onerror();
    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },
      createOrder: function (data, actions) {
        var c = cur(), t = c.total.toFixed(2), unit = c.o.price.toFixed(2);
        var name = (baseName + (options.length > 1 ? ' (' + c.o.label + ')' : '')).slice(0, 127);
        return actions.order.create({
          purchase_units: [{
            description: 'Splendid Beauty order ' + code,
            custom_id: code,
            amount: { currency_code: 'GBP', value: t, breakdown: { item_total: { currency_code: 'GBP', value: t } } },
            items: [{ name: name, sku: code, quantity: String(c.qty), unit_amount: { currency_code: 'GBP', value: unit }, category: 'PHYSICAL_GOODS' }]
          }],
          application_context: { brand_name: 'Splendid Beauty', shipping_preference: 'GET_FROM_FILE', user_action: 'PAY_NOW' }
        });
      },
      onApprove: function (data, actions) {
        var c = cur();
        return actions.order.capture().then(function (d) {
          try { if (window.gtag) gtag('event', 'purchase', { transaction_id: d.id, value: c.total, currency: 'GBP', items: [{ item_id: code, item_name: baseName, quantity: c.qty, price: c.o.price }] }); } catch (e) {}
          try { if (window.fbq) fbq('track', 'Purchase', { value: c.total, currency: 'GBP' }); } catch (e) {}
          window.location.href = '/thank-you?order=' + encodeURIComponent(d.id);
        });
      },
      onCancel: function () { msg.className = 'msg'; msg.textContent = 'Payment cancelled. You can try again or order on WhatsApp.'; },
      onError: function () { msg.className = 'msg err'; msg.innerHTML = 'Payment could not be completed. Please try again or <a href="https://wa.me/447946633362" target="_blank" rel="noopener">order on WhatsApp</a>.'; }
    }).render('#pbBtns');
  };
  document.head.appendChild(s);
})();
