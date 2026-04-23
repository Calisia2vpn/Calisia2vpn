(() => {
  const STORAGE_KEY = 'preferredLanguage';
  const defaultLanguage = 'en';
  const textSourceMap = new WeakMap();
  const attrSourceMap = new WeakMap();
  const titleSource = { value: document.title };
  const translationCache = new Map();
  let isApplyingLanguage = false;
  let observerDebounceTimer = null;
  let suppressMutationUntil = 0;

  const customTranslations = {
    'ورود': 'Login',
    'ثبت‌نام': 'Sign Up',
    'ورود / ثبت‌نام': 'Login / Sign Up',
    'ورود و ثبت‌نام': 'Login & Sign Up',
    'بازگشت به داشبورد': 'Back to Dashboard',
    'خانه داشبورد': 'Dashboard Home',
    'خروج از حساب': 'Log Out',
    'تم تاریک': 'Dark Mode',
    'تم روشن': 'Light Mode',
    'تسک‌ها': 'Tasks',
    'عادت‌ها': 'Habits',
    'تقویم': 'Calendar',
    'اهداف': 'Goals',
    'یادداشت‌ها': 'Notes',
    'مدیتیشن': 'Meditation',
    'دارایی': 'Finance',
    'تغذیه': 'Nutrition',
    'جسم‌پرداز': 'Fitness',
    'روابط': 'Social',
    'اوقات شرعی': 'Prayer Times',
    'نماز بعدی': 'Next Prayer',
    'امروز': 'Today',
    'ذخیره': 'Save',
    'لغو': 'Cancel',
    'بازنشانی': 'Reset',
    'شروع': 'Start',
    'در حال بارگذاری...': 'Loading...',
    'تومان': 'Toman'
  };

  const translations = {
    ...(window.I18N_FA_TO_EN || {}),
    ...customTranslations
  };

  const enToFa = Object.fromEntries(
    Object.entries(translations).map(([fa, en]) => [en, fa])
  );

  const faMonthMap = {
    'فروردین': 'Farvardin',
    'اردیبهشت': 'Ordibehesht',
    'خرداد': 'Khordad',
    'تیر': 'Tir',
    'مرداد': 'Mordad',
    'شهریور': 'Shahrivar',
    'مهر': 'Mehr',
    'آبان': 'Aban',
    'آذر': 'Azar',
    'دی': 'Dey',
    'بهمن': 'Bahman',
    'اسفند': 'Esfand'
  };

  const faDayMap = {
    'شنبه': 'Saturday',
    'یکشنبه': 'Sunday',
    'دوشنبه': 'Monday',
    'سه‌شنبه': 'Tuesday',
    'چهارشنبه': 'Wednesday',
    'پنج‌شنبه': 'Thursday',
    'جمعه': 'Friday'
  };

  const enMonthMap = Object.fromEntries(Object.entries(faMonthMap).map(([fa, en]) => [en, fa]));
  const enDayMap = Object.fromEntries(Object.entries(faDayMap).map(([fa, en]) => [en, fa]));

  const faKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
  const enKeys = Object.keys(enToFa).sort((a, b) => b.length - a.length);
  const faMonthKeys = Object.keys(faMonthMap).sort((a, b) => b.length - a.length);
  const faDayKeys = Object.keys(faDayMap).sort((a, b) => b.length - a.length);
  const enMonthKeys = Object.keys(enMonthMap).sort((a, b) => b.length - a.length);
  const enDayKeys = Object.keys(enDayMap).sort((a, b) => b.length - a.length);

  function getCurrentLanguage() {
    let lang = defaultLanguage;
    try {
      lang = localStorage.getItem(STORAGE_KEY);
    } catch {
      lang = defaultLanguage;
    }
    return lang === 'en' || lang === 'fa' ? lang : defaultLanguage;
  }

  function rememberOriginalText(node) {
    if (!textSourceMap.has(node)) textSourceMap.set(node, node.nodeValue);
  }

  function rememberOriginalAttributes(element) {
    if (!attrSourceMap.has(element)) {
      attrSourceMap.set(element, {
        placeholder: element.getAttribute('placeholder'),
        title: element.getAttribute('title'),
        ariaLabel: element.getAttribute('aria-label'),
        value: element.getAttribute('value')
      });
    }
  }

  function replaceFromMap(text, map, keys) {
    let out = String(text);
    for (const key of keys) {
      if (!out.includes(key)) continue;
      out = out.split(key).join(map[key]);
    }
    return out;
  }

  function translateDigitsToEnglish(text) {
    return String(text).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  }

  function translateDigitsToPersian(text) {
    return String(text).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  }

  function translateText(value, targetLang) {
    const raw = String(value ?? '');
    if (!raw.trim()) return raw;

    const cacheKey = `${targetLang}::${raw}`;
    if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

    let out = raw;

    if (targetLang === 'en') {
      out = replaceFromMap(out, faMonthMap, faMonthKeys);
      out = replaceFromMap(out, faDayMap, faDayKeys);
      out = replaceFromMap(out, translations, faKeys);
      out = translateDigitsToEnglish(out);
      out = out.replace(/٪/g, '%');
    } else {
      out = replaceFromMap(out, enMonthMap, enMonthKeys);
      out = replaceFromMap(out, enDayMap, enDayKeys);
      out = replaceFromMap(out, enToFa, enKeys);
      out = translateDigitsToPersian(out);
      out = out.replace(/(?<=\d)%/g, '٪');
    }

    translationCache.set(cacheKey, out);
    return out;
  }

  function shouldTranslateTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (parent.closest('script, style, code, pre')) return false;
    return Boolean(node.nodeValue && node.nodeValue.trim());
  }

  function translatePageText(targetLang) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!shouldTranslateTextNode(node)) return;
      rememberOriginalText(node);
      const original = textSourceMap.get(node);
      const nextValue = targetLang === 'fa' ? original : translateText(original, 'en');
      if (node.nodeValue !== nextValue) {
        node.nodeValue = nextValue;
      }
    });
  }

  function translateAttributes(targetLang) {
    document.querySelectorAll('[placeholder], [title], [aria-label], input[value], button[value]').forEach(element => {
      rememberOriginalAttributes(element);
      const original = attrSourceMap.get(element);
      [
        ['placeholder', original.placeholder],
        ['title', original.title],
        ['aria-label', original.ariaLabel],
        ['value', original.value]
      ].forEach(([attr, value]) => {
        if (!value) return;
        const nextValue = targetLang === 'fa' ? value : translateText(value, 'en');
        if (element.getAttribute(attr) !== nextValue) {
          element.setAttribute(attr, nextValue);
        }
      });
    });
  }

  function translateDocumentTitle(targetLang) {
    if (!titleSource.value) titleSource.value = document.title;
    const nextTitle = targetLang === 'fa' ? titleSource.value : translateText(titleSource.value, 'en');
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }

  function updateDocumentLanguage(targetLang) {
    if (typeof window.applyLanguageChrome === 'function') {
      window.applyLanguageChrome(targetLang, false);
      return;
    }

    document.documentElement.lang = targetLang;
    document.documentElement.dir = targetLang === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-en', targetLang === 'en');
    document.body.classList.toggle('lang-fa', targetLang === 'fa');
  }

  function updateSwitcher(targetLang) {
    const faBtn = document.getElementById('langFaBtn');
    const enBtn = document.getElementById('langEnBtn');
    if (!faBtn || !enBtn) return;
    faBtn.classList.toggle('active', targetLang === 'fa');
    enBtn.classList.toggle('active', targetLang === 'en');
    faBtn.setAttribute('aria-pressed', String(targetLang === 'fa'));
    enBtn.setAttribute('aria-pressed', String(targetLang === 'en'));
  }

  function applyLanguage(targetLang) {
    if (isApplyingLanguage) return;
    isApplyingLanguage = true;
    suppressMutationUntil = Date.now() + 300;
    try {
      localStorage.setItem(STORAGE_KEY, targetLang);
    } catch {
      // Ignore storage write failures (e.g. restricted webviews).
    }
    updateDocumentLanguage(targetLang);
    translateDocumentTitle(targetLang);
    translatePageText(targetLang);
    translateAttributes(targetLang);
    updateSwitcher(targetLang);
    isApplyingLanguage = false;
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { language: targetLang } }));
  }

  function mountSwitcher() {
    if (document.getElementById('langSwitcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'langSwitcher';
    wrap.className = 'lang-switcher';
    wrap.innerHTML = `
      <button id="langFaBtn" type="button" class="lang-btn" aria-label="Switch to Persian">FA</button>
      <button id="langEnBtn" type="button" class="lang-btn" aria-label="Switch to English">EN</button>
    `;
    document.body.appendChild(wrap);
    document.getElementById('langFaBtn')?.addEventListener('click', () => applyLanguage('fa'));
    document.getElementById('langEnBtn')?.addEventListener('click', () => applyLanguage('en'));
  }

  function observeMutations() {
    const observer = new MutationObserver(() => {
      if (Date.now() < suppressMutationUntil || isApplyingLanguage) return;
      if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
      observerDebounceTimer = setTimeout(() => applyLanguage(getCurrentLanguage()), 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const titleNode = document.querySelector('title');
    if (titleNode) {
      const titleObserver = new MutationObserver(() => {
        if (isApplyingLanguage) return;
        titleSource.value = titleNode.textContent || document.title;
        applyLanguage(getCurrentLanguage());
      });
      titleObserver.observe(titleNode, { childList: true, subtree: true, characterData: true });
    }
  }

  window.applyLanguage = applyLanguage;
  window.getCurrentLanguage = getCurrentLanguage;
  window.translateUiText = translateText;

  window.addEventListener('DOMContentLoaded', () => {
    mountSwitcher();
    applyLanguage(getCurrentLanguage());
    observeMutations();
  });
})();
