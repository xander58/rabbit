const CACHE_NAME = 'rabbit-v1';

self.addEventListener('install', event => {
  // Просто активируем, не кэшируем ничего при установке
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Очистка старых кэшей
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Не кэшируем API запросы к Google Script
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  // Кэшируем только статические файлы
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
      .catch(() => {
        // Если офлайн и нет в кэше
        return new Response('Offline');
      })
  );
});
