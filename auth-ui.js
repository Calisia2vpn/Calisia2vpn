(function () {
  const API_BASE_KEY = 'apiBaseUrl';
  const TOKEN_KEY = 'accessToken';
  const USER_KEY = 'currentUser';
  const GUEST_KEY = 'guestMode';

  function apiBase() {
    return window.__APP_CONFIG?.API_BASE_URL || localStorage.getItem(API_BASE_KEY) || '/api';
  }

  function setMessage(text, type = '') {
    const node = document.getElementById('authMessage');
    if (!node) return;
    node.className = `auth-message ${type}`.trim();
    node.textContent = text;
  }

  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tabLogin')?.classList.toggle('active', isLogin);
    document.getElementById('tabRegister')?.classList.toggle('active', !isLogin);
    document.getElementById('loginForm')?.classList.toggle('active', isLogin);
    document.getElementById('registerForm')?.classList.toggle('active', !isLogin);
    setMessage('');
  }

  async function callApi(path, body) {
    const res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'خطا در ارتباط با سرور');
    return data;
  }

  function persistAuth(payload) {
    localStorage.removeItem(GUEST_KEY);
    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }

  function parseJwtPayload(value) {
    try {
      const body = String(value || '').split('.')[0];
      const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  async function validateCurrentSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    const payload = parseJwtPayload(token);
    if (!payload || (payload.exp && Date.now() > Number(payload.exp))) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return false;
    }
    try {
      const res = await fetch(`${apiBase()}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('invalid');
      return true;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return false;
    }
  }

  async function onRegister(event) {
    event.preventDefault();
    try {
      const payload = {
        fullName: document.getElementById('regName').value.trim(),
        mobile: document.getElementById('regMobile').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value
      };
      const data = await callApi('/v1/auth/register', payload);
      persistAuth(data);
      setMessage('ثبت‌نام انجام شد. در حال ورود...', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } catch (error) {
      setMessage(error.message, 'error');
    }
  }

  async function onLogin(event) {
    event.preventDefault();
    try {
      const payload = {
        login: document.getElementById('loginInput').value.trim(),
        password: document.getElementById('loginPassword').value
      };
      const data = await callApi('/v1/auth/login', payload);
      persistAuth(data);
      setMessage('ورود موفق. انتقال به داشبورد...', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 400);
    } catch (error) {
      setMessage(error.message, 'error');
    }
  }

  function onApiHint(event) {
    event.preventDefault();
    const current = apiBase();
    const next = window.prompt('آدرس API را وارد کنید', current);
    if (!next) return;
    localStorage.setItem(API_BASE_KEY, next.replace(/\/$/, ''));
    setMessage('آدرس API ذخیره شد ✅', 'success');
  }

  function onSkipAuth() {
    localStorage.setItem(GUEST_KEY, '1');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }

  window.addEventListener('load', async () => {
    if (localStorage.getItem(GUEST_KEY) === '1') {
      window.location.href = 'index.html';
      return;
    }
    if (await validateCurrentSession()) {
      window.location.href = 'index.html';
      return;
    }

    document.getElementById('tabLogin')?.addEventListener('click', () => switchTab('login'));
    document.getElementById('tabRegister')?.addEventListener('click', () => switchTab('register'));
    document.getElementById('registerForm')?.addEventListener('submit', onRegister);
    document.getElementById('loginForm')?.addEventListener('submit', onLogin);
    document.getElementById('apiHintLink')?.addEventListener('click', onApiHint);
    document.getElementById('skipAuthBtn')?.addEventListener('click', onSkipAuth);
  });
})();
