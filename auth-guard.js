(function () {
  const TOKEN_KEY = 'accessToken';
  const PUBLIC_PAGES = new Set(['auth.html']);
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

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
})();
