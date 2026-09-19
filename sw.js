const CACHE_NAME = 'bplus-v1';
const ASSETS = [
  '/Bplus/',
  '/Bplus/index.html',
  '/Bplus/manifest.json',
];

// Installazione: pre-cacha le risorse essenziali
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Attivazione: rimuovi cache vecchie e prendi subito il controllo
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-first con fallback alla cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Notifiche push
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'B+ Gestionale';
  const options = {
    body: data.body || '',
    icon: '/Bplus/icons/icon-192.png',
    badge: '/Bplus/icons/icon-72.png',
    tag: data.tag || 'bplus-notif',
    renotify: true,
    data: { url: data.url || '/Bplus/' },
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Click su notifica → apri l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = e.notification.data?.url || '/Bplus/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes('/Bplus/'));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// Aggiornamento silenzioso: controlla ogni ora se c'è una nuova versione
self.addEventListener('message', e => {
  if (e.data === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

// Quando una nuova versione è pronta, notifica i client
self.addEventListener('controllerchange', () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({ type: 'UPDATE_READY' }));
  });
});