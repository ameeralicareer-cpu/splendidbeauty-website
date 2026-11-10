(function(){
  var ID='2622829524844753',loaded=false;
  function load(){
    if(loaded)return;loaded=true;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',ID);fbq('track','PageView');
  }
  window.sbLoadPixel=load;
  var g=false;try{g=localStorage.getItem('sb_cookie_consent')==='granted'}catch(e){}
  if(g)load();
  document.addEventListener('click',function(ev){
    var a=ev.target.closest&&ev.target.closest('a[href*="wa.me"]');
    if(!a)return;
    var code='',m=decodeURIComponent(a.getAttribute('href')||'').match(/SB-[A-Z]{2}-\d{3}/);
    if(m)code=m[0];
    var where=a.getAttribute('aria-label')==='WhatsApp'?'floating_button':'page_link';
    if(typeof fbq==='function')fbq('track','Contact',{content_name:document.title,content_ids:code?[code]:undefined,source:where});
    if(typeof gtag==='function')gtag('event','whatsapp_click',{page_path:location.pathname,product_code:code||'none',link_location:where,transport_type:'beacon'});
  },true);
})();
