(() => {
  const STORAGE_KEY = 'preferredLanguage';
  const defaultLanguage = 'fa';

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
    'آمار و گزارشات من': 'My Analytics & Reports'
  };

  const enToFa = Object.fromEntries(Object.entries(faToEn).map(([fa, en]) => [en, fa]));

  function getCurrentLanguage() {
    const lang = localStorage.getItem(STORAGE_KEY);
    return lang === 'en' || lang === 'fa' ? lang : defaultLanguage;
  }

  function getDictionary(targetLang) {
    return targetLang === 'en' ? faToEn : enToFa;
  }

  function translateTextNodes(targetLang) {
    const dict = getDictionary(targetLang);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
        const trimmed = node.nodeValue.trim();
        if (!trimmed || !dict[trimmed]) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const original = node.nodeValue;
      const trimmed = original.trim();
      const translated = dict[trimmed];
      if (!translated) return;
      node.nodeValue = original.replace(trimmed, translated);
    });
  }

  function translateAttributes(targetLang) {
    const dict = getDictionary(targetLang);
    const attrs = ['placeholder', 'title', 'aria-label'];
    document.querySelectorAll('*').forEach(el => {
      attrs.forEach(attr => {
        const value = el.getAttribute(attr);
        if (!value) return;
        const trimmed = value.trim();
        if (dict[trimmed]) el.setAttribute(attr, value.replace(trimmed, dict[trimmed]));
      });
    });
  }

  function applyLanguage(targetLang) {
    localStorage.setItem(STORAGE_KEY, targetLang);
    document.documentElement.lang = targetLang === 'en' ? 'en' : 'fa';
    document.documentElement.dir = targetLang === 'en' ? 'ltr' : 'rtl';
    document.body.classList.toggle('lang-en', targetLang === 'en');
    translateTextNodes(targetLang);
    translateAttributes(targetLang);
    updateSwitcher(targetLang);
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
      const lang = getCurrentLanguage();
      translateTextNodes(lang);
      translateAttributes(lang);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
