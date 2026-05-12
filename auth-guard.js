(function () {
  const TOKEN_KEY = 'accessToken';
  const REFRESH_KEY = 'refreshToken';
  const GUEST_KEY = 'guestMode';
  const API_BASE_KEY = 'apiBaseUrl';
  const PUBLIC_PAGES = new Set(['auth.html', 'index.html']);
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const apiBase = window.__APP_CONFIG?.API_BASE_URL || localStorage.getItem(API_BASE_KEY) || '/api';

  if (PUBLIC_PAGES.has(page)) return;

  if (localStorage.getItem(GUEST_KEY) === '1') return;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = 'auth.html';
    return;
  }

  function parseJwtPayload(value) {
    try {
      const parts = String(value).split('.');
      // Backend tokens are payload.signature (two segments); first segment is base64url JSON.
      const body = parts[0];
      if (!body) return null;
      const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  window.logoutUser = function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('currentUser');
    window.location.href = 'auth.html';
  };

  const payload = parseJwtPayload(token);
  if (!payload) {
    window.logoutUser();
    return;
  }
  if (payload.exp != null) {
    const exp = Number(payload.exp);
    const expMs = Number.isFinite(exp) && exp < 1e12 ? exp * 1000 : exp;
    if (Number.isFinite(expMs) && Date.now() >= expMs) {
      window.logoutUser();
      return;
    }
  }

  function tryRefreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return Promise.resolve(null);
    return fetch(`${apiBase}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
      .then(r => r.json().then(data => ({ r, data })).catch(() => ({ r, data: {} })))
      .then(({ r, data }) => {
        if (!r.ok || !data.accessToken) return null;
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        return data.accessToken;
      });
  }

  fetch(`${apiBase}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (res.ok) return;
      if (res.status !== 401) {
        window.logoutUser();
        return;
      }
      return tryRefreshAccessToken().then(newTok => {
        if (!newTok) {
          window.logoutUser();
          return;
        }
        return fetch(`${apiBase}/v1/auth/me`, {
          headers: { Authorization: `Bearer ${newTok}` }
        }).then(r2 => {
          if (!r2.ok) window.logoutUser();
        });
      });
    })
    .catch(() => {
      // If backend is unreachable, keep the UI available instead of hard logout loop.
    });
})();
