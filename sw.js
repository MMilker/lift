// Offline service worker. The build (vite.config.ts) swaps in the file list and a version stamp.
// Plain JavaScript on purpose: it runs in the browser's background thread, outside the app bundle.
const VERSION = "1795136680684"
const CACHE = 'lift-' + VERSION
const PRECACHE = ["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./assets/index-qIl2CY-g.css","./assets/index-BIgsqNoE.js"]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // 'reload' = fetch every file fresh from the server. Without it the browser may hand over a copy it
      // kept from minutes ago (the host lets it reuse files for 10 minutes), so a new version got saved
      // with the OLD front page and the phone stayed on the previous version.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
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

  // ignoreVary: match saved files by their address alone. Some hosts mark files "Vary: Origin", and the
  // app's own script and style requests then looked different from the saved copies, so with no internet
  // they were not found until the app had been opened twice online.
  const saved = (what) => caches.match(what, { ignoreVary: true })

  // Opening the app: always serve the saved page so it starts with no internet.
  if (request.mode === 'navigate') {
    event.respondWith(
      saved('./index.html')
        .then((hit) => hit || saved('./'))
        .then((hit) => hit || fetch(request)),
    )
    return
  }

  event.respondWith(
    saved(request).then(
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
