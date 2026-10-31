(function(){
  var KEY='sb_cookie_consent';
  function get(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function set(v){try{localStorage.setItem(KEY,v)}catch(e){}}
  function apply(v){
    if(typeof gtag==='function'){
      gtag('consent','update',{analytics_storage:v==='granted'?'granted':'denied'});
    }
    if(v==='granted'&&typeof window.sbLoadPixel==='function')window.sbLoadPixel();
  }
  var saved=get();
  if(saved==='granted'||saved==='denied'){apply(saved);return;}
  function show(){
    var css=document.createElement('style');
    css.textContent='#sbc{position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;max-width:560px;margin:0 auto;background:#0f0f14;color:#eee;border:1px solid #c99a3e;border-radius:12px;padding:16px;font:14px/1.5 Poppins,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}#sbc p{margin:0 0 12px}#sbc a{color:#e9c988}#sbc .b{display:flex;gap:10px;flex-wrap:wrap}#sbc button{flex:1;min-width:120px;padding:10px 14px;border-radius:8px;font:600 14px Poppins,system-ui,sans-serif;cursor:pointer;border:1px solid #c99a3e}#sbc .y{background:#e9c988;color:#111}#sbc .n{background:transparent;color:#e9c988}';
    document.head.appendChild(css);
    var d=document.createElement('div');d.id='sbc';d.setAttribute('role','dialog');d.setAttribute('aria-label','Cookie consent');
    d.innerHTML='<p>We use analytics and advertising cookies to understand how visitors use our site and to measure our ads. You can accept or decline. See our <a href="/privacy">Privacy Policy</a>.</p><div class="b"><button class="y" type="button">Accept</button><button class="n" type="button">Decline</button></div>';
    d.querySelector('.y').onclick=function(){set('granted');apply('granted');d.remove()};
    d.querySelector('.n').onclick=function(){set('denied');apply('denied');d.remove()};
    document.body.appendChild(d);
  }
  if(document.body)show();else document.addEventListener('DOMContentLoaded',show);
})();
