(function () {
  const API_BASE_KEY = 'apiBaseUrl';
  const TOKEN_KEY = 'accessToken';
  const USER_KEY = 'currentUser';

  function apiBase() {
    return localStorage.getItem(API_BASE_KEY) || 'http://localhost:8080';
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
    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }

  async function validateCurrentSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
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

  window.addEventListener('load', async () => {
    if (await validateCurrentSession()) {
      window.location.href = 'index.html';
      return;
    }

    document.getElementById('tabLogin')?.addEventListener('click', () => switchTab('login'));
    document.getElementById('tabRegister')?.addEventListener('click', () => switchTab('register'));
    document.getElementById('registerForm')?.addEventListener('submit', onRegister);
    document.getElementById('loginForm')?.addEventListener('submit', onLogin);
    document.getElementById('apiHintLink')?.addEventListener('click', onApiHint);
  });
})();
