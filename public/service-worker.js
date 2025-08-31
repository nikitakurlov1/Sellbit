const CACHE_NAME = 'crypto-exchange-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Файлы для кэширования при установке
const STATIC_FILES = [
  '/',
  '/index.html',
  '/home.html',
  '/coins.html',
  '/coin.html',
  '/coininfo.html',
  '/crmcoindetal.html',
  '/Buy.html',
  '/Sale.html',
  '/Dep.html',
  '/vivod.html',
  '/User.html',
  '/setting.html',
  '/requisites.html',
  '/support.html',
  '/news.html',
  '/splash.html',
  '/styles.css',
  '/coins.css',
  '/coin-styles.css',
  '/coininfo.css',
  '/crmcoindetal.css',
  '/Buy.css',
  '/Sale.css',
  '/Dep.css',
  '/vivod.css',
  '/User.css',
  '/setting.css',
  '/requisites.css',
  '/support.css',
  '/news.css',
  '/script.js',
  '/home.js',
  '/coins.js',
  '/coin.js',
  '/coininfo.js',
  '/crmcoindetal.js',
  '/Buy.js',
  '/Sale.js',
  '/Dep.js',
  '/vivod.js',
  '/User.js',
  '/setting.js',
  '/requisites.js',
  '/support.js',
  '/news.js',
  '/api-utils.js',
  '/balance-sync.js',
  '/logos.js',
  '/History.js',
  '/logout.js',
  '/table.js',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icon-192.svg',
  '/icon-512.svg',
  '/logo.svg',
  '/logo-small.svg',
  '/manifest.json',
  '/offline.html'
];

// Установка service worker и кэширование статических файлов
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Error caching static files:', error);
      })
  );
});

// Активация service worker и очистка старых кэшей
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Перехват запросов и стратегия кэширования
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем запросы к внешним API и CDN
  if (url.origin !== self.location.origin) {
    return;
  }

  // Стратегия для HTML файлов: Network First, затем Cache
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Клонируем ответ для кэширования
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Если запрос к главной странице, показываем offline.html
          if (request.url === self.location.origin + '/') {
            return caches.match('/offline.html');
          }
          return caches.match(request);
        })
    );
    return;
  }

  // Стратегия для статических ресурсов: Cache First, затем Network
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              // Кэшируем только успешные ответы
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }

  // Для остальных запросов: Network First
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Обработка push-уведомлений (для будущего использования)
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');
  // Здесь можно добавить логику push-уведомлений
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Периодическая синхронизация (для обновления данных)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync');
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Функция для фоновой синхронизации
async function doBackgroundSync() {
  try {
    // Здесь можно добавить логику синхронизации данных
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}
