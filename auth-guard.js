(function () {
  const TOKEN_KEY = 'accessToken';
  const API_BASE_KEY = 'apiBaseUrl';
  const PUBLIC_PAGES = new Set(['auth.html']);
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const apiBase = localStorage.getItem(API_BASE_KEY) || 'http://localhost:8080';

  if (PUBLIC_PAGES.has(page)) return;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = 'auth.html';
    return;
  }

  window.logoutUser = function logoutUser() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'auth.html';
  };

  fetch(`${apiBase}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => {
    if (!res.ok) {
      window.logoutUser();
    }
  }).catch(() => {
    // If backend is unreachable, keep the UI available instead of hard logout loop.
  });
})();
