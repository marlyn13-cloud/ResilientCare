// ResilientCare Service Worker
// Handles caching, offline functionality, and background sync

const CACHE_NAME = 'resilientcare-v1';
const STATIC_ASSETS = [
  '/ResilientCare/',
  '/ResilientCare/index.html',
  '/ResilientCare/style.css',
  '/ResilientCare/script.js',
  '/ResilientCare/insights.html',
  '/ResilientCare/history.html',
  '/ResilientCare/settings.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Outfit:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@xenova/transformers/dist/transformers.min.js'
];

// Install event: cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Some assets failed to cache:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        console.log('[Service Worker] Serving from cache:', event.request.url);
        return response;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.log('[Service Worker] Fetch failed:', error);
          return caches.match('/ResilientCare/index.html').catch(() => {
            return new Response(
              'Offline - ResilientCare is not available for this page',
              { status: 503, statusText: 'Service Unavailable', headers: new Headers({ 'Content-Type': 'text/plain' }) }
            );
          });
        });
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  const options = {
    body: event.data ? event.data.text() : 'Check in with yourself',
    icon: '/ResilientCare/icon-192.png',
    badge: '/ResilientCare/icon-192.png',
    vibrate: [100, 50, 100],
    tag: 'resilientcare-notification',
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification('ResilientCare', options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url.includes('/ResilientCare/')) {
          return windowClients[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/ResilientCare/');
      }
    })
  );
});

// Background sync for session data
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);
  if (event.tag === 'sync-sessions') {
    event.waitUntil(syncSessions());
  }
});

function syncSessions() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ResilientCareDB', 1);
    request.onsuccess = function (event) {
      const db = event.target.result;
      const tx = db.transaction('pendingSessions', 'readonly');
      const store = tx.objectStore('pendingSessions');
      const allSessions = store.getAll();

      allSessions.onsuccess = function () {
        const sessions = allSessions.result;
        console.log('[Service Worker] Found', sessions.length, 'sessions to sync');
        resolve();
      };
    };
    request.onerror = function () {
      resolve();
    };
  });
}

// Periodic background sync (check-in reminders)
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync triggered:', event.tag);
  if (event.tag === 'check-in-reminder') {
    event.waitUntil(showCheckInReminder());
  }
});

function showCheckInReminder() {
  return self.registration.showNotification('Time for a Check-in', {
    body: 'Your wellbeing matters. Take a moment to vent or reflect.',
    icon: '/ResilientCare/icon-192.png',
    badge: '/ResilientCare/icon-192.png',
    tag: 'check-in-reminder',
    requireInteraction: true,
    actions: [
      { action: 'vent', title: 'Start Venting' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
}

console.log('[Service Worker] Loaded and ready');
