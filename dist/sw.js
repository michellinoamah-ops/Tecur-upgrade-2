/* Only an anonymous offline screen and fixed styling/icons are cached.
   No enquiries, photos, location, admin pages, API data or live listings. */
const CACHE = "tecur-offline-v5";
const SHELL = [
  "/offline/",
  "/assets/style.css",
  "/assets/tecur-logo.jpg",
  "/assets/app-icon-192.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const path of SHELL) {
        const response = await fetch(path, { cache: "reload", credentials: "omit" });
        if (!response.ok || response.redirected || new URL(response.url).pathname !== path)
          throw new Error("Offline asset unavailable");
        await cache.put(path, response);
      }
    }),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("tecur-offline-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin")) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match("/offline/")) ||
          new Response("You are offline. Reconnect and try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );
  } else if (SHELL.includes(url.pathname) && !url.search) {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
  }
});
