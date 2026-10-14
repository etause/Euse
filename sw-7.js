/* يخزّن ملفات التطبيق للعمل بدون إنترنت. لا يلمس كلمات المستخدم أبدًا لأنها في localStorage وليست في الكاش.
   يجلب النسخة الأحدث أولًا عند وجود إنترنت حتى تظهر التحديثات فورًا. غيّر رقم VERSION عند كل إصدار. */
const VERSION = 'words-v9';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});


/* الإشعارات الخارجية (Web Push) */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { try { d = { body: e.data.text() }; } catch (__) {} }
  const title = d.title || 'Enotes';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', dir: 'auto',
    data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow(target);
  }));
});
