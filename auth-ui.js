(function () {
  const API_BASE_KEY = 'apiBaseUrl';
  const TOKEN_KEY = 'accessToken';
  const USER_KEY = 'currentUser';
  const GUEST_KEY = 'guestMode';

  const el = {};

  function apiBase() {
    return window.__APP_CONFIG?.API_BASE_URL || localStorage.getItem(API_BASE_KEY) || '/api';
  }

  function currentLanguage() {
    return localStorage.getItem('preferredLanguage') === 'en' ? 'en' : 'fa';
  }

  function t(fa, en) {
    return currentLanguage() === 'en' ? en : fa;
  }

  function setMessage(text, type = '') {
    if (!el.message) return;
    el.message.className = `auth-message ${type}`.trim();
    el.message.textContent = text;
  }

  function setSubmitting(form, isSubmitting) {
    form?.classList.toggle('is-loading', isSubmitting);
    form?.querySelectorAll('input, button').forEach(node => {
      node.disabled = isSubmitting;
    });
  }

  function normalizeMobile(value) {
    const digits = String(value || '').replace(/\D+/g, '');
    if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`;
    if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
    return digits;
  }

  function validateRegister(payload) {
    if (!payload.fullName || payload.fullName.length < 3) {
      return t('نام و نام خانوادگی معتبر وارد کنید.', 'Enter a valid full name.');
    }
    if (!/^09\d{9}$/.test(normalizeMobile(payload.mobile))) {
      return t('شماره موبایل معتبر وارد کنید.', 'Enter a valid mobile number.');
    }
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return t('ایمیل معتبر وارد کنید.', 'Enter a valid email address.');
    }
    if (!payload.password || payload.password.length < 8) {
      return t('رمز عبور باید حداقل ۸ کاراکتر باشد.', 'Password must be at least 8 characters.');
    }
    return '';
  }

  function switchTab(tab) {
    const isLogin = tab === 'login';
    el.tabLogin?.classList.toggle('active', isLogin);
    el.tabRegister?.classList.toggle('active', !isLogin);
    el.loginForm?.classList.toggle('active', isLogin);
    el.registerForm?.classList.toggle('active', !isLogin);
    document.body.dataset.authTab = tab;
    setMessage('');
  }

  async function callApi(path, body) {
    const res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || t('خطا در ارتباط با سرور', 'Server communication error'));
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
    const payload = {
      fullName: el.regName.value.trim(),
      mobile: normalizeMobile(el.regMobile.value.trim()),
      email: el.regEmail.value.trim(),
      password: el.regPassword.value
    };

    const error = validateRegister(payload);
    if (error) {
      setMessage(error, 'error');
      return;
    }

    setSubmitting(el.registerForm, true);
    try {
      const data = await callApi('/v1/auth/register', payload);
      persistAuth(data);
      setMessage(t('ثبت‌نام انجام شد. در حال ورود...', 'Account created. Redirecting...'), 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } catch (apiError) {
      setMessage(apiError.message, 'error');
    } finally {
      setSubmitting(el.registerForm, false);
    }
  }

  async function onLogin(event) {
    event.preventDefault();
    const payload = {
      login: el.loginInput.value.trim(),
      password: el.loginPassword.value
    };

    if (!payload.login || !payload.password) {
      setMessage(t('اطلاعات ورود را کامل کنید.', 'Complete the login fields.'), 'error');
      return;
    }

    setSubmitting(el.loginForm, true);
    try {
      const data = await callApi('/v1/auth/login', payload);
      persistAuth(data);
      setMessage(t('ورود موفق. انتقال به داشبورد...', 'Login successful. Redirecting...'), 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 400);
    } catch (apiError) {
      setMessage(apiError.message, 'error');
    } finally {
      setSubmitting(el.loginForm, false);
    }
  }

  function onApiHint(event) {
    event.preventDefault();
    const current = apiBase();
    const next = window.prompt(t('آدرس API را وارد کنید', 'Enter API base URL'), current);
    if (!next) return;
    localStorage.setItem(API_BASE_KEY, next.replace(/\/$/, ''));
    setMessage(t('آدرس API ذخیره شد ✅', 'API base URL saved ✅'), 'success');
  }

  function onSkipAuth() {
    localStorage.setItem(GUEST_KEY, '1');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
  }

  function cacheElements() {
    el.tabLogin = document.getElementById('tabLogin');
    el.tabRegister = document.getElementById('tabRegister');
    el.loginForm = document.getElementById('loginForm');
    el.registerForm = document.getElementById('registerForm');
    el.loginInput = document.getElementById('loginInput');
    el.loginPassword = document.getElementById('loginPassword');
    el.regName = document.getElementById('regName');
    el.regMobile = document.getElementById('regMobile');
    el.regEmail = document.getElementById('regEmail');
    el.regPassword = document.getElementById('regPassword');
    el.message = document.getElementById('authMessage');
    el.apiHintLink = document.getElementById('apiHintLink');
    el.skipAuthBtn = document.getElementById('skipAuthBtn');
  }

  window.addEventListener('load', async () => {
    cacheElements();

    if (localStorage.getItem(GUEST_KEY) === '1') {
      window.location.href = 'index.html';
      return;
    }
    if (await validateCurrentSession()) {
      window.location.href = 'index.html';
      return;
    }

    el.tabLogin?.addEventListener('click', () => switchTab('login'));
    el.tabRegister?.addEventListener('click', () => switchTab('register'));
    el.registerForm?.addEventListener('submit', onRegister);
    el.loginForm?.addEventListener('submit', onLogin);
    el.apiHintLink?.addEventListener('click', onApiHint);
    el.skipAuthBtn?.addEventListener('click', onSkipAuth);
    switchTab('login');
  });
})();
