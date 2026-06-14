const API_URL = import.meta.env.VITE_API_URL;

/** Registra una visita al cargar el sitio (sin cookies, fire-and-forget). */
export function trackSiteVisit() {
  if (!API_URL) return;

  fetch(`${API_URL}/analytics/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
  }).catch(() => {});
}
