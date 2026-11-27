/* Splendid Beauty: Apple Pay and Google Pay through PayPal (UK, GBP).
   Needs the PayPal SDK loaded with components=buttons,applepay,googlepay.
   Buttons only appear when the customer's device and our PayPal account are eligible. */
(function () {
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'failed'); return j; }); });
  }
  function createOrder(getItems) {
    return post('/api/create-order', { items: getItems(), promo: (window.SBCart && SBCart.promo && SBCart.promo()) || '' }).then(function (j) { return j; });
  }
  function capture(id, shipping) { return post('/api/capture-order', { id: id, shipping: shipping }); }

  /* mount(box, getItems, getTotal, onPaid, onError)
     box: element to put the buttons in; getItems: returns [{code,name,label,price,qty}]; getTotal: number; onPaid(orderId, total) */
  /* Test switch: open any page with ?wallet=1 to turn the buttons on for this browser only, ?wallet=0 to turn off.
     Set LIVE to true when everything is tested to show them to every customer. */
  var LIVE = true;
  function enabled() {
    if (LIVE) return true;
    try {
      var m = /[?&]wallet=([01])/.exec(location.search);
      if (m) localStorage.setItem('sb_wallet', m[1]);
      return localStorage.getItem('sb_wallet') === '1';
    } catch (e) { return false; }
  }
  function realMount(box, getItems, getTotal, onPaid, onError) {
    if (!box || !window.paypal || !enabled()) return;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:8px';
    box.appendChild(wrap);
    function fail(e) { try { console.warn('wallet pay', e); } catch (x) {} if (onError) onError(); }

    /* Apple Pay: Safari on iPhone, iPad, Mac; other browsers (Chrome, Edge, Firefox) show a code to scan with an iPhone (iOS 18+) */
    try {
      if (window.paypal.Applepay) {
        loadScript('https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js').catch(function () {}).then(function () {
          if (!(window.ApplePaySession && ApplePaySession.canMakePayments())) return;
          var ap = paypal.Applepay();
          return ap.config().then(function (cfg) {
          if (!cfg || !cfg.isEligible) return;
          return Promise.resolve().then(function () {
            var b = document.createElement('apple-pay-button');
            b.setAttribute('buttonstyle', 'black'); b.setAttribute('type', 'buy'); b.setAttribute('locale', 'en-GB');
            b.style.cssText = '--apple-pay-button-width:100%;--apple-pay-button-height:45px;--apple-pay-button-border-radius:4px;display:block;cursor:pointer';
            wrap.appendChild(b);
            b.addEventListener('click', function () {
              var total = getTotal().toFixed(2);
              var session = new ApplePaySession(4, {
                countryCode: 'GB', currencyCode: 'GBP',
                merchantCapabilities: cfg.merchantCapabilities, supportedNetworks: cfg.supportedNetworks,
                requiredBillingContactFields: ['postalAddress', 'name'],
                requiredShippingContactFields: ['postalAddress', 'name', 'phone', 'email'],
                total: { label: 'Splendid Beauty', amount: total, type: 'final' }
              });
              session.onvalidatemerchant = function (ev) {
                ap.validateMerchant({ validationUrl: ev.validationURL })
                  .then(function (p) { session.completeMerchantValidation(p.merchantSession); })
                  .catch(function (e) { session.abort(); fail(e); });
              };
              session.onshippingcontactselected = function (ev) {
                var ok = ev.shippingContact && ev.shippingContact.countryCode && ev.shippingContact.countryCode.toUpperCase() === 'GB';
                session.completeShippingContactSelection({
                  status: ok ? ApplePaySession.STATUS_SUCCESS : ApplePaySession.STATUS_INVALID_SHIPPING_POSTAL_ADDRESS,
                  newTotal: { label: 'Splendid Beauty', amount: total, type: 'final' }
                });
              };
              session.onpaymentauthorized = function (ev) {
                var sc = ev.payment.shippingContact || {}, bc = ev.payment.billingContact || {};
                var ship = { name: [sc.givenName, sc.familyName].filter(Boolean).join(' '), address: {
                  address_line_1: (sc.addressLines || [])[0], address_line_2: (sc.addressLines || [])[1],
                  admin_area_2: sc.locality, admin_area_1: sc.administrativeArea, postal_code: sc.postalCode } };
                createOrder(getItems).then(function (o) {
                  return ap.confirmOrder({ orderId: o.id, token: ev.payment.token, billingContact: bc, shippingContact: sc })
                    .then(function () { return capture(o.id, ship); })
                    .then(function () { session.completePayment({ status: ApplePaySession.STATUS_SUCCESS }); onPaid(o.id, Number(o.total)); });
                }).catch(function (e) { session.completePayment({ status: ApplePaySession.STATUS_FAILURE }); fail(e); });
              };
              session.oncancel = function () {};
              session.begin();
            });
          });
        }).catch(fail);
        });
      }
    } catch (e) { fail(e); }

    /* Google Pay (Chrome and Android) */
    try {
      if (window.paypal.Googlepay) {
        loadScript('https://pay.google.com/gp/p/js/pay.js').then(function () {
          var gp = paypal.Googlepay();
          return gp.config().then(function (cfg) {
            if (!cfg || !cfg.isEligible) return;
            var client = new google.payments.api.PaymentsClient({ environment: 'PRODUCTION' });
            return client.isReadyToPay({ apiVersion: cfg.apiVersion, apiVersionMinor: cfg.apiVersionMinor, allowedPaymentMethods: cfg.allowedPaymentMethods }).then(function (r) {
              if (!r.result) return;
              var b = client.createButton({ buttonColor: 'black', buttonType: 'buy', buttonSizeMode: 'fill', buttonLocale: 'en',
                onClick: function () {
                  var total = getTotal().toFixed(2), orderId;
                  client.loadPaymentData({
                    apiVersion: cfg.apiVersion, apiVersionMinor: cfg.apiVersionMinor,
                    allowedPaymentMethods: cfg.allowedPaymentMethods, merchantInfo: cfg.merchantInfo,
                    transactionInfo: { countryCode: 'GB', currencyCode: 'GBP', totalPriceStatus: 'FINAL', totalPrice: total },
                    emailRequired: true, shippingAddressRequired: true, shippingAddressParameters: { allowedCountryCodes: ['GB'], phoneNumberRequired: true }
                  }).then(function (pd) {
                    var sa = pd.shippingAddress || {};
                    var ship = { name: sa.name, address: { address_line_1: sa.address1, address_line_2: [sa.address2, sa.address3].filter(Boolean).join(', '),
                      admin_area_2: sa.locality, admin_area_1: sa.administrativeArea, postal_code: sa.postalCode } };
                    return createOrder(getItems).then(function (o) {
                      orderId = o.id;
                      return gp.confirmOrder({ orderId: o.id, paymentMethodData: pd.paymentMethodData }).then(function (c) {
                        if (c && c.status === 'PAYER_ACTION_REQUIRED') return gp.initiatePayerAction({ orderId: o.id });
                      }).then(function () { return capture(o.id, ship); }).then(function () { onPaid(o.id, Number(o.total)); });
                    });
                  }).catch(function (e) { if (e && e.statusCode === 'CANCELED') return; fail(e); });
                } });
              b.style.cssText = 'width:100%;height:45px';
              wrap.appendChild(b);
            });
          });
        }).catch(fail);
      }
    } catch (e) { fail(e); }
  }
  /* Show the wallet buttons only when the server can reach PayPal (keys set), so a customer never taps a button that fails. */
  window.SBWallet = { mount: function () {
    var args = arguments;
    fetch('/api/wallet-ready', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ready) realMount.apply(null, args); }).catch(function () {});
  } };
})();
