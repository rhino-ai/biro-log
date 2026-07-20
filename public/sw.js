const CACHE_NAME = 'biro-log-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - keep app-shell fresh, never cache Vite/dev dependency chunks
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept OAuth flows — they must always hit the network
  if (
    url.pathname.startsWith('/~oauth') ||
    url.hostname.includes('oauth.lovable.app') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('appleid.apple.com')
  ) {
    return;
  }

  // Vite dependency chunks must never be served stale, or React can be duplicated.
  if (
    url.pathname.startsWith('/node_modules/.vite/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Skip Supabase API requests (need fresh data)
  if (event.request.url.includes('supabase')) return;
  
  // Skip external audio files
  if (event.request.url.includes('mixkit.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic' && STATIC_ASSETS.includes(url.pathname)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') return caches.match('/');
        return new Response('Offline', { status: 503 });
      }))
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Biro-log Reminder';
  const isChat = typeof data.tag === 'string' && (data.tag.startsWith('dm-') || data.tag.startsWith('grp-') || data.tag.startsWith('invite-') || data.tag.startsWith('chat-'));
  const options = {
    body: data.body || 'You have a task reminder!',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: isChat ? [300, 120, 300, 120, 300] : [200, 100, 200],
    tag: data.tag || 'default',
    renotify: data.renotify !== false,
    silent: false,
    timestamp: Date.now(),
    data: { url: data.url || '/' },
    requireInteraction: !!data.requireInteraction,
  };

  event.waitUntil((async () => {
    // If the app is open & focused on the target, skip the OS notification
    // and just ping the client so it can play an in-app sound.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const focused = wins.find((w) => w.focused);
    if (focused) {
      try { focused.postMessage({ type: 'push', payload: { title, body: options.body, url: options.data.url, tag: options.tag } }); } catch {}
    }
    await self.registration.showNotification(title, options);
  })());
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.navigate(target); return w.focus(); }
      }
      return clients.openWindow(target);
    })
  );
});
