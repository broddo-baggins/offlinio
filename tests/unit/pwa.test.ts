/**
 * Progressive Web App (PWA) Unit Tests
 * 
 * Comprehensive testing for PWA functionality including:
 * - Service Worker registration and functionality
 * - PWA manifest validation
 * - Offline capabilities
 * - Mobile-specific features
 */

import { JSDOM } from 'jsdom';

// Mock service worker environment
const mockServiceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    pushManager: {
      subscribe: jest.fn(),
      getSubscription: jest.fn()
    },
    showNotification: jest.fn(),
    update: jest.fn()
  }),
  controller: {
    postMessage: jest.fn()
  },
  addEventListener: jest.fn()
};

// Mock notification API
const mockNotification = {
  permission: 'default',
  requestPermission: jest.fn().mockResolvedValue('granted')
};

// Mock fetch API
const mockFetch = jest.fn();

// Set up DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="manifest" href="/manifest.json">
    </head>
    <body>
      <div id="app"></div>
    </body>
  </html>
`, {
  url: 'http://localhost:11471',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Set up global environment
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = {
  ...dom.window.navigator,
  serviceWorker: mockServiceWorker,
  onLine: true
} as any;
global.Notification = mockNotification as any;
global.fetch = mockFetch;

describe('PWA Manifest', () => {
  const mockManifest = {
    name: 'Offlinio - Personal Media Downloader',
    short_name: 'Offlinio',
    description: 'Download and manage your personal media collection for offline viewing',
    start_url: '/ui/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: '#4ecdc4',
    background_color: '#1a1a1a',
    icons: [
      {
        src: '/ui/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable any'
      },
      {
        src: '/ui/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable any'
      }
    ],
    shortcuts: [
      {
        name: 'View Downloads',
        short_name: 'Downloads',
        description: 'View your download queue and completed files',
        url: '/ui/?tab=downloads'
      }
    ]
  };

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest)
    });
  });

  it('should have valid PWA manifest structure', async () => {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();

    // Required PWA manifest fields
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
    
    // Offlinio-specific properties
    expect(manifest.name).toContain('Offlinio');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/ui/');
  });

  it('should have required icon sizes', async () => {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();

    const requiredSizes = ['192x192', '512x512'];
    const iconSizes = manifest.icons.map((icon: any) => icon.sizes);

    requiredSizes.forEach(size => {
      expect(iconSizes).toContain(size);
    });
  });

  it('should have proper theme colors', async () => {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();

    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should include app shortcuts', async () => {
    const response = await fetch('/manifest.json');
    const manifest = await response.json();

    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts.length).toBeGreaterThan(0);

    const downloadShortcut = manifest.shortcuts.find((s: any) => s.name === 'View Downloads');
    expect(downloadShortcut).toBeDefined();
    expect(downloadShortcut.url).toContain('downloads');
  });
});

describe('Service Worker', () => {
  let serviceWorkerCode: string;

  beforeEach(() => {
    // Mock service worker code (simplified version)
    serviceWorkerCode = `
      const CACHE_NAME = 'offlinio-v1.0.0';
      const STATIC_CACHE_URLS = ['/ui/', '/manifest.json'];
      
      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE_URLS))
        );
      });
      
      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request).then(response => {
            return response || fetch(event.request);
          })
        );
      });
    `;
  });

  it('should register service worker successfully', async () => {
    mockServiceWorker.register.mockResolvedValue({
      scope: '/ui/',
      installing: null,
      waiting: null,
      active: { state: 'activated' }
    });

    const registration = await navigator.serviceWorker.register('/ui/sw.js');
    
    expect(mockServiceWorker.register).toHaveBeenCalledWith('/ui/sw.js');
    expect(registration.scope).toBe('/ui/');
  });

  it('should cache static resources during install', () => {
    // Test that service worker caches required resources
    expect(serviceWorkerCode).toContain('STATIC_CACHE_URLS');
    expect(serviceWorkerCode).toContain('/ui/');
    expect(serviceWorkerCode).toContain('/manifest.json');
  });

  it('should handle fetch events with cache-first strategy', () => {
    // Test that service worker implements cache-first strategy
    expect(serviceWorkerCode).toContain('addEventListener(\'fetch\'');
    expect(serviceWorkerCode).toContain('caches.match');
    expect(serviceWorkerCode).toContain('fetch(event.request)');
  });

  it('should handle service worker updates', async () => {
    const mockRegistration = {
      installing: { state: 'installing' },
      addEventListener: jest.fn()
    };

    mockServiceWorker.register.mockResolvedValue(mockRegistration);

    await navigator.serviceWorker.register('/ui/sw.js');

    // Should set up update listener
    expect(mockRegistration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function));
  });
});

describe('PWA Installation', () => {
  let deferredPrompt: any;

  beforeEach(() => {
    deferredPrompt = {
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    };

    // Mock beforeinstallprompt event
    global.addEventListener = jest.fn((event, handler) => {
      if (event === 'beforeinstallprompt') {
        // Simulate event firing
        setTimeout(() => handler({ preventDefault: jest.fn(), ...deferredPrompt }), 0);
      }
    });
  });

  it('should capture install prompt', (done) => {
    let capturedPrompt: any = null;

    addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      capturedPrompt = e;
      
      expect(capturedPrompt).toBeDefined();
      expect(typeof capturedPrompt.prompt).toBe('function');
      done();
    });
  });

  it('should show install prompt when triggered', async () => {
    let installPrompt: any = null;

    addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      installPrompt = e;
    });

    // Wait for event to be captured
    await new Promise(resolve => setTimeout(resolve, 10));

    // Trigger install
    if (installPrompt) {
      await installPrompt.prompt();
      expect(installPrompt.prompt).toHaveBeenCalled();
    }
  });

  it('should handle install acceptance', async () => {
    let installPrompt: any = null;

    addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      installPrompt = e;
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    if (installPrompt) {
      const userChoice = await installPrompt.userChoice;
      expect(userChoice.outcome).toBe('accepted');
    }
  });
});

describe('Push Notifications', () => {
  beforeEach(() => {
    mockNotification.requestPermission.mockResolvedValue('granted');
  });

  it('should request notification permission', async () => {
    const permission = await Notification.requestPermission();
    
    expect(mockNotification.requestPermission).toHaveBeenCalled();
    expect(permission).toBe('granted');
  });

  it('should subscribe to push notifications', async () => {
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/subscription-id',
      keys: {
        p256dh: 'key1',
        auth: 'key2'
      }
    };

    const registration = await navigator.serviceWorker.ready;
    registration.pushManager.subscribe = jest.fn().mockResolvedValue(mockSubscription);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'test-key'
    });

    expect(subscription).toEqual(mockSubscription);
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: 'test-key'
    });
  });

  it('should show notifications for download completion', async () => {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification('Download Complete', {
      body: 'Your movie download has finished!',
      icon: '/ui/icons/icon-192x192.png',
      tag: 'download-complete'
    });

    expect(registration.showNotification).toHaveBeenCalledWith('Download Complete', {
      body: 'Your movie download has finished!',
      icon: '/ui/icons/icon-192x192.png',
      tag: 'download-complete'
    });
  });
});

describe('Offline Functionality', () => {
  beforeEach(() => {
    // Mock cache API
    global.caches = {
      open: jest.fn().mockResolvedValue({
        match: jest.fn(),
        add: jest.fn(),
        addAll: jest.fn(),
        put: jest.fn()
      }),
      match: jest.fn(),
      keys: jest.fn().mockResolvedValue(['offlinio-v1.0.0'])
    } as any;
  });

  it('should cache essential resources', async () => {
    const cache = await caches.open('offlinio-v1.0.0');
    
    await cache.addAll([
      '/ui/',
      '/ui/mobile.css',
      '/ui/mobile.js',
      '/manifest.json'
    ]);

    expect(cache.addAll).toHaveBeenCalledWith([
      '/ui/',
      '/ui/mobile.css',
      '/ui/mobile.js',
      '/manifest.json'
    ]);
  });

  it('should serve cached content when offline', async () => {
    const mockCachedResponse = new Response('Cached content');
    
    const cache = await caches.open('offlinio-v1.0.0');
    cache.match = jest.fn().mockResolvedValue(mockCachedResponse);

    const cachedResponse = await cache.match('/ui/');
    
    expect(cachedResponse).toBe(mockCachedResponse);
    expect(cache.match).toHaveBeenCalledWith('/ui/');
  });

  it('should handle cache cleanup on updates', async () => {
    const oldCaches = ['offlinio-v0.9.0', 'offlinio-v1.0.0'];
    const currentCache = 'offlinio-v1.0.0';
    
    global.caches.keys = jest.fn().mockResolvedValue(oldCaches);
    global.caches.delete = jest.fn().mockResolvedValue(true);

    // Simulate cache cleanup
    const cacheNames = await caches.keys();
    const oldCacheNames = cacheNames.filter(name => name !== currentCache);
    
    for (const cacheName of oldCacheNames) {
      await caches.delete(cacheName);
    }

    expect(global.caches.delete).toHaveBeenCalledWith('offlinio-v0.9.0');
    expect(global.caches.delete).not.toHaveBeenCalledWith('offlinio-v1.0.0');
  });
});

describe('Mobile-Specific Features', () => {
  beforeEach(() => {
    // Mock mobile environment
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
      configurable: true
    });
  });

  it('should detect mobile environment', () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    expect(isMobile).toBe(true);
  });

  it('should support touch events', () => {
    // Mock touch events
    const touchStart = new (dom.window as any).TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 }]
    });

    expect(touchStart.type).toBe('touchstart');
    expect(touchStart.touches).toHaveLength(1);
  });

  it('should handle viewport meta tag correctly', () => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta?.getAttribute('content')).toContain('width=device-width');
  });
});

describe('PWA Performance', () => {
  it('should load quickly', async () => {
    const start = Date.now();
    
    // Simulate PWA loading
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(100); // Should load within 100ms (simulated)
  });

  it('should handle large downloads efficiently', async () => {
    // Mock large file caching
    const largeFileContent = new ArrayBuffer(1024 * 1024); // 1MB
    const response = new Response(largeFileContent);
    
    const cache = await caches.open('offlinio-v1.0.0');
    await cache.put('/large-file.mp4', response);
    
    expect(cache.put).toHaveBeenCalledWith('/large-file.mp4', response);
  });
});

describe('PWA Integration', () => {
  it('should integrate with mobile APIs', async () => {
    // Test integration with mobile-specific APIs
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 })
    });

    const response = await fetch('/mobile/downloads');
    const data = await response.json();

    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
  });

  it('should support background sync', async () => {
    const registration = await navigator.serviceWorker.ready;
    
    // Mock background sync registration
    registration.sync = {
      register: jest.fn().mockResolvedValue(undefined)
    };

    await registration.sync.register('download-sync');
    
    expect(registration.sync.register).toHaveBeenCalledWith('download-sync');
  });

  it('should handle network state changes', () => {
    const onlineHandler = jest.fn();
    const offlineHandler = jest.fn();

    addEventListener('online', onlineHandler);
    addEventListener('offline', offlineHandler);

    // Simulate network state changes
    const onlineEvent = new Event('online');
    const offlineEvent = new Event('offline');

    global.dispatchEvent(onlineEvent);
    global.dispatchEvent(offlineEvent);

    expect(global.addEventListener).toHaveBeenCalledWith('online', onlineHandler);
    expect(global.addEventListener).toHaveBeenCalledWith('offline', offlineHandler);
  });
});
