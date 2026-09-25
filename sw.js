const CACHE_NAME='bplus-v3';
const ASSETS=['/Bplus/','/Bplus/index.html','/Bplus/manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(res=>{const c=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));return res}).catch(()=>caches.match(e.request)))});
self.addEventListener('push',e=>{const d=e.data?e.data.json():{};e.waitUntil(self.registration.showNotification(d.title||'B+ Gestionale',{body:d.body||'',icon:'/Bplus/icons/icon-192.png',badge:'/Bplus/icons/icon-72.png',tag:d.tag||'bplus',renotify:true,data:{url:d.url||'/Bplus/'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();if(e.action==='close')return;e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(w=>{const ex=w.find(x=>x.url.includes('/Bplus/'));if(ex)return ex.focus();return clients.openWindow(e.notification.data?.url||'/Bplus/')}))});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING'||e.data?.type==='SKIP_WAITING')self.skipWaiting()});