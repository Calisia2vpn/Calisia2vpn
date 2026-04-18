(() => {
  const STORAGE_KEY = 'preferredLanguage';
  const defaultLanguage = 'fa';

  const textSourceMap = new WeakMap();
  const attrSourceMap = new WeakMap();
  let isApplyingLanguage = false;
  let observerDebounceTimer = null;

  const faToEn = {
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
    'برنامه‌ی امروز': 'Today Plan',
    'تقویم کامل': 'Full Calendar',
    'تغییر تم': 'Toggle Theme',
    'تم تاریک': 'Dark Theme',
    'تم روشن': 'Light Theme',
    'منو': 'Menu',
    'بستن': 'Close',
    'شروع': 'Start',
    'بازنشانی': 'Reset',
    'ماه قبل': 'Prev Month',
    'ماه بعد': 'Next Month',
    'امروز': 'Today',
    'ذخیره': 'Save',
    'انصراف': 'Cancel',
    'ثبت': 'Submit',
    'لغو ویرایش': 'Cancel Edit',
    'افزودن': 'Add',
    'لغو': 'Cancel',
    'ثبت و شروع': 'Save & Start',
    'بعداً انجام می‌دم': 'Do it later',
    'خلاصه سریع وضعیت امروز': 'Quick Today Summary',
    'همه ماژول‌ها': 'All Modules',
    'داشبورد روزانه': 'Daily Dashboard',
    'همه‌چیز مهمِ امروز، یکجا': 'Everything important today, in one place',
    'این صفحه سبک‌تر و جمع‌وجورتر شده تا سریع به اطلاعات اصلی و مسیرهای ضروری برسید؛ بدون شلوغی اضافه.': 'This page is lighter and more compact so you can quickly access key information and essential paths without clutter.',
    'فکر امروز': 'Today Thought',
    'نماز بعدی': 'Next Prayer',
    'اوقات شرعی': 'Prayer Times',
    'وقت جاری': 'Current Time',
    'روز و تاریخ': 'Day & Date',
    'لینک‌های کاربردی داخلی': 'Quick Internal Links',
    'ماژول‌های هوشمند جدید': 'New Smart Modules',
    'بهینگی موقتاً غیرفعال است': 'Optimization is temporarily disabled',
    'داشبورد': 'Dashboard',
    'فیلتر': 'Filter',
    'افزودن دارایی': 'Add Asset',
    'ثبت در برنامه ✅': 'Log to Plan ✅',
    'ثبت ورزش ✅': 'Save Workout ✅',
    'محاسبه 🧮': 'Calculate 🧮',
    '+ گروه جدید': '+ New Group',
    'ذخیره تغییرات': 'Save Changes',
    'آمار و گزارشات من': 'My Analytics & Reports',
    'ورود': 'Login',
    'ثبت‌نام': 'Sign Up',
    'ورود و ثبت‌نام': 'Login & Sign Up',
    'برای شروع، حساب بساز یا وارد شو.': 'Create an account or login to start.',
    'نام و نام خانوادگی': 'Full Name',
    'شماره موبایل': 'Mobile Number',
    'ایمیل (اختیاری)': 'Email (Optional)',
    'رمز عبور': 'Password',
    'شماره موبایل یا ایمیل': 'Mobile or Email',
    'بازگشت به داشبورد': 'Back to Dashboard',
    'تنظیم آدرس API': 'Set API Base URL',
    'خروج از حساب': 'Logout',
    'فعلاً رد کن و مهمان وارد شو': 'Skip for now and continue as guest'
  };

  const faPhraseReplace = [
    ['فروردین', 'Farvardin'], ['اردیبهشت', 'Ordibehesht'], ['خرداد', 'Khordad'], ['تیر', 'Tir'],
    ['مرداد', 'Mordad'], ['شهریور', 'Shahrivar'], ['مهر', 'Mehr'], ['آبان', 'Aban'],
    ['آذر', 'Azar'], ['دی', 'Dey'], ['بهمن', 'Bahman'], ['اسفند', 'Esfand'],
    ['شنبه', 'Saturday'], ['یکشنبه', 'Sunday'], ['دوشنبه', 'Monday'], ['سه‌شنبه', 'Tuesday'],
    ['چهارشنبه', 'Wednesday'], ['پنج‌شنبه', 'Thursday'], ['جمعه', 'Friday']
  ];

  const faCharToLatin = {
    'ا': 'a', 'آ': 'aa', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's',
    'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
    'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h',
    'ی': 'y', 'ئ': 'y', 'ء': '', 'ٔ': '', '‌': ' ', 'ى': 'y', 'ة': 'h'
  };

  const enToFa = Object.fromEntries(Object.entries(faToEn).map(([fa, en]) => [en, fa]));

  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arDigits = '٠١٢٣٤٥٦٧٨٩';

  function toEnglishDigits(value) {
    return String(value)
      .replace(/[۰-۹]/g, d => String(faDigits.indexOf(d)))
      .replace(/[٠-٩]/g, d => String(arDigits.indexOf(d)));
  }

  function transliteratePersian(value) {
    return String(value).replace(/[اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئءٔ‌ىة]/g, ch => faCharToLatin[ch] ?? ch);
  }

  function strictEnglishize(value) {
    let out = String(value);
    for (const [fa, en] of faPhraseReplace) {
      out = out.split(fa).join(en);
    }
    out = toEnglishDigits(out);
    out = transliteratePersian(out);
    return out;
  }

  function getCurrentLanguage() {
    const lang = localStorage.getItem(STORAGE_KEY);
    return lang === 'en' || lang === 'fa' ? lang : defaultLanguage;
  }

  function rememberOriginalText(node) {
    if (!textSourceMap.has(node)) {
      textSourceMap.set(node, node.nodeValue);
    }
  }

  function rememberOriginalAttr(el, attr) {
    if (!attrSourceMap.has(el)) attrSourceMap.set(el, {});
    const store = attrSourceMap.get(el);
    if (!(attr in store)) store[attr] = el.getAttribute(attr);
  }

  function translateSingleText(rawFaText, targetLang) {
    if (targetLang === 'fa') return rawFaText;

    const trimmed = rawFaText.trim();
    if (!trimmed) return rawFaText;

    if (faToEn[trimmed]) {
      return rawFaText.replace(trimmed, faToEn[trimmed]);
    }

    return strictEnglishize(rawFaText);
  }

  function translateTextNodes(targetLang) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      rememberOriginalText(node);
      const rawFaText = textSourceMap.get(node);
      if (targetLang === 'fa') {
        node.nodeValue = rawFaText;
        return;
      }
      node.nodeValue = translateSingleText(rawFaText, targetLang);
    });
  }

  function translateAttributes(targetLang) {
    const attrs = ['placeholder', 'title', 'aria-label'];

    document.querySelectorAll('*').forEach(el => {
      attrs.forEach(attr => {
        if (!el.hasAttribute(attr)) return;

        rememberOriginalAttr(el, attr);
        const source = attrSourceMap.get(el)?.[attr] ?? el.getAttribute(attr);
        if (!source) return;

        if (targetLang === 'fa') {
          el.setAttribute(attr, source);
          return;
        }

        const trimmed = source.trim();
        if (faToEn[trimmed]) {
          el.setAttribute(attr, source.replace(trimmed, faToEn[trimmed]));
        } else {
          el.setAttribute(attr, strictEnglishize(source));
        }
      });
    });
  }

  function applyLanguage(targetLang) {
    if (isApplyingLanguage) return;
    isApplyingLanguage = true;

    localStorage.setItem(STORAGE_KEY, targetLang);
    document.documentElement.lang = targetLang === 'en' ? 'en' : 'fa';
    document.documentElement.dir = targetLang === 'en' ? 'ltr' : 'rtl';
    document.body.classList.toggle('lang-en', targetLang === 'en');

    translateTextNodes(targetLang);
    translateAttributes(targetLang);
    updateSwitcher(targetLang);

    isApplyingLanguage = false;
  }

  function updateSwitcher(targetLang) {
    const faBtn = document.getElementById('langFaBtn');
    const enBtn = document.getElementById('langEnBtn');
    if (!faBtn || !enBtn) return;
    faBtn.classList.toggle('active', targetLang === 'fa');
    enBtn.classList.toggle('active', targetLang === 'en');
  }

  function mountSwitcher() {
    if (document.getElementById('langSwitcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'langSwitcher';
    wrap.className = 'lang-switcher';
    wrap.innerHTML = `
      <button id="langFaBtn" type="button" class="lang-btn">FA</button>
      <button id="langEnBtn" type="button" class="lang-btn">EN</button>
    `;
    document.body.appendChild(wrap);

    document.getElementById('langFaBtn')?.addEventListener('click', () => applyLanguage('fa'));
    document.getElementById('langEnBtn')?.addEventListener('click', () => applyLanguage('en'));
  }

  window.setLanguage = applyLanguage;

  window.addEventListener('load', () => {
    mountSwitcher();
    applyLanguage(getCurrentLanguage());

    const observer = new MutationObserver(() => {
      if (isApplyingLanguage) return;
      clearTimeout(observerDebounceTimer);
      observerDebounceTimer = setTimeout(() => {
        const lang = getCurrentLanguage();
        applyLanguage(lang);
      }, 40);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
