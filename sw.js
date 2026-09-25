/* B+ Gestionale SW - v5 no-cache */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))
    .then(() => self.clients.claim())
));
/* Nessun intercettamento fetch: lascia tutto al browser */
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title||'B+ Gestionale',{
    body: d.body||'', icon:'/Bplus/icons/icon-192.png',
    badge:'/Bplus/icons/icon-72.png', tag: d.tag||'bplus',
    data:{ url: d.url||'/Bplus/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url||'/Bplus/'));
});