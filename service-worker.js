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
        // Continue even if some assets fail to cache
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
  // Skip cross-origin requests and certain methods
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Try cache first
    caches.match(event.request).then((response) => {
      if (response) {
        console.log('[Service Worker] Serving from cache:', event.request.url);
        return response;
      }

      // If not in cache, try network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cache successful responses for future use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.log('[Service Worker] Fetch failed; returning offline page if available:', error);
          // Return a custom offline response if available
          return caches.match('/ResilientCare/index.html').catch(() => {
            return new Response(
              'Sorry, ResilientCare is not available offline for this page.',
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
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%234a90e2%22 width=%22192%22 height=%22192%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%22100%22 font-weight=%22bold%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22central%22>RC</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%234a90e2%22 width=%22192%22 height=%22192%22/></svg>',
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
      // Focus existing window if open
      for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url === '/ResilientCare/') {
          return windowClients[i].focus();
        }
      }
      // Open new window if not already open
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

// Sync sessions with server when connection restored
function syncSessions() {
  return new Promise((resolve) => {
    // Get pending sessions from IndexedDB
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
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%234a90e2%22 width=%22192%22 height=%22192%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%22100%22 font-weight=%22bold%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22central%22>🧘</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%234a90e2%22 width=%22192%22 height=%22192%22/></svg>',
    tag: 'check-in-reminder',
    requireInteraction: true,
    actions: [
      { action: 'vent', title: 'Start Venting' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
}

console.log('[Service Worker] Loaded and ready');
