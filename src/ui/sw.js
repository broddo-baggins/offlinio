/**
 * Offlinio Service Worker
 * 
 * Provides offline capabilities for the PWA:
 * - Cache management for UI assets
 * - Background download progress monitoring
 * - Offline page serving
 * - Push notifications for download completion
 */

const CACHE_NAME = 'offlinio-v1.0.0';
const STATIC_CACHE_URLS = [
  '/ui/',
  '/ui/index.html',
  '/ui/app.js',
  '/ui/mobile.css',
  '/manifest.json',
  '/ui/icons/icon-192x192.png',
  '/ui/icons/icon-512x512.png'
];

const API_CACHE_URLS = [
  '/api/downloads',
  '/mobile/downloads'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Offlinio SW: Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Offlinio SW: Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName.startsWith('offlinio-') && cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('Offlinio SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Take control of all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method !== 'GET') {
    return; // Don't cache non-GET requests
  }

  // API requests - cache with network-first strategy
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/mobile/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // File downloads - never cache, always network
  if (url.pathname.startsWith('/files/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return offline indicator for failed file requests
          return new Response(
            JSON.stringify({ error: 'File not available offline' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static assets - cache-first strategy
  if (STATIC_CACHE_URLS.some(url => request.url.includes(url)) || 
      request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(
      cacheFirstStrategy(request)
    );
    return;
  }

  // Everything else - network-first with cache fallback
  event.respondWith(
    networkFirstStrategy(request)
  );
});

// Background sync for download management
self.addEventListener('sync', event => {
  if (event.tag === 'download-sync') {
    event.waitUntil(syncDownloadStatus());
  }
});

// Push notifications for download completion
self.addEventListener('push', event => {
  const options = {
    body: 'Your download has completed!',
    icon: '/ui/icons/icon-192x192.png',
    badge: '/ui/icons/badge-72x72.png',
    tag: 'download-complete',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Downloads',
        icon: '/ui/icons/view-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/ui/icons/dismiss-96x96.png'
      }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = `"${data.title}" download completed!`;
    options.data = data;
  }

  event.waitUntil(
    self.registration.showNotification('Offlinio Download Complete', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    // Open downloads page
    event.waitUntil(
      clients.openWindow('/ui/?tab=downloads')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes('/ui/')) {
              return client.focus();
            }
          }
          // Otherwise open new window
          return clients.openWindow('/ui/');
        })
    );
  }
});

// Message handling for manual cache updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urls))
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        })
    );
  }
});

// Cache strategies
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.url.includes('/api/')) {
      // Cache API responses for offline access
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('Network request failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/ui/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Background download status sync
async function syncDownloadStatus() {
  try {
    const response = await fetch('/mobile/downloads?limit=50&fields=compact');
    if (response.ok) {
      const data = await response.json();
      
      // Check for completed downloads since last sync
      const completedDownloads = data.items.filter(item => 
        item.status === 'completed' && 
        !isDownloadNotified(item.id)
      );
      
      // Send notifications for new completions
      for (const download of completedDownloads) {
        await self.registration.showNotification('Download Complete', {
          body: `"${download.title}" is ready to watch!`,
          icon: '/ui/icons/icon-192x192.png',
          tag: `download-${download.id}`,
          data: { downloadId: download.id, title: download.title }
        });
        
        markDownloadNotified(download.id);
      }
    }
  } catch (error) {
    console.error('Download sync failed:', error);
  }
}

// Simple storage for notification tracking (in-memory)
const notifiedDownloads = new Set();

function isDownloadNotified(downloadId) {
  return notifiedDownloads.has(downloadId);
}

function markDownloadNotified(downloadId) {
  notifiedDownloads.add(downloadId);
}

console.log('Offlinio Service Worker initialized');
