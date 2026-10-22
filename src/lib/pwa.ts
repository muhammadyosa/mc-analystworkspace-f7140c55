/** Only the published, top-level app may own an app-shell worker. */
export function isAppWorkerAllowed(
  production: boolean,
  hostname: string,
  embedded: boolean,
  search: string,
) {
  return (
    production &&
    !embedded &&
    !new URLSearchParams(search).has("sw") &&
    !/^(id-preview--|preview--)/.test(hostname) &&
    !["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    )
  );
}

export async function initializeAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const allowed = isAppWorkerAllowed(
    import.meta.env.PROD,
    location.hostname,
    window.self !== window.top,
    location.search,
  );
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (!allowed) {
    await Promise.all(
      registrations
        .filter((registration) =>
          [registration.active, registration.waiting, registration.installing].some(
            (worker) => worker && new URL(worker.scriptURL).pathname === "/sw.js",
          ),
        )
        .map((registration) => registration.unregister()),
    );
  }
  // Retire only the previous app's named cache; leave messaging caches alone.
  if ("caches" in window) await caches.delete("mcaw-v1");
  if (allowed) await navigator.serviceWorker.register("/sw.js");
}
