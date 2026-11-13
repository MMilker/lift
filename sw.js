// Offline service worker. The build (vite.config.ts) swaps in the file list and a version stamp.
// Plain JavaScript on purpose: it runs in the browser's background thread, outside the app bundle.
const VERSION = "1794593712455"
const CACHE = 'lift-' + VERSION
const PRECACHE = ["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./assets/index-7KngZaBf.css","./assets/index-JapJA1dC.js"]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lift-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Opening the app: always serve the saved page so it starts with no internet.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .match('./index.html')
        .then((hit) => hit || caches.match('./'))
        .then((hit) => hit || fetch(request)),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
