const CACHE_NAME = 'bplus-v2';
const ASSETS = ['/Bplus/','/Bplus/index.html','/Bplus/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const clone=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
      return res;
    }).catch(()=>caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  const data=e.data?e.data.json():{};
  e.waitUntil(self.registration.showNotification(data.title||'B+ Gestionale',{
    body:data.body||'',
    icon:'/Bplus/icons/icon-192.png',
    badge:'/Bplus/icons/icon-72.png',
    tag:data.tag||'bplus-notif',
    renotify:true,
    data:{url:data.url||'/Bplus/'},
    actions:[{action:'open',title:'Apri'},{action:'close',title:'Chiudi'}]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if(e.action==='close') return;
  const url=e.notification.data?.url||'/Bplus/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(wins=>{
    const ex=wins.find(w=>w.url.includes('/Bplus/'));
    if(ex) return ex.focus();
    return clients.openWindow(url);
  }));
});

self.addEventListener('message', e=>{
  if(e.data==='SKIP_WAITING'||e.data?.type==='SKIP_WAITING') self.skipWaiting();
});