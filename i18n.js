(() => {
  const STORAGE_KEY = 'preferredLanguage';
  const defaultLanguage = 'fa';
  const textSourceMap = new WeakMap();
  const attrSourceMap = new WeakMap();
  let isApplyingLanguage = false;
  let observerDebounceTimer = null;

  const translations = {
    'ورود': 'Login',
    'ثبت‌نام': 'Sign Up',
    'ورود و ثبت‌نام': 'Login & Sign Up',
    'برای شروع، حساب بساز یا وارد شو.': 'Create an account or log in to start.',
    'ورود ساده و سریع، بدون شلوغی اضافه': 'Simple and fast access, without clutter.',
    'صفحه ورود و ثبت‌نام بازطراحی شد تا فرم‌ها ساده‌تر، واضح‌تر و بدون تداخل باشند.': 'The auth page is redesigned to make forms simpler, clearer, and conflict-free.',
    'ثبت‌نام فقط با اطلاعات ضروری انجام می‌شود.': 'Sign up only asks for essential information.',
    'نسخه انگلیسی و فارسی روی همین ساختار مشترک اجرا می‌شوند.': 'Persian and English now share the same stable layout.',
    'اگر فعلاً نمی‌خواهی وارد شوی، می‌توانی به‌صورت مهمان ادامه بدهی.': 'If you do not want to sign in yet, you can continue as a guest.',
    'نام و نام خانوادگی': 'Full Name',
    'شماره موبایل': 'Mobile Number',
    'ایمیل (اختیاری)': 'Email (Optional)',
    'رمز عبور': 'Password',
    'شماره موبایل یا ایمیل': 'Mobile Number or Email',
    'بازگشت به داشبورد': 'Back to Dashboard',
    'تنظیم آدرس API': 'Set API URL',
    'فعلاً رد کن و مهمان وارد شو': 'Skip for now and continue as guest',
    'خانه داشبورد': 'Dashboard Home',
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
    'خروج از حساب': 'Logout',
    'داشبورد روزانه': 'Daily Dashboard',
    'همه‌چیز مهمِ امروز، یکجا': 'Everything important today, in one place.',
    'نسخه فارسی سبک‌تر شد تا بدون تداخل و شلوغی، سریع به مسیرهای اصلی برسی.': 'The Persian homepage is now lighter so you can reach key paths faster with less visual noise.',
    'برنامه‌ی امروز': 'Today Plan',
    'تقویم کامل': 'Full Calendar',
    'وقت جاری': 'Current Time',
    'روز و تاریخ': 'Date',
    'تقویم امروز': 'Today Calendar',
    'اوقات شرعی': 'Prayer Times',
    'نماز بعدی': 'Next Prayer',
    'مسیرهای سریع': 'Quick Links',
    'فقط سه مسیر ضروری نگه داشته شد تا خانه ساده‌تر بماند.': 'Only three essential shortcuts remain to keep the homepage simple.',
    'امروز': 'Today',
    'ماژول‌ها': 'Modules',
    'هم‌افزایی': 'Overview',
    'ابزار زمان': 'Time Tools',
    'خلاصه سریع وضعیت امروز': 'Quick Overview',
    'رویدادها': 'Events',
    'تمرکز روی هدف': 'Goal Focus',
    'در حال بارگذاری...': 'Loading...',
    'همه ماژول‌ها': 'All Modules',
    'همه‌ی بخش‌ها یکجا جمع شده‌اند تا لازم نباشد دنبالش بگردی.': 'All sections are gathered here so you can access them quickly.',
    'داشبورد': 'Dashboard',
    'تم تاریک': 'Dark Mode',
    'تم روشن': 'Light Mode',
    'منو': 'Menu',
    'بستن': 'Close',
    'شروع': 'Start',
    'بازنشانی': 'Reset',
    'ذخیره': 'Save',
    'انصراف': 'Cancel',
    'افزودن': 'Add'
  };

  const enToFa = Object.fromEntries(Object.entries(translations).map(([fa, en]) => [en, fa]));
  const monthMap = {
    'فروردین': 'Farvardin', 'اردیبهشت': 'Ordibehesht', 'خرداد': 'Khordad', 'تیر': 'Tir',
    'مرداد': 'Mordad', 'شهریور': 'Shahrivar', 'مهر': 'Mehr', 'آبان': 'Aban',
    'آذر': 'Azar', 'دی': 'Dey', 'بهمن': 'Bahman', 'اسفند': 'Esfand'
  };
  const dayMap = {
    'شنبه': 'Saturday', 'یکشنبه': 'Sunday', 'دوشنبه': 'Monday', 'سه‌شنبه': 'Tuesday',
    'چهارشنبه': 'Wednesday', 'پنج‌شنبه': 'Thursday', 'جمعه': 'Friday'
  };

  function getCurrentLanguage() {
    const lang = localStorage.getItem(STORAGE_KEY);
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
        ariaLabel: element.getAttribute('aria-label')
      });
    }
  }

  function translateText(value, targetLang) {
    const input = String(value || '').trim();
    if (!input) return value;
    if (targetLang === 'en') {
      if (translations[input]) return translations[input];
      let out = String(value);
      Object.entries(monthMap).forEach(([fa, en]) => { out = out.split(fa).join(en); });
      Object.entries(dayMap).forEach(([fa, en]) => { out = out.split(fa).join(en); });
      out = out.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      return out;
    }
    return enToFa[input] || value;
  }

  function shouldTranslateTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (parent.closest('script, style')) return false;
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
      node.nodeValue = targetLang === 'fa' ? original : translateText(original, 'en');
    });
  }

  function translateAttributes(targetLang) {
    document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
      rememberOriginalAttributes(element);
      const original = attrSourceMap.get(element);
      [['placeholder', original.placeholder], ['title', original.title], ['aria-label', original.ariaLabel]].forEach(([attr, value]) => {
        if (!value) return;
        element.setAttribute(attr, targetLang === 'fa' ? value : translateText(value, 'en'));
      });
    });
  }

  function updateDocumentLanguage(targetLang) {
    document.documentElement.lang = targetLang;
    document.documentElement.dir = targetLang === 'fa' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-en', targetLang === 'en');
  }

  function updateSwitcher(targetLang) {
    const faBtn = document.getElementById('langFaBtn');
    const enBtn = document.getElementById('langEnBtn');
    if (!faBtn || !enBtn) return;
    faBtn.classList.toggle('active', targetLang === 'fa');
    enBtn.classList.toggle('active', targetLang === 'en');
  }

  function applyLanguage(targetLang) {
    if (isApplyingLanguage) return;
    isApplyingLanguage = true;
    localStorage.setItem(STORAGE_KEY, targetLang);
    updateDocumentLanguage(targetLang);
    translatePageText(targetLang);
    translateAttributes(targetLang);
    updateSwitcher(targetLang);
    isApplyingLanguage = false;
  }

  function mountSwitcher() {
    if (document.getElementById('langSwitcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'langSwitcher';
    wrap.className = 'lang-switcher';
    wrap.innerHTML = '<button id="langFaBtn" type="button" class="lang-btn">FA</button><button id="langEnBtn" type="button" class="lang-btn">EN</button>';
    document.body.appendChild(wrap);
    document.getElementById('langFaBtn')?.addEventListener('click', () => applyLanguage('fa'));
    document.getElementById('langEnBtn')?.addEventListener('click', () => applyLanguage('en'));
  }

  function observeMutations() {
    const observer = new MutationObserver(() => {
      if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
      observerDebounceTimer = setTimeout(() => applyLanguage(getCurrentLanguage()), 60);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.applyLanguage = applyLanguage;
  window.getCurrentLanguage = getCurrentLanguage;

  window.addEventListener('DOMContentLoaded', () => {
    mountSwitcher();
    applyLanguage(getCurrentLanguage());
    observeMutations();
  });
})();
