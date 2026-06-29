// Service worker minimal (Phase 0). Cache + Web Push arriveront en Phase 3.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
