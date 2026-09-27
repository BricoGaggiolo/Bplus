/* B+ SW v7 */
const APP_FIX = `
<style id="bplus-runtime-fix">
html,body{min-height:100%;touch-action:manipulation}
#app-main{display:flex!important;visibility:visible!important;min-height:100vh}
@media(max-width:768px){
  #bottombar{display:flex!important;z-index:10000!important;pointer-events:auto!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important}
  #bottombar .bb-item{pointer-events:auto!important;touch-action:manipulation!important;position:relative!important;z-index:10001!important;min-height:44px!important}
  #mob-overlay{z-index:9990!important}
  #mob-overlay:not(.show){display:none!important;pointer-events:none!important}
  .content{padding-bottom:78px!important}
}
</style>
<script>
(function(){
  function repair(){
    var app=document.getElementById('app-main');
    if(app){app.style.setProperty('display','flex','important');app.style.setProperty('visibility','visible','important');}
    var bar=document.getElementById('bottombar');
    if(bar){bar.style.setProperty('z-index','10000','important');bar.style.setProperty('pointer-events','auto','important');}
    var ov=document.getElementById('mob-overlay');
    if(ov && !ov.classList.contains('show')){ov.style.setProperty('pointer-events','none','important');}
  }
  window.addEventListener('error',function(){setTimeout(repair,0);});
  document.addEventListener('DOMContentLoaded',repair);
  setTimeout(repair,50);setTimeout(repair,300);setTimeout(repair,1000);
})();
</script>`;

self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith('/app.html')){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(async response=>{
      if(!response.ok) return response;
      const type=response.headers.get('content-type')||'';
      if(!type.includes('text/html')) return response;
      let html=await response.text();
      html=html.replace('<div class="app"<div class="app" id="app-main" style="display:none">','<div class="app" id="app-main" style="display:flex">');
      if(!html.includes('bplus-runtime-fix')) html=html.replace('</head>',APP_FIX+'</head>');
      return new Response(html,{status:response.status,statusText:response.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
});

self.addEventListener('push',e=>{
  const d=e.data?e.data.json():{};
  e.waitUntil(self.registration.showNotification(d.title||'B+ Gestionale',{
    body:d.body||'',icon:'/Bplus/icons/icon-192.png',badge:'/Bplus/icons/icon-72.png',tag:d.tag||'bplus',data:{url:d.url||'/Bplus/'}
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url||'/Bplus/'));
});
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});