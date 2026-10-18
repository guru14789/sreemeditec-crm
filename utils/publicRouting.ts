/**
 * Helper to detect public routes (e.g. Employee QR scan or Public Service Form)
 * without requiring CRM login or initializing full DataProvider.
 */

export function getPublicProfileId(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check URL query parameters: ?employee=... or ?emp=... or ?profile=...
  const searchParams = new URLSearchParams(window.location.search);
  const param = searchParams.get('employee') || searchParams.get('emp') || searchParams.get('profile');
  if (param && param.trim()) {
    const clean = decodeURIComponent(param.trim());
    if (clean !== 'null' && clean !== 'undefined') return clean;
  }

  // 2. Check URL hash (e.g. #/employee/:id, #employee=:id, #/?employee=:id)
  if (window.location.hash) {
    const hash = window.location.hash;
    const hashQueryIdx = hash.indexOf('?');
    if (hashQueryIdx !== -1) {
      const hashParams = new URLSearchParams(hash.substring(hashQueryIdx));
      const hashParam = hashParams.get('employee') || hashParams.get('emp') || hashParams.get('profile');
      if (hashParam && hashParam.trim()) {
        const clean = decodeURIComponent(hashParam.trim());
        if (clean !== 'null' && clean !== 'undefined') return clean;
      }
    }

    const hashMatch = hash.match(/#\/?(?:employee|emp)\/([a-zA-Z0-9_\-\.]+)/i) ||
                      hash.match(/#\/?employee=([a-zA-Z0-9_\-\.]+)/i);
    if (hashMatch && hashMatch[1] && hashMatch[1].trim()) {
      const clean = decodeURIComponent(hashMatch[1].trim());
      if (clean !== 'null' && clean !== 'undefined') return clean;
    }
  }

  // 3. Check pathname: /employee/:id or /emp/:id
  const pathMatch = window.location.pathname.match(/\/(?:employee|emp)\/([a-zA-Z0-9_\-\.]+)/i);
  if (pathMatch && pathMatch[1] && pathMatch[1].trim()) {
    const clean = decodeURIComponent(pathMatch[1].trim());
    if (clean !== 'null' && clean !== 'undefined' && clean !== 'employee' && clean !== 'emp') {
      return clean;
    }
  }

  return null;
}
