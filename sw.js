const CACHE_NAME='bplus-v4';

self.addEventListener('install',e=>{
  // skipWaiting immediato: prende subito controllo senza aspettare
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  // Elimina tutte le vecchie cache
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);

  // Per index.html: sempre network, mai cache (così l'aggiornamento arriva subito)
  if(url.pathname.endsWith('/Bplus/')||url.pathname.endsWith('index.html')){
    e.respondWith(
      fetch(e.request,{cache:'no-store'})
        .catch(()=>caches.match('/Bplus/'))
    );
    return;
  }

  // Per le icone e il manifest: cache-first (cambiano raramente)
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        if(res.ok){
          const clone=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener('push',e=>{
  const d=e.data?e.data.json():{};
  e.waitUntil(self.registration.showNotification(d.title||'B+ Gestionale',{
    body:d.body||'',
    icon:'/Bplus/icons/icon-192.png',
    badge:'/Bplus/icons/icon-72.png',
    tag:d.tag||'bplus',
    renotify:true,
    data:{url:d.url||'/Bplus/'}
  }));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  if(e.action==='close') return;
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(wins=>{
      const ex=wins.find(w=>w.url.includes('/Bplus/'));
      if(ex) return ex.focus();
      return clients.openWindow(e.notification.data?.url||'/Bplus/');
    })
  );
});

self.addEventListener('message',e=>{
  if(e.data==='SKIP_WAITING'||e.data?.type==='SKIP_WAITING') self.skipWaiting();
});