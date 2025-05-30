// public/sw.js

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notificación', body: event.data.text() };
    }
  }

  const title = data.title || 'Recordatorio';
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
  };

  // Muestra la notificación incluso si la app está cerrada
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Al hacer clic, abre o enfoca tu PWA
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(sites => {
      for (const site of sites) {
        if (site.url.includes(self.registration.scope) && 'focus' in site) {
          return site.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
