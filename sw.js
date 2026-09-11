/* ==========================================================================
   ANCLA - Service Worker (Offline-First Cache Engine)
   Guarantees 100% functionality without internet connection.
   ========================================================================== */

const CACHE_NAME = "ancla-cache-v3";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/design-tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/crisis-mode.css",
  "./css/calm-kit.css",
  "./js/config.js",
  "./js/db/storage.js",
  "./js/crypto/encryption.js",
  "./js/auth/biometric.js",
  "./js/audio/sound-engine.js",
  "./js/modules/sos.js",
  "./js/modules/crisis-mode.js",
  "./js/modules/safety-plan.js",
  "./js/modules/calm-kit.js",
  "./js/modules/mood-tracker.js",
  "./js/modules/daily-milestones.js",
  "./js/modules/anchors.js",
  "./js/modules/therapist-portal.js",
  "./js/app.js"
];

// Install Event: pre-cache all core application assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching core offline assets for Ancla (v3)...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("[SW] Removing outdated cache:", name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First strategy with fallback to Network
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

// Handle click on background notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("./");
      }
    })
  );
});
