const motivationQuotes = [
    { quote: 'هر لحظه از امروز می‌تواند گامی خردمندانه به سوی فردای بهتر باشد.', author: 'حکمت ایرانی' },
    { quote: 'سکوت صبحگاهی، بهترین فرصت برای شنیدن صدای وجود است.', author: 'یادآور سنت' },
    { quote: 'تمرکز، هنر مرتب کردن دل مشغولی‌های ذهن است.', author: 'فیلسوف بومی' },
    { quote: 'کار امروزت را با آرامش آغاز کن تا دستاوردت با حکمت همراه باشد.', author: 'اهل دل' },
    { quote: 'هر روز تمرین یک انتخاب آگاهانه است.', author: 'پژوهشگر زندگی' }
];

const today = new Date();
const dashboardData = window.DashboardData || null;
const AI_SYSTEM_DISABLED = window.DISABLE_AI_SYSTEM === true;

const weekDates = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(today.getDate() - (6 - index));
    return date.toLocaleDateString('en-CA');
});

const body = document.body;

function getUiLanguage() {
    if (typeof window.getCurrentLanguage === 'function') {
        return window.getCurrentLanguage();
    }
    const saved = localStorage.getItem('preferredLanguage');
    return saved === 'fa' ? 'fa' : 'en';
}

function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme === 'dark' ? '#081b24' : '#0f766e');
    }
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    if (typeof window.updateThemeNavLabel === 'function') {
        window.updateThemeNavLabel();
    }
    localStorage.setItem('dashboardTheme', theme);
}

function toggleTheme() {
    const current = body.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function updateHeaderClock() {
    const now = new Date();
    const jDate = jalaali.toJalaali(now);
    const monthNamesFa = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    const monthNamesEn = ['Farvardin','Ordibehesht','Khordad','Tir','Mordad','Shahrivar','Mehr','Aban','Azar','Dey','Bahman','Esfand'];
    const weekdayNamesFa = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه','شنبه'];
    const locale = getUiLanguage() === 'fa' ? 'fa-IR' : 'en-US';

    if (getUiLanguage() === 'fa') {
        const dayName = weekdayNamesFa[now.getDay()];
        document.getElementById('headerDate').textContent = `${dayName} ${formatFaPlain(jDate.jd)} ${monthNamesFa[jDate.jm - 1]} ${formatFaPlain(jDate.jy)}`;
    } else {
        document.getElementById('headerDate').textContent = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }).format(now);
    }

    document.getElementById('headerClock').textContent = now.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const secondaryDate = document.getElementById('headerDateSecondary');
    if (secondaryDate) {
        if (getUiLanguage() === 'fa') {
            secondaryDate.textContent = new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }).format(now);
        } else {
            secondaryDate.textContent = `${formatFaPlain(jDate.jd)} ${monthNamesEn[jDate.jm - 1]} ${formatFaPlain(jDate.jy)}`;
        }
    }
}

function pickDailyQuote() {
    const quoteNode = document.getElementById('dailyQuote');
    const authorNode = document.getElementById('quoteAuthor');
    if (!quoteNode || !authorNode) return;
    const index = today.getDate() % motivationQuotes.length;
    const quote = motivationQuotes[index];
    quoteNode.textContent = quote.quote;
    authorNode.textContent = `- ${quote.author}`;
}

function formatFa(value) {
    return new Intl.NumberFormat(getUiLanguage() === 'fa' ? 'fa-IR' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true
    }).format(value);
}

function formatFaPlain(value) {
    return new Intl.NumberFormat(getUiLanguage() === 'fa' ? 'fa-IR' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: false
    }).format(value);
}

function formatFaText(value) {
    if (getUiLanguage() !== 'fa') {
        return String(value).replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
    }
    return String(value).replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showPageToast(message, type = 'success') {
    const rootId = 'pageToastRoot';
    let root = document.getElementById(rootId);
    if (!root) {
        root = document.createElement('div');
        root.id = rootId;
        root.className = 'page-toast-root';
        document.body.appendChild(root);
    }
    const toast = document.createElement('div');
    toast.className = `page-toast ${type}`;
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('leave');
        setTimeout(() => toast.remove(), 280);
    }, 2800);
}

function loadDashboardSnapshot() {
    const calories = Number(localStorage.getItem('todayCalories')) || 1450;
    const snapshotCalories = document.getElementById('snapshotCalories');
    if (snapshotCalories) {
        snapshotCalories.textContent = `${formatFa(calories)} کیلوکالری`;
    }
    const snapshotMood = document.getElementById('snapshotMood');
    if (snapshotMood) {
        snapshotMood.textContent = 'آرام و پرانرژی';
    }
}

const TIMER_STORAGE_KEY = 'dashboardTimerState';
const STOPWATCH_STORAGE_KEY = 'dashboardStopwatchState';
const MOOD_STORAGE_KEY = 'dashboardMoodCheckin';
const WALLPAPER_STORAGE_KEY = 'dashboardWallpaper';
const ADHAN_STORAGE_KEY_PREFIX = 'adhanEvents';
const ADHAN_META_KEY_PREFIX = 'adhanEventsMeta';
const ADHAN_CONFIG_VERSION = 3;
const ADHAN_DEFAULTS = {
    city: 'Tehran',
    country: 'Iran',
    method: 7
};
const ADHAN_PRAYER_ENTRIES = [
    ['Fajr', 'اذان صبح'],
    ['Sunrise', 'طلوع آفتاب'],
    ['Dhuhr', 'اذان ظهر'],
    ['Sunset', 'غروب'],
    ['Maghrib', 'اذان مغرب']
];
const DASHBOARD_STORAGE_SYNC_KEYS = [
    'advancedTasks',
    'myHabits',
    'myDietLog',
    'proEvents',
    'goals',
    'financeAssets',
    'meditationStats',
    'fitnessExercises',
    'nutritionTargets',
    'socialUsers',
    'socialMessages'
];

function normalizeGregorianDate(dateLike) {
    if (dashboardData?.normalizeGregorianDate) {
        return dashboardData.normalizeGregorianDate(dateLike);
    }
    if (!dateLike) return '';
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) {
        return String(dateLike);
    }
    return date.toLocaleDateString('en-CA');
}

function normalizeJalaaliDateKey(value) {
    if (dashboardData?.normalizeJalaaliDateKey) {
        return dashboardData.normalizeJalaaliDateKey(value);
    }
    if (!value) return '';
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return String(value);
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
}

function sanitizeTimingValue(value) {
    if (dashboardData?.sanitizeTimingValue) {
        return dashboardData.sanitizeTimingValue(value);
    }
    return String(value || '').split(' ')[0];
}

function safeJsonParse(raw, fallback) {
    try {
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

function getCurrentJalaaliYear() {
    return jalaali.toJalaali(new Date()).jy;
}

function getAdhanStorageKey(jalaaliYear = getCurrentJalaaliYear()) {
    return `${ADHAN_STORAGE_KEY_PREFIX}${jalaaliYear}`;
}

function getAdhanMetaKey(jalaaliYear = getCurrentJalaaliYear()) {
    return `${ADHAN_META_KEY_PREFIX}${jalaaliYear}`;
}

function getStoredAdhanEvents(jalaaliYear = getCurrentJalaaliYear()) {
    const storageKey = getAdhanStorageKey(jalaaliYear);
    const rawEvents = safeJsonParse(localStorage.getItem(storageKey) || '[]', []);
    const sanitizedEvents = sanitizeStoredAdhanEvents(rawEvents);
    if (sanitizedEvents.length !== rawEvents.length) {
        localStorage.setItem(storageKey, JSON.stringify(sanitizedEvents));
    }
    return sanitizedEvents;
}

function sanitizeStoredAdhanEvents(events) {
    if (!Array.isArray(events)) return [];
    const allowedKeys = new Set(ADHAN_PRAYER_ENTRIES.map(([apiKey]) => apiKey.toLowerCase()));
    return events.filter(event => allowedKeys.has(String(event?.id || '').split('-').pop()));
}

function getStoredUserEvents() {
    if (dashboardData?.readUserEvents) {
        return dashboardData.readUserEvents();
    }
    return safeJsonParse(localStorage.getItem('proEvents') || '[]', []);
}

function getAllCalendarEvents(rangeStart, rangeEnd, options) {
    if (dashboardData?.getAllCalendarEvents) {
        return dashboardData.getAllCalendarEvents({ rangeStart, rangeEnd, ...(options || {}) });
    }
    return (options?.includeAdhan === false)
        ? [...getStoredUserEvents()]
        : [...getStoredUserEvents(), ...getStoredAdhanEvents()];
}

function buildAdhanEventsForDay(gregorianYear, gregorianMonth, gregorianDay, timings, targetJalaaliYear) {
    const jalaaliDate = jalaali.toJalaali(new Date(gregorianYear, gregorianMonth - 1, gregorianDay));
    if (jalaaliDate.jy !== targetJalaaliYear) {
        return [];
    }

    const dateKey = normalizeJalaaliDateKey(`${jalaaliDate.jy}-${jalaaliDate.jm}-${jalaaliDate.jd}`);
    return ADHAN_PRAYER_ENTRIES.map(([apiKey, title], index) => ({
        id: `adhan-${dateKey}-${apiKey.toLowerCase()}`,
        source: 'adhan',
        date: dateKey,
        title,
        hour: sanitizeTimingValue(timings[apiKey]).split(':')[0],
        time: sanitizeTimingValue(timings[apiKey]),
        color: index < 2 ? '#c08a2b' : '#1d7562',
        category: 'اوقات شرعی',
        priority: 'low',
        desc: `اوقات شرعی ${title} برای ${ADHAN_DEFAULTS.city}`
    }));
}

function buildMonthRequestsForJalaaliYear(jalaaliYear) {
    const startGregorian = jalaali.toGregorian(jalaaliYear, 1, 1);
    const endGregorian = jalaali.toGregorian(jalaaliYear, 12, 29);
    const start = new Date(startGregorian.gy, startGregorian.gm - 1, startGregorian.gd);
    const end = new Date(endGregorian.gy, endGregorian.gm - 1, endGregorian.gd);
    const requests = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= end) {
        requests.push([cursor.getFullYear(), cursor.getMonth() + 1]);
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return requests;
}

async function ensureAdhanDataForCurrentYear() {
    const jalaaliYear = getCurrentJalaaliYear();
    const storageKey = getAdhanStorageKey(jalaaliYear);
    const metaKey = getAdhanMetaKey(jalaaliYear);
    const cachedRaw = getStoredAdhanEvents(jalaaliYear);
    const existing = sanitizeStoredAdhanEvents(cachedRaw);
    const meta = safeJsonParse(localStorage.getItem(metaKey) || 'null', null);
    const cacheMatches = meta?.city === ADHAN_DEFAULTS.city
        && meta?.year === jalaaliYear
        && meta?.version === ADHAN_CONFIG_VERSION;

    if (existing.length && cacheMatches) {
        if (existing.length !== cachedRaw.length) {
            localStorage.setItem(storageKey, JSON.stringify(existing));
        }
        return existing;
    }

    const monthRequests = buildMonthRequestsForJalaaliYear(jalaaliYear);

    try {
        const responses = await Promise.all(monthRequests.map(async ([year, month]) => {
            const url = `https://api.aladhan.com/v1/calendarByCity/${year}/${month}?city=${encodeURIComponent(ADHAN_DEFAULTS.city)}&country=${encodeURIComponent(ADHAN_DEFAULTS.country)}&method=${ADHAN_DEFAULTS.method}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch prayer times for ${year}-${month}`);
            }
            const payload = await response.json();
            return payload.data || [];
        }));

        const adhanEvents = responses.flatMap(monthData => monthData.flatMap(item => {
            const gregorian = item?.date?.gregorian;
            if (!gregorian) return [];
            return buildAdhanEventsForDay(Number(gregorian.year), Number(gregorian.month.number), Number(gregorian.day), item.timings || {}, jalaaliYear);
        }));

        localStorage.setItem(storageKey, JSON.stringify(adhanEvents));
        localStorage.setItem(metaKey, JSON.stringify({
            city: ADHAN_DEFAULTS.city,
            country: ADHAN_DEFAULTS.country,
            method: ADHAN_DEFAULTS.method,
            year: jalaaliYear,
            version: ADHAN_CONFIG_VERSION,
            generatedAt: new Date().toISOString()
        }));

        return adhanEvents;
    } catch (error) {
        if (existing.length) {
            localStorage.setItem(storageKey, JSON.stringify(existing));
            localStorage.setItem(metaKey, JSON.stringify({
                city: ADHAN_DEFAULTS.city,
                country: ADHAN_DEFAULTS.country,
                method: ADHAN_DEFAULTS.method,
                year: jalaaliYear,
                version: ADHAN_CONFIG_VERSION,
                generatedAt: meta?.generatedAt || new Date().toISOString()
            }));
            return existing;
        }
        throw error;
    }
}

function getPriorityMeta(priority) {
    if (priority === 'high') return { label: 'فوری', className: 'priority-high' };
    if (priority === 'medium') return { label: 'مهم', className: 'priority-medium' };
    return { label: 'عادی', className: 'priority-low' };
}

function getTaskLink(task) {
    const category = task?.category || '';
    if (category === 'health') return 'fitness.html';
    if (category === 'study') return 'goals.html';
    return 'tasks.html';
}

function getTaskPriorityRank(priority) {
    if (priority === 'high') return 0;
    if (priority === 'medium') return 1;
    return 2;
}

function readDashboardTasks() {
    return dashboardData?.readTasks
        ? dashboardData.readTasks()
        : safeJsonParse(localStorage.getItem('advancedTasks') || '[]', []);
}

function formatFaJalaaliFromGregorian(dateLike) {
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return '';
    if (getUiLanguage() !== 'fa') {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }
    const jDate = jalaali.toJalaali(date);
    const monthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    return `${formatFaPlain(jDate.jd)} ${monthNames[jDate.jm - 1]} ${formatFaPlain(jDate.jy)}`;
}

function getTodayTasks() {
    if (dashboardData?.getTaskOccurrencesForDate) {
        return dashboardData.getTaskOccurrencesForDate(new Date(), { includeCompleted: false })
            .sort((a, b) => {
                const priorityDiff = getTaskPriorityRank(a.task.priority) - getTaskPriorityRank(b.task.priority);
                if (priorityDiff !== 0) return priorityDiff;
                return new Date(a.task.createdAt || 0) - new Date(b.task.createdAt || 0);
            })
            .map(({ task }) => {
                const priority = getPriorityMeta(task.priority);
                return {
                    id: task.id,
                    title: task.title,
                    badge: priority.label,
                    className: priority.className,
                    link: getTaskLink(task),
                    meta: task.dueDate ? `موعد امروز` : 'بدون موعد'
                };
            });
    }

    const tasks = JSON.parse(localStorage.getItem('advancedTasks') || '[]');
    const todayDate = normalizeGregorianDate(new Date());

    return tasks
        .filter(task => !task.completed)
        .filter(task => !task.dueDate || normalizeGregorianDate(task.dueDate) === todayDate)
        .sort((a, b) => {
            const priorityDiff = getTaskPriorityRank(a.priority) - getTaskPriorityRank(b.priority);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        })
        .map(task => {
            const priority = getPriorityMeta(task.priority);
            return {
                id: task.id,
                title: task.title,
                badge: priority.label,
                className: priority.className,
                link: getTaskLink(task),
                meta: task.dueDate ? 'موعد امروز' : 'بدون موعد'
            };
        });
}

function getOverdueTasks() {
    const todayKey = normalizeGregorianDate(new Date());

    return readDashboardTasks()
        .filter(task => !task.completed)
        .filter(task => (task.recurring || 'none') === 'none')
        .filter(task => task.dueDate && normalizeGregorianDate(task.dueDate) < todayKey)
        .sort((a, b) => {
            const dueCompare = normalizeGregorianDate(a.dueDate).localeCompare(normalizeGregorianDate(b.dueDate));
            if (dueCompare !== 0) return dueCompare;
            const priorityDiff = getTaskPriorityRank(a.priority) - getTaskPriorityRank(b.priority);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        })
        .map(task => ({
            id: task.id,
            title: task.title,
            badge: 'عقب‌مانده',
            className: 'priority-overdue',
            link: getTaskLink(task),
            meta: task.dueDate ? `موعد ${formatFaJalaaliFromGregorian(task.dueDate)}` : 'موعد گذشته'
        }));
}

function getDashboardTaskItems() {
    const overdueTasks = getOverdueTasks();
    const todayTasks = getTodayTasks().filter(item => !overdueTasks.some(overdue => overdue.id === item.id));
    return [...overdueTasks, ...todayTasks].slice(0, 6);
}

function getTodayPrograms() {
    const todayJ = jalaali.toJalaali(new Date());
    const todayKey = normalizeJalaaliDateKey(`${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`);
    const events = getAllCalendarEvents(new Date(), new Date(), { includeAdhan: false });

    return events
        .filter(event => normalizeJalaaliDateKey(event.date) === todayKey)
        .filter(event => !String(event.title || '').includes('نماز'))
        .sort((a, b) => Number(a.hour ?? 99) - Number(b.hour ?? 99))
        .slice(0, 5)
        .map(event => ({
            title: event.title,
            time: event.time
                ? formatFaText(event.time)
                : event.hour !== undefined && event.hour !== '' ? `${formatFaText(String(event.hour).padStart(2, '0'))}:۰۰` : 'تمام روز',
            link: event.link || 'calendar.html'
        }));
}

function getTodayPrayerTimes() {
    const todayJ = jalaali.toJalaali(new Date());
    const todayKey = normalizeJalaaliDateKey(`${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`);
    return getStoredAdhanEvents()
        .filter(event => normalizeJalaaliDateKey(event.date) === todayKey)
        .sort((a, b) => sanitizeTimingValue(a.time).localeCompare(sanitizeTimingValue(b.time)))
        .map(event => ({
            title: event.title === 'طلوع آفتاب'
                ? 'طلوع'
                : event.title.replace('اذان ', ''),
            rawTime: sanitizeTimingValue(event.time),
            time: formatFaText(sanitizeTimingValue(event.time))
        }));
}

function getCalendarDecoratedDates() {
    const decoratedDates = new Map();

    getStoredUserEvents().forEach(event => {
        const key = normalizeJalaaliDateKey(event.date);
        if (!key) return;
        const current = decoratedDates.get(key) || { hasEvent: false, hasTask: false };
        current.hasEvent = true;
        decoratedDates.set(key, current);
    });

    readDashboardTasks()
        .filter(task => !task.completed && task.dueDate)
        .forEach(task => {
            const dueDate = new Date(task.dueDate);
            if (Number.isNaN(dueDate.getTime())) return;
            const jDate = jalaali.toJalaali(dueDate);
            const key = normalizeJalaaliDateKey(`${jDate.jy}-${jDate.jm}-${jDate.jd}`);
            const current = decoratedDates.get(key) || { hasEvent: false, hasTask: false };
            current.hasTask = true;
            decoratedDates.set(key, current);
        });

    return decoratedDates;
}

function getTasksForJalaaliDateKey(dateKey) {
    return readDashboardTasks()
        .filter(task => !task.completed && task.dueDate)
        .filter(task => {
            const dueDate = new Date(task.dueDate);
            if (Number.isNaN(dueDate.getTime())) return false;
            const jDate = jalaali.toJalaali(dueDate);
            return normalizeJalaaliDateKey(`${jDate.jy}-${jDate.jm}-${jDate.jd}`) === dateKey;
        })
        .sort((a, b) => {
            const priorityDiff = getTaskPriorityRank(a.priority) - getTaskPriorityRank(b.priority);
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.dueDate) - new Date(b.dueDate);
        })
        .map(task => ({
            time: task.dueTime ? formatFaText(task.dueTime) : 'تسک',
            title: task.title
        }));
}

function renderTodayPrayerTimes() {
    const container = document.getElementById('prayerTimesList');
    const nextPrayerLabel = document.getElementById('nextPrayerLabel');
    const nextPrayerTime = document.getElementById('nextPrayerTime');
    if (!container) return;
    const prayerTimes = getTodayPrayerTimes();
    const now = new Date();
    const currentMinutes = (now.getHours() * 60) + now.getMinutes();
    const nextPrayer = prayerTimes.find(item => {
        const [hour, minute] = item.rawTime.split(':').map(Number);
        return ((hour || 0) * 60) + (minute || 0) >= currentMinutes;
    }) || prayerTimes[0];

    if (nextPrayerLabel) {
        nextPrayerLabel.textContent = nextPrayer ? `بعدی: ${nextPrayer.title}` : 'نماز بعدی';
    }

    if (nextPrayerTime) {
        nextPrayerTime.textContent = nextPrayer ? nextPrayer.time : '--:--';
    }

    container.innerHTML = prayerTimes.length
        ? prayerTimes.map(item => `
            <div class="hero-prayer-pill">
                <span>${item.title}</span>
                <strong>${item.time}</strong>
            </div>
        `).join('')
        : `
            <div class="hero-prayer-pill hero-prayer-pill--empty">
                <span>اوقات شرعی</span>
                <strong>در دسترس نیست</strong>
            </div>
        `;
}

function renderTodaySchedule() {
    const priorityList = document.getElementById('priorityTasksList');
    const programsList = document.getElementById('todayProgramsList');
    if (!priorityList || !programsList) return;

    const dashboardTasks = getDashboardTaskItems();
    const todayPrograms = getTodayPrograms();

    priorityList.innerHTML = dashboardTasks.length ? dashboardTasks.map(item => `
        <a href="${item.link}" class="plan-item">
            <div class="plan-item-main">
                <span>${escapeHtml(item.title)}</span>
                <span class="plan-item-meta">${escapeHtml(item.meta || '')}</span>
            </div>
            <span class="priority-badge ${item.className}">${item.badge}</span>
        </a>
    `).join('') : `
        <div class="plan-item">
            <div class="plan-item-main">
                <span>تسک فعالی برای امروز ثبت نشده است.</span>
                <span class="plan-item-meta">چیزی عقب نمانده</span>
            </div>
            <span class="event-time">آزاد</span>
        </div>
    `;

    programsList.innerHTML = todayPrograms.length ? todayPrograms.map(item => `
        <a href="${item.link}" class="plan-item">
            <div class="plan-item-main">
                <span>${escapeHtml(item.title)}</span>
                <span class="plan-item-meta">${escapeHtml(item.time)}</span>
            </div>
            <span class="event-time">امروز</span>
        </a>
    `).join('') : `
        <div class="plan-item">
            <div class="plan-item-main">
                <span>برای امروز رویدادی در تقویم ثبت نشده است.</span>
                <span class="plan-item-meta">نمازها در کارت جداگانه نمایش داده می‌شوند</span>
            </div>
            <span class="event-time">خالی</span>
        </div>
    `;
}

function renderHomeGlanceStrip() {
    const tasksEl = document.getElementById('glanceTasks');
    const eventsEl = document.getElementById('glanceEvents');
    const habitsEl = document.getElementById('glanceHabits');
    const focusEl = document.getElementById('glanceFocus');
    if (!tasksEl || !eventsEl || !habitsEl || !focusEl) return;

    const todayKey = normalizeGregorianDate(new Date());
    const tasks = readDashboardTasks();
    const activeTasks = tasks.filter(task => !task.completed);
    const dueToday = activeTasks.filter(task => normalizeGregorianDate(task.dueDate || task.date) === todayKey).length;
    tasksEl.textContent = `${formatFaPlain(dueToday)} کار امروز / ${formatFaPlain(activeTasks.length)} باز`;

    const todayEvents = getTodayPrograms();
    eventsEl.textContent = todayEvents.length
        ? `${formatFaPlain(todayEvents.length)} رویداد برای امروز`
        : 'امروز رویداد ثبت نشده';

    const habits = safeJsonParse(localStorage.getItem('myHabits') || '[]', []);
    const completedHabits = habits.filter(h => Array.isArray(h.history) && h.history.includes(todayKey)).length;
    habitsEl.textContent = habits.length
        ? `${formatFaPlain(completedHabits)} از ${formatFaPlain(habits.length)} عادت انجام شد`
        : 'هنوز عادتی ثبت نشده';

    const goals = readDashboardGoals();
    const averageProgress = goals.length
        ? Math.round(goals.reduce((sum, item) => sum + (Number(item.progress) || 0), 0) / goals.length)
        : 0;
    focusEl.textContent = goals.length
        ? `میانگین پیشرفت اهداف: ${formatFaPlain(averageProgress)}٪`
        : 'هدفی برای دنبال‌کردن ثبت نشده';
}

function initializeMoodCheckin() {
    const root = document.getElementById('moodActions');
    const hint = document.getElementById('moodHint');
    if (!root || !hint) return;
    const moodMap = {
        awful: 'امروز سخت شروع شده؛ فقط یک کار ۱۰ دقیقه‌ای انجام بده و باقی را سبک کن.',
        low: 'انرژی کمه؛ اول یک کار کوتاه + کمی حرکت بدنی، بعد کار اصلی.',
        ok: 'حالت متعادل است؛ بهترین زمان برای یک کار عمیق ۲۵ دقیقه‌ای.',
        good: 'انرژی خوبه؛ یک کار مهم را کامل ببند و جشن کوچیک بگیر.',
        great: 'فوق‌العاده‌ای! سخت‌ترین کار روز را همین الان شروع کن.'
    };
    const savedMood = localStorage.getItem(MOOD_STORAGE_KEY) || '';

    function setMood(mood) {
        localStorage.setItem(MOOD_STORAGE_KEY, mood);
        root.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mood === mood);
        });
        hint.textContent = moodMap[mood] || 'حالت امروز را انتخاب کن.';
    }

    root.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => setMood(btn.dataset.mood || ''));
    });
    setMood(savedMood);
}

function initializeFocusRoulette() {
    return;

    function buildCandidates() {
        const tasks = readDashboardTasks()
            .filter(task => !task.completed)
            .map(task => ({
                type: 'task',
                priority: task.priority || 'medium',
                text: `تسک: ${task.title}`
            }));
        const habits = safeJsonParse(localStorage.getItem('myHabits') || '[]', [])
            .map(habit => ({ type: 'habit', priority: 'medium', text: `عادت: ${habit.title || habit.name || 'عادت بدون عنوان'}` }));
        return [...tasks, ...habits];
    }

    button.addEventListener('click', () => {
        const candidates = buildCandidates();
        if (!candidates.length) {
            result.textContent = 'فعلاً داده‌ای نیست؛ یک تسک یا عادت اضافه کن تا پیشنهاد دقیق بدهیم.';
            return;
        }
        const weighted = candidates
            .sort((a, b) => (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0))
            .slice(0, Math.min(6, candidates.length));
        const picked = weighted[Math.floor(Math.random() * weighted.length)];
        result.textContent = `پیشنهاد فوری: ${picked.text} — فقط ۹۰ ثانیه شروعش کن.`;
    });
}

function initializeWallpaperPicker() {
    return;

    const presets = {
        mint: 'radial-gradient(circle at top right, rgba(31, 143, 134, 0.3), transparent 28%), radial-gradient(circle at 10% 80%, rgba(20, 184, 166, 0.22), transparent 30%), linear-gradient(180deg, #d9f6f2 0%, #c8ece6 100%)',
        sunset: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.24), transparent 40%), linear-gradient(135deg, #f97316 0%, #ec4899 55%, #8b5cf6 100%)',
        night: 'radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.2), transparent 30%), linear-gradient(140deg, #0f172a 0%, #1e293b 52%, #334155 100%)',
        forest: 'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.18), transparent 35%), linear-gradient(135deg, #0f766e 0%, #16a34a 58%, #84cc16 100%)'
    };

    function applyWallpaper(name) {
        const body = document.body;
        const background = presets[name];
        picker.querySelectorAll('.wallpaper-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.wallpaper === name);
        });
        if (!background) {
            body.classList.remove('custom-wallpaper');
            body.style.removeProperty('--wallpaper-bg');
            localStorage.removeItem(WALLPAPER_STORAGE_KEY);
            return;
        }
        body.classList.add('custom-wallpaper');
        body.style.setProperty('--wallpaper-bg', background);
        localStorage.setItem(WALLPAPER_STORAGE_KEY, name);
    }

    picker.querySelectorAll('.wallpaper-option').forEach(btn => {
        btn.addEventListener('click', () => applyWallpaper(btn.dataset.wallpaper || ''));
    });
    if (resetBtn) {
        resetBtn.addEventListener('click', () => applyWallpaper(''));
    }
    applyWallpaper(localStorage.getItem(WALLPAPER_STORAGE_KEY) || '');
}

function readDashboardGoals() {
    try {
        const goals = JSON.parse(localStorage.getItem('goals') || '[]');
        return Array.isArray(goals) ? goals : [];
    } catch {
        return [];
    }
}

function saveDashboardGoals(goals) {
    localStorage.setItem('goals', JSON.stringify(goals));
}

function updateGoalProgress(goalId, progress) {
    const goals = readDashboardGoals();
    const nextGoals = goals.map(goal => {
        if (goal.id !== goalId) return goal;
        return { ...goal, progress: Math.max(0, Math.min(100, Number(progress) || 0)) };
    });
    saveDashboardGoals(nextGoals);
    renderGoalFocus();
}

function saveMonthlyGoalProgress(goalId) {
    const goals = readDashboardGoals();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextGoals = goals.map(goal => {
        if (goal.id !== goalId) return goal;
        const history = Array.isArray(goal.progressHistory) ? [...goal.progressHistory] : [];
        const progressValue = Math.max(0, Math.min(100, Number(goal.progress) || 0));
        const existingIndex = history.findIndex(item => item?.month === monthKey);
        if (existingIndex >= 0) {
            history[existingIndex] = { month: monthKey, progress: progressValue, updatedAt: new Date().toISOString() };
        } else {
            history.push({ month: monthKey, progress: progressValue, updatedAt: new Date().toISOString() });
        }
        return { ...goal, progressHistory: history };
    });
    saveDashboardGoals(nextGoals);
    renderGoalFocus();
}

function renderGoalFocus() {
    const container = document.getElementById('goalFocusList');
    if (!container) return;
    const activeGoals = readDashboardGoals()
        .filter(goal => (goal.status || 'active') === 'active')
        .sort((a, b) => Number(b.priority === 'high') - Number(a.priority === 'high'))
        .slice(0, 4);

    container.innerHTML = activeGoals.length ? activeGoals.map(goal => {
        const progress = Math.max(0, Math.min(100, Number(goal.progress) || 0));
        const latestMonthly = Array.isArray(goal.progressHistory) && goal.progressHistory.length
            ? goal.progressHistory[goal.progressHistory.length - 1]
            : null;
        const monthlyText = goal.trackMonthly
            ? (latestMonthly ? `پیشرفت ماهانه: ${formatFaText(String(latestMonthly.progress))}%` : 'پیشرفت ماهانه هنوز ثبت نشده')
            : 'هدف در حال پیگیری';
        return `
            <div class="goal-focus-item">
                <div class="goal-focus-head">
                    <span>${goal.title}</span>
                    <strong>${formatFaText(String(progress))}%</strong>
                </div>
                <div class="goal-focus-progress-track">
                    <div class="goal-focus-progress-fill" style="width: ${progress}%;"></div>
                </div>
                <div class="goal-focus-actions">
                    <span class="goal-focus-status">${monthlyText}</span>
                    <button class="goal-mini-btn" type="button" onclick="window.location.href='goals.html'">مشاهده در اهداف</button>
                </div>
            </div>
        `;
    }).join('') : `
        <div class="plan-item">
            <div class="plan-item-main">
                <span>هنوز هدف فعالی ثبت نشده است.</span>
                <span class="plan-item-meta">از بخش اهداف شروع کن</span>
            </div>
            <span class="event-time">---</span>
        </div>
    `;
}

let dashboardTimerSeconds = 25 * 60;
let dashboardTimerInterval = null;
let dashboardTimerRunning = false;

let dashboardStopwatchSeconds = 0;
let dashboardStopwatchInterval = null;
let dashboardStopwatchRunning = false;
let dashboardStopwatchStartedAt = null;

let miniCalendarState = null;

function updateDashboardTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;
    const minutes = Math.floor(dashboardTimerSeconds / 60).toString().padStart(2, '0');
    const seconds = (dashboardTimerSeconds % 60).toString().padStart(2, '0');
    display.textContent = `${formatFaText(minutes)}:${formatFaText(seconds)}`;
}

function updateDashboardTimerUi() {
    const timerToggle = document.getElementById('timerToggleBtn');
    const timerStatus = document.getElementById('timerStatus');

    if (timerToggle) {
        timerToggle.textContent = dashboardTimerRunning ? 'توقف' : dashboardTimerSeconds === 0 ? 'شروع دوباره' : 'شروع';
    }

    if (timerStatus) {
        if (dashboardTimerRunning) {
            timerStatus.textContent = 'در حال اجرا';
        } else if (dashboardTimerSeconds === 0) {
            timerStatus.textContent = 'پایان یافت';
        } else {
            timerStatus.textContent = 'آماده';
        }
    }
}

function syncTimerPresetState(minutes = null) {
    let activeMinutes = minutes;
    if (activeMinutes === null && dashboardTimerSeconds % 60 === 0) {
        const derivedMinutes = dashboardTimerSeconds / 60;
        if ([5, 15, 25, 50].includes(derivedMinutes)) {
            activeMinutes = derivedMinutes;
        }
    }

    document.querySelectorAll('.timer-preset').forEach(button => {
        const isActive = activeMinutes !== null && Number(button.dataset.minutes) === activeMinutes;
        button.classList.toggle('active', isActive);
    });
}

function initializeDashboardTimerControls() {
    document.querySelectorAll('.timer-preset').forEach(button => {
        button.addEventListener('click', () => {
            const minutes = Number(button.dataset.minutes);
            if (Number.isFinite(minutes)) {
                setDashboardTimer(minutes);
            }
        });
    });

    const timerToggle = document.getElementById('timerToggleBtn');
    if (timerToggle) {
        timerToggle.addEventListener('click', toggleDashboardTimer);
    }

    const timerReset = document.getElementById('timerResetBtn');
    if (timerReset) {
        timerReset.addEventListener('click', resetDashboardTimer);
    }
}

function persistTimerState() {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
        remainingSeconds: dashboardTimerSeconds,
        running: dashboardTimerRunning,
        endAt: dashboardTimerRunning ? Date.now() + (dashboardTimerSeconds * 1000) : null
    }));
}

function restoreDashboardTimer() {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) {
        setDashboardTimer(25);
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed.running && parsed.endAt) {
            dashboardTimerSeconds = Math.max(0, Math.ceil((parsed.endAt - Date.now()) / 1000));
            updateDashboardTimerDisplay();
            if (dashboardTimerSeconds <= 0) {
                handleTimerEnd();
                return;
            }
            startDashboardTimer();
        } else {
            const remainingSeconds = Number(parsed.remainingSeconds);
            dashboardTimerSeconds = Number.isFinite(remainingSeconds) ? remainingSeconds : 25 * 60;
            updateDashboardTimerDisplay();
            updateDashboardTimerUi();
            syncTimerPresetState();
        }
    } catch {
        setDashboardTimer(25);
    }
}

function setDashboardTimer(minutes) {
    stopDashboardTimer();
    dashboardTimerSeconds = minutes * 60;
    updateDashboardTimerDisplay();
    updateDashboardTimerUi();
    syncTimerPresetState(minutes);
    persistTimerState();
}

function handleTimerEnd() {
    stopDashboardTimer();
    dashboardTimerSeconds = 0;
    updateDashboardTimerDisplay();
    updateDashboardTimerUi();
    syncTimerPresetState();
    persistTimerState();
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
    audio.play().catch(() => {});
}

function startDashboardTimer() {
    if (dashboardTimerInterval || dashboardTimerSeconds <= 0) return;
    dashboardTimerRunning = true;
    updateDashboardTimerUi();
    persistTimerState();
    dashboardTimerInterval = setInterval(() => {
        if (dashboardTimerSeconds <= 0) {
            handleTimerEnd();
            return;
        }
        dashboardTimerSeconds -= 1;
        updateDashboardTimerDisplay();
        persistTimerState();
    }, 1000);
}

function stopDashboardTimer() {
    clearInterval(dashboardTimerInterval);
    dashboardTimerInterval = null;
    dashboardTimerRunning = false;
    updateDashboardTimerUi();
    persistTimerState();
}

function toggleDashboardTimer() {
    if (dashboardTimerRunning) {
        stopDashboardTimer();
    } else {
        updateDashboardTimerDisplay();
        startDashboardTimer();
    }
}

function resetDashboardTimer() {
    stopDashboardTimer();
    setDashboardTimer(25);
}

function formatStopwatchValue(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${formatFaText(hours)}:${formatFaText(minutes)}:${formatFaText(seconds)}`;
}

function updateDashboardStopwatchDisplay() {
    const display = document.getElementById('stopwatchDisplay');
    if (display) {
        display.textContent = formatStopwatchValue(dashboardStopwatchSeconds);
    }
}

function updateDashboardStopwatchUi() {
    const toggle = document.getElementById('stopwatchToggleBtn');
    const status = document.getElementById('stopwatchStatus');

    if (toggle) {
        toggle.textContent = dashboardStopwatchRunning ? 'توقف' : dashboardStopwatchSeconds > 0 ? 'ادامه' : 'شروع';
    }

    if (status) {
        status.textContent = dashboardStopwatchRunning ? 'در حال شمارش' : dashboardStopwatchSeconds > 0 ? 'متوقف شده' : 'آماده';
    }
}

function persistDashboardStopwatch() {
    localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify({
        elapsedSeconds: dashboardStopwatchSeconds,
        running: dashboardStopwatchRunning,
        startedAt: dashboardStopwatchRunning ? dashboardStopwatchStartedAt : null
    }));
}

function restoreDashboardStopwatch() {
    const raw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
    if (!raw) {
        updateDashboardStopwatchDisplay();
        updateDashboardStopwatchUi();
        return;
    }

    try {
        const parsed = JSON.parse(raw);
        dashboardStopwatchSeconds = Number.isFinite(Number(parsed.elapsedSeconds)) ? Number(parsed.elapsedSeconds) : 0;
        if (parsed.running && parsed.startedAt) {
            dashboardStopwatchStartedAt = Number(parsed.startedAt);
            startDashboardStopwatch();
        } else {
            dashboardStopwatchRunning = false;
            dashboardStopwatchStartedAt = null;
            updateDashboardStopwatchDisplay();
            updateDashboardStopwatchUi();
        }
    } catch {
        resetDashboardStopwatch();
    }
}

function startDashboardStopwatch() {
    if (dashboardStopwatchInterval) return;
    dashboardStopwatchRunning = true;
    dashboardStopwatchStartedAt = dashboardStopwatchStartedAt || (Date.now() - (dashboardStopwatchSeconds * 1000));
    updateDashboardStopwatchUi();
    updateDashboardStopwatchDisplay();
    persistDashboardStopwatch();

    dashboardStopwatchInterval = setInterval(() => {
        dashboardStopwatchSeconds = Math.floor((Date.now() - dashboardStopwatchStartedAt) / 1000);
        updateDashboardStopwatchDisplay();
        persistDashboardStopwatch();
    }, 1000);
}

function stopDashboardStopwatch() {
    if (dashboardStopwatchStartedAt) {
        dashboardStopwatchSeconds = Math.floor((Date.now() - dashboardStopwatchStartedAt) / 1000);
    }
    clearInterval(dashboardStopwatchInterval);
    dashboardStopwatchInterval = null;
    dashboardStopwatchRunning = false;
    dashboardStopwatchStartedAt = null;
    updateDashboardStopwatchDisplay();
    updateDashboardStopwatchUi();
    persistDashboardStopwatch();
}

function toggleDashboardStopwatch() {
    if (dashboardStopwatchRunning) {
        stopDashboardStopwatch();
    } else {
        startDashboardStopwatch();
    }
}

function resetDashboardStopwatch() {
    clearInterval(dashboardStopwatchInterval);
    dashboardStopwatchInterval = null;
    dashboardStopwatchRunning = false;
    dashboardStopwatchStartedAt = null;
    dashboardStopwatchSeconds = 0;
    updateDashboardStopwatchDisplay();
    updateDashboardStopwatchUi();
    persistDashboardStopwatch();
}

function initializeDashboardStopwatchControls() {
    const toggle = document.getElementById('stopwatchToggleBtn');
    if (toggle) {
        toggle.addEventListener('click', toggleDashboardStopwatch);
    }

    const reset = document.getElementById('stopwatchResetBtn');
    if (reset) {
        reset.addEventListener('click', resetDashboardStopwatch);
    }
}

function ensureMiniCalendarState() {
    if (!miniCalendarState) {
        const todayJ = jalaali.toJalaali(new Date());
        miniCalendarState = { year: todayJ.jy, month: todayJ.jm };
        window.selectedCalendarDay = todayJ.jd;
    }
}

function renderMiniCalendar() {
    const calendarLabel = document.getElementById('calendarMonthLabel');
    const calendarContainer = document.getElementById('miniCalendar');
    if (!calendarLabel || !calendarContainer) return;

    ensureMiniCalendarState();
    const { year, month } = miniCalendarState;
    const todayJ = jalaali.toJalaali(new Date());
    const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
    const weekDays = ['ش','ی','د','س','چ','پ','ج'];

    calendarLabel.textContent = `${months[month - 1]} ${formatFaPlain(year)}`;

    const firstDay = jalaali.toGregorian(year, month, 1);
    const firstDate = new Date(firstDay.gy, firstDay.gm - 1, firstDay.gd);
    const firstDayIndex = (firstDate.getDay() + 1) % 7;
    const daysInMonth = jalaali.jalaaliMonthLength(year, month);
    const fallbackSelectedDay = year === todayJ.jy && month === todayJ.jm ? todayJ.jd : 1;
    const selectedDay = Math.min(window.selectedCalendarDay || fallbackSelectedDay, daysInMonth);
    window.selectedCalendarDay = selectedDay;
    const decoratedDates = getCalendarDecoratedDates();

    let html = '<div class="calendar-weekdays">';
    weekDays.forEach(day => html += `<div>${day}</div>`);
    html += '</div><div class="calendar-days">';

    for (let index = 0; index < firstDayIndex; index += 1) {
        html += '<div class="calendar-empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const isToday = day === todayJ.jd && month === todayJ.jm && year === todayJ.jy;
        const isSelected = day === selectedDay;
        const dateKey = normalizeJalaaliDateKey(`${year}-${month}-${day}`);
        const hasItems = decoratedDates.has(dateKey);
        html += `<button class="calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${hasItems ? ' has-items' : ''}" type="button" onclick="selectCalendarDay(${day})">${formatFaPlain(day)}</button>`;
    }

    html += '</div>';
    calendarContainer.innerHTML = html;
    renderCalendarEvents(selectedDay);
}

function shiftMiniCalendarMonth(offset) {
    ensureMiniCalendarState();

    let nextYear = miniCalendarState.year;
    let nextMonth = miniCalendarState.month + offset;

    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
    } else if (nextMonth < 1) {
        nextMonth = 12;
        nextYear -= 1;
    }

    miniCalendarState = { year: nextYear, month: nextMonth };
    const daysInMonth = jalaali.jalaaliMonthLength(nextYear, nextMonth);
    window.selectedCalendarDay = Math.min(window.selectedCalendarDay || 1, daysInMonth);
    renderMiniCalendar();
}

function selectCalendarDay(day) {
    window.selectedCalendarDay = day;
    renderMiniCalendar();
}

function renderCalendarEvents(day) {
    const eventsContainer = document.querySelector('.calendar-events');
    if (!eventsContainer) return;
    const dayPrograms = getProgramsForDay(day);
    eventsContainer.innerHTML = dayPrograms.length
        ? dayPrograms.map(program => `<div class="calendar-event"><span>${program.time || 'تمام روز'}</span> ${program.title}</div>`).join('')
        : '<div class="calendar-event"><span>بدون رویداد</span> برای این روز برنامه‌ای ثبت نشده است</div>';
}

function getProgramsForDay(day) {
    ensureMiniCalendarState();
    const { year, month } = miniCalendarState;
    const now = new Date();
    const targetKey = normalizeJalaaliDateKey(`${year}-${month}-${day}`);
    const eventPrograms = getAllCalendarEvents(now, new Date(now.getFullYear(), now.getMonth() + 2, now.getDate()), { includeAdhan: false })
        .filter(event => normalizeJalaaliDateKey(event.date) === targetKey)
        .sort((a, b) => sanitizeTimingValue(a.time || `${a.hour ?? 99}:00`).localeCompare(sanitizeTimingValue(b.time || `${b.hour ?? 99}:00`)))
        .map(event => ({
            time: event.time ? formatFaText(event.time) : event.hour !== undefined && event.hour !== '' ? `${formatFaText(String(event.hour).padStart(2, '0'))}:۰۰` : 'تمام روز',
            title: event.title
        }));

    return [...eventPrograms, ...getTasksForJalaaliDateKey(targetKey)].slice(0, 5);
}

function goToCalendarPage() {
    window.location.href = 'calendar.html';
}

function scrollToTodayPlans() {
    const target = document.getElementById('todaySection');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function openTasks() {
    window.location.href = 'tasks.html';
}

function loadWeeklyStats() {
    const weeklyTasksEl = document.getElementById('weeklyTasks');
    const weeklyHabitsEl = document.getElementById('weeklyHabits');
    const weeklyCaloriesEl = document.getElementById('weeklyCalories');
    const weeklyEventsEl = document.getElementById('weeklyEvents');
    if (!weeklyTasksEl || !weeklyHabitsEl || !weeklyCaloriesEl || !weeklyEventsEl) {
        return;
    }

    const tasks = dashboardData?.readTasks ? dashboardData.readTasks() : JSON.parse(localStorage.getItem('advancedTasks') || '[]');
    const habits = JSON.parse(localStorage.getItem('myHabits') || '[]');
    const dietLog = JSON.parse(localStorage.getItem('myDietLog') || '[]');
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const events = getAllCalendarEvents(weekStart, today);

    const weeklyTasks = tasks.filter(item => {
        if (item.recurring !== 'none' && Array.isArray(item.completionHistory)) {
            return item.completionHistory.some(date => weekDates.includes(normalizeGregorianDate(date)));
        }
        return item.completed && weekDates.includes(normalizeGregorianDate(item.completedAt || item.createdAt || item.dueDate));
    }).length;
    const weeklyHabits = habits.reduce((sum, item) => sum + ((item.history || []).filter(date => weekDates.includes(date)).length), 0);
    const weeklyCalories = dietLog.filter(item => weekDates.includes(item.date)).reduce((sum, item) => sum + (item.cal || 0), 0);
    const weeklyEvents = events.filter(item => {
        if (!item.date) return false;
        const [jy, jm, jd] = String(item.date).split('-').map(Number);
        if ([jy, jm, jd].some(Number.isNaN)) return false;
        const gregorian = jalaali.toGregorian(jy, jm, jd);
        return weekDates.includes(normalizeGregorianDate(new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd)));
    }).length;

    weeklyTasksEl.textContent = formatFa(weeklyTasks);
    weeklyHabitsEl.textContent = formatFa(weeklyHabits);
    weeklyCaloriesEl.textContent = `${formatFa(weeklyCalories)} کیلوکالری`;
    weeklyEventsEl.textContent = formatFa(weeklyEvents);
}

function readLifeSyncArrays() {
    return {
        tasks: safeJsonParse(localStorage.getItem('advancedTasks') || '[]', []),
        habits: safeJsonParse(localStorage.getItem('myHabits') || '[]', []),
        dietLog: safeJsonParse(localStorage.getItem('myDietLog') || '[]', []),
        goals: safeJsonParse(localStorage.getItem('goals') || '[]', []),
        assets: safeJsonParse(localStorage.getItem('financeAssets') || '[]', []),
        meditationStats: safeJsonParse(localStorage.getItem('meditationStats') || '{}', {}),
        exercises: safeJsonParse(localStorage.getItem('fitnessExercises') || '[]', []),
        socialUsers: safeJsonParse(localStorage.getItem('socialUsers') || '[]', []),
        socialMessages: safeJsonParse(localStorage.getItem('socialMessages') || '[]', [])
    };
}

function calculateLastDaysAverageCalories(dietLog, days) {
    const now = new Date();
    let total = 0;
    for (let i = 0; i < days; i += 1) {
        const cursor = new Date(now);
        cursor.setDate(now.getDate() - i);
        const key = cursor.toLocaleDateString('en-CA');
        total += dietLog.filter(item => item.date === key).reduce((sum, item) => sum + (Number(item.cal) || 0), 0);
    }
    return total / days;
}

function isHabitDueToday(habit, todayDate = new Date()) {
    const recurring = habit?.recurring || 'daily';
    if (recurring === 'daily') return true;
    if (recurring === 'weekly') {
        const recurringDays = Array.isArray(habit?.recurringDays) ? habit.recurringDays.map(Number) : [];
        return recurringDays.includes(todayDate.getDay());
    }
    if (recurring === 'monthly') {
        const jToday = jalaali.toJalaali(todayDate);
        return Number(habit?.dayOfMonth) === jToday.jd;
    }
    return false;
}

function getTodayMissedHabits(habits, todayKey) {
    const todayDate = new Date();
    return habits.filter(habit => {
        if (!isHabitDueToday(habit, todayDate)) return false;
        const history = Array.isArray(habit?.history) ? habit.history.map(normalizeGregorianDate) : [];
        return !history.includes(todayKey);
    });
}

function collectLocalAiSignals({ tasks, habits, dietLog, exercises }) {
    const today = new Date();
    const todayKey = normalizeGregorianDate(today);
    const overdueTasks = tasks.filter(task => !task.completed && task.dueDate && normalizeGregorianDate(task.dueDate) < todayKey);
    const missedHabits = getTodayMissedHabits(habits, todayKey);
    const proteinGoal = Number(safeJsonParse(localStorage.getItem('nutritionTargets') || '{}', {}).proteinMin) || 80;
    const todayProtein = dietLog.filter(item => item.date === todayKey).reduce((sum, item) => sum + (Number(item.pro) || 0), 0);
    const exerciseSessionsWeek = exercises.filter(item => {
        const d = new Date(item.date || item.createdAt || 0);
        return (new Date() - d) <= (7 * 24 * 60 * 60 * 1000);
    }).length;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 1);
    const events = getAllCalendarEvents(weekStart, today);
    const todayJ = jalaali.toJalaali(today);
    const todayJKey = `${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`;
    const timeBuckets = new Map();
    events
        .filter(event => String(event?.date) === todayJKey)
        .forEach(event => {
            const slot = sanitizeTimingValue(event.time || `${event.hour || '99'}:00`) || 'نامشخص';
            const group = timeBuckets.get(slot) || [];
            group.push(event);
            timeBuckets.set(slot, group);
        });
    const scheduleConflicts = Array.from(timeBuckets.entries())
        .filter(([, group]) => group.length >= 2)
        .map(([slot, group]) => ({ slot, count: group.length, titles: group.map(item => item.title).slice(0, 3) }));

    return {
        overdueTasks,
        missedHabits,
        todayProtein,
        proteinGoal,
        exerciseSessionsWeek,
        scheduleConflicts
    };
}

function renderLocalAiPhone(signals) {
    if (AI_SYSTEM_DISABLED) return;
    const widget = document.getElementById('aiPhoneWidget');
    const body = document.getElementById('aiPhoneBody');
    const status = document.getElementById('aiPhoneStatus');
    const closeBtn = document.getElementById('aiPhoneClose');
    if (!widget || !body || !status) return;

    if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.addEventListener('click', () => widget.classList.remove('visible'));
        closeBtn.dataset.bound = 'true';
    }

    const alerts = [];
    if (signals.overdueTasks.length > 0) {
        alerts.push({
            title: 'تسک از دست‌رفته',
            body: `${formatFa(signals.overdueTasks.length)} تسک عقب‌مانده است. اولین اقدام: یک تسک را همین حالا به «انجام امروز» منتقل کن.`
        });
    }
    if (signals.missedHabits.length > 0) {
        alerts.push({
            title: 'عادتِ جامانده',
            body: `${formatFa(signals.missedHabits.length)} عادت امروز هنوز ثبت نشده. اگر کمتر از ۲ دقیقه زمان می‌برد، همین الان انجامش بده.`
        });
    }
    if (signals.scheduleConflicts.length > 0) {
        const topConflict = signals.scheduleConflicts[0];
        alerts.push({
            title: 'تداخل برنامه',
            body: `در ساعت ${formatFaText(topConflict.slot)} حداقل ${formatFa(topConflict.count)} رویداد داری. یکی را جابه‌جا کن تا فشار زمانی کم شود.`
        });
    }
    if (signals.todayProtein < signals.proteinGoal * 0.65) {
        alerts.push({
            title: 'افت تغذیه',
            body: `پروتئین امروز ${formatFa(Math.round(signals.todayProtein))} از هدف ${formatFa(signals.proteinGoal)} است. یک وعده پروتئینی سبک اضافه کن.`
        });
    }
    if (signals.exerciseSessionsWeek === 0) {
        alerts.push({
            title: 'عقب‌ماندگی فعالیت بدنی',
            body: 'این هفته هنوز تمرینی ثبت نشده؛ حتی ۱۰ دقیقه پیاده‌روی هم شاخص را بهتر می‌کند.'
        });
    }

    if (alerts.length === 0) {
        widget.classList.remove('visible');
        return;
    }

    body.innerHTML = alerts.map(item => `
        <article class="ai-phone-alert">
            <strong>${item.title}</strong>
            <span>${item.body}</span>
        </article>
    `).join('');
    status.textContent = `آخرین پایش: ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} • ${formatFa(alerts.length)} هشدار فعال.`;
    widget.classList.add('visible');
}

function renderSmartModules() {
    const host = document.getElementById('smartModulesGrid');
    if (!host) return;
    if (AI_SYSTEM_DISABLED) {
        host.innerHTML = '';
        return;
    }
    const { tasks, habits, dietLog, goals, assets, exercises, socialMessages } = readLifeSyncArrays();
    const signals = collectLocalAiSignals({ tasks, habits, dietLog, exercises });
    const activeGoals = goals.filter(goal => (goal.status || 'active') === 'active');
    const avgGoalProgress = activeGoals.length
        ? activeGoals.reduce((sum, goal) => sum + Math.max(0, Math.min(100, Number(goal.progress) || 0)), 0) / activeGoals.length
        : 0;
    const openTasks = tasks.filter(task => !task.completed).length;
    const weeklyExerciseMinutes = exercises
        .filter(item => (new Date() - new Date(item.date || item.createdAt || 0)) <= (7 * 24 * 60 * 60 * 1000))
        .reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
    const avgCalories7 = calculateLastDaysAverageCalories(dietLog, 7);
    const financeTotal = assets.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
    const lastMessage = socialMessages
        .slice()
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0];
    const daysSinceSocialTouch = lastMessage?.timestamp
        ? Math.floor((new Date() - new Date(lastMessage.timestamp)) / (24 * 60 * 60 * 1000))
        : 99;

    const modules = [
        {
            title: 'AI Weekly CEO',
            score: Math.max(0, 100 - (openTasks * 2) - (signals.overdueTasks.length * 4)),
            text: signals.overdueTasks.length > 0
                ? `این هفته ${formatFa(signals.overdueTasks.length)} عقب‌ماندگی داری؛ ۳ کار کم‌اثر را حذف و روی ۱ خروجی اصلی تمرکز کن.`
                : 'حجم کار کنترل شده است؛ هفته بعد یک هدف درآمدی/یادگیریِ سطح بالا تعریف کن.'
        },
        {
            title: 'Conflict Auto-Resolver',
            score: signals.scheduleConflicts.length === 0 ? 92 : Math.max(20, 80 - signals.scheduleConflicts.length * 18),
            text: signals.scheduleConflicts.length
                ? `امروز ${formatFa(signals.scheduleConflicts.length)} تداخل زمانی تشخیص داده شد؛ پیشنهاد: جابه‌جایی اولین تداخل به +۳۰ دقیقه.`
                : 'تداخل زمانی بحرانی دیده نشد؛ برنامه روزانه هماهنگ است.'
        },
        {
            title: 'Energy & Focus Forecast',
            score: Math.max(10, Math.min(100, 55 + Math.round((weeklyExerciseMinutes / 30) * 5) - (signals.overdueTasks.length * 3))),
            text: `برآورد انرژی فردا: ${weeklyExerciseMinutes >= 90 ? 'بالا' : 'متوسط'}. بلوک تمرکز عمیق را صبح ۹ تا ۱۱ بگذار.`
        },
        {
            title: 'Habit Protocol Generator',
            score: Math.max(0, 100 - (signals.missedHabits.length * 9)),
            text: signals.missedHabits.length
                ? `${formatFa(signals.missedHabits.length)} عادت جا مانده؛ نسخه ۲ دقیقه‌ای همان عادت را امروز انجام بده تا زنجیره حفظ شود.`
                : 'پایداری عادت خوب است؛ از فردا شدت یکی از عادت‌ها را ۱۰٪ بالا ببر.'
        },
        {
            title: 'Financial Drift Detector',
            score: financeTotal > 0 ? 78 : 35,
            text: financeTotal > 0
                ? `دارایی تجمیعی: ${formatFa(Math.round(financeTotal))}. نسبت هدف فعال به بودجه را هفتگی بازبینی کن.`
                : 'داده مالی کافی نیست؛ حداقل یک دارایی یا برنامه اقساط ثبت کن تا تحلیل دقیق شود.'
        },
        {
            title: 'Goal Probability Engine',
            score: Math.round(avgGoalProgress),
            text: activeGoals.length
                ? `میانگین احتمال تحقق اهداف فعال: ${formatFa(Math.round(avgGoalProgress))}٪. اهداف زیر ۴۰٪ را بازطراحی کن.`
                : 'هدف فعالی ثبت نشده؛ یک هدف ۳۰ روزه با KPI واضح تعریف کن.'
        },
        {
            title: 'Social Relationship Intelligence',
            score: Math.max(5, 100 - (daysSinceSocialTouch * 8)),
            text: daysSinceSocialTouch > 3
                ? `${formatFa(daysSinceSocialTouch)} روز از آخرین تعامل گذشته؛ یک پیام پیگیری کوتاه ارسال کن.`
                : 'ریتم ارتباط اجتماعی مناسب است؛ روی کیفیت مکالمه بعدی تمرکز کن.'
        },
        {
            title: 'Recovery Guard',
            score: Math.max(15, 100 - (signals.overdueTasks.length * 6) - (signals.todayProtein < signals.proteinGoal ? 18 : 0)),
            text: signals.overdueTasks.length >= 3 || signals.todayProtein < signals.proteinGoal
                ? 'ریسک فرسودگی بالا رفته؛ برنامه ۴۸ ساعته سبک با خواب، پیاده‌روی و کاهش بار تسک اجرا شود.'
                : 'نشانه فرسودگی حاد دیده نشد؛ تعادل فعلی را حفظ کن.'
        }
    ];

    host.innerHTML = modules.map(item => `
        <article class="smart-module-card">
            <h4>${item.title}</h4>
            <div class="smart-score">Smart Score: ${formatFa(Math.round(item.score))} / ۱۰۰</div>
            <p>${item.text}</p>
        </article>
    `).join('');
}

function getGregorianDateOffset(days = 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return normalizeGregorianDate(d);
}

function getJalaaliDateFromGregorianKey(gregorianKey) {
    const date = new Date(gregorianKey);
    const j = jalaali.toJalaali(date);
    return `${j.jy}-${j.jm}-${j.jd}`;
}

function readTasksForOptimization() {
    return safeJsonParse(localStorage.getItem('advancedTasks') || '[]', []);
}

function saveTasksForOptimization(tasks) {
    localStorage.setItem('advancedTasks', JSON.stringify(tasks));
}

function readEventsForOptimization() {
    return safeJsonParse(localStorage.getItem('proEvents') || '[]', []);
}

function saveEventsForOptimization(events) {
    localStorage.setItem('proEvents', JSON.stringify(events));
}

function buildOptimizationAdvice() {
    const { tasks, habits, dietLog, goals, assets, exercises, socialMessages } = readLifeSyncArrays();
    const signals = collectLocalAiSignals({ tasks, habits, dietLog, exercises });
    const todayKey = normalizeGregorianDate(new Date());
    const todayCalories = dietLog.filter(item => item.date === todayKey).reduce((sum, item) => sum + (Number(item.cal) || 0), 0);
    const activeGoals = goals.filter(goal => (goal.status || 'active') === 'active');
    const financeTotal = assets.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
    const lastMessage = socialMessages
        .slice()
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0];
    const daysSinceSocialTouch = lastMessage?.timestamp
        ? Math.floor((new Date() - new Date(lastMessage.timestamp)) / (24 * 60 * 60 * 1000))
        : 99;

    const lines = [
        '🔬 جمع‌بندی بهینگی (مبتنی بر اصول مدیریت انرژی، قانون پارکینسون و برنامه‌ریزی مبتنی بر شواهد):'
    ];
    const suggestions = [];

    if (signals.overdueTasks.length > 0) {
        lines.push(`• ${formatFa(signals.overdueTasks.length)} تسک عقب‌مانده داری؛ برای هر روز حداکثر ۳ کار کلیدی بگذار (MIT Rule) و بقیه را زمان‌بندی مجدد کن.`);
    } else {
        lines.push('• وضعیت تسک‌ها خوب است؛ یک بلوک Deep Work ثابت ۹۰ دقیقه‌ای به برنامه روزانه اضافه کن.');
    }

    if (signals.scheduleConflicts.length > 0) {
        lines.push(`• ${formatFa(signals.scheduleConflicts.length)} تداخل زمانی دیده شد؛ بین رویدادهای پشت‌سرهم ۱۵ دقیقه Buffer بگذار تا شکست برنامه کم شود.`);
        suggestions.push({
            id: 'defer_routine_tasks',
            label: 'دو کار روزمره/جلسه را فردا منتقل کنم تا جا برای کار مهم باز شود؟'
        });
    }

    if (signals.missedHabits.length > 0) {
        lines.push(`• ${formatFa(signals.missedHabits.length)} عادت جامانده؛ از الگوی «نسخه ۲ دقیقه‌ای» استفاده کن تا پیوستگی حفظ شود.`);
    }

    if (todayCalories < 1200) {
        lines.push('• کالری امروز پایین است؛ برای پایداری شناختی یک وعده سبک پروتئین+کربوهیدرات پیچیده اضافه کن.');
    }

    if (activeGoals.length === 0) {
        lines.push('• جای خالی برنامه: هیچ هدف فعالی ثبت نشده. یک هدف ۳۰ روزه قابل اندازه‌گیری اضافه کن.');
    } else {
        lines.push(`• ${formatFa(activeGoals.length)} هدف فعال داری؛ هر هدف را به شاخص هفتگی تبدیل کن تا قابل پیگیری شود.`);
    }

    if (financeTotal <= 0) {
        lines.push('• جای خالی برنامه: داده مالی کافی نداری. حداقل یک دارایی/قسط اضافه کن تا تحلیل ریسک واقعی شود.');
    }

    if (daysSinceSocialTouch > 4) {
        lines.push(`• ${formatFa(daysSinceSocialTouch)} روز از آخرین تعامل اجتماعی گذشته؛ یک پیام پیگیری کوتاه برای حفظ کیفیت رابطه بفرست.`);
    }

    if (exercises.length === 0) {
        lines.push('• جای خالی برنامه: فعالیت بدنی ثبت نشده. هفته‌ای ۳ جلسه ۲۰ دقیقه‌ای به تقویم اضافه کن.');
        suggestions.push({
            id: 'add_workout_block',
            label: 'یک بلوک ورزش ۱۸:۰۰ تا ۱۸:۴۵ امروز به برنامه اضافه کنم؟'
        });
    }

    const hasLanguagePriority = tasks.some(task => !task.completed && /زبان|language/i.test(String(task.title || '')));
    if (hasLanguagePriority) {
        lines.push('• اولویت یادگیری زبان فعال است؛ بهتر است بخشی از جلسات کم‌اهمیت به فردا منتقل شود.');
        suggestions.push({
            id: 'add_language_block',
            label: 'با توجه به اولویت زبان، ساعت ۲۰:۰۰ تا ۲۱:۰۰ برای زبان رزرو کنم؟'
        });
    }

    lines.push('✅ پیشنهاد اجرایی: همین امروز یک «بلوک بهینه‌سازی» ۳۰ دقیقه‌ای در تقویم ثبت کن و موارد بالا را اعمال کن.');
    return { summary: lines.join('\n'), suggestions };
}

function applyOptimizationSuggestion(actionId) {
    const todayG = getGregorianDateOffset(0);
    const tomorrowG = getGregorianDateOffset(1);

    if (actionId === 'add_workout_block') {
        const events = readEventsForOptimization();
        events.push({
            id: `opt-workout-${Date.now()}`,
            title: 'تمرین بهینه‌سازی',
            date: getJalaaliDateFromGregorianKey(todayG),
            time: '18:00 - 18:45',
            hour: '18',
            category: 'ورزش',
            priority: 'medium',
            desc: 'بلوک پیشنهادی AI برای افزایش انرژی و تمرکز'
        });
        saveEventsForOptimization(events);
        return 'بلوک ورزش به تقویم اضافه شد.';
    }

    if (actionId === 'add_language_block') {
        const events = readEventsForOptimization();
        const tasks = readTasksForOptimization();
        events.push({
            id: `opt-language-${Date.now()}`,
            title: 'بلوک تمرکز زبان',
            date: getJalaaliDateFromGregorianKey(todayG),
            time: '20:00 - 21:00',
            hour: '20',
            category: 'آموزش',
            priority: 'high',
            desc: 'پیشنهاد AI برای پیشروی هدف زبان'
        });
        tasks.push({
            id: Date.now(),
            title: 'تمرین زبان (بلوک AI)',
            category: 'study',
            priority: 'high',
            dueDate: todayG,
            recurring: 'none',
            completed: false,
            createdAt: new Date().toISOString()
        });
        saveEventsForOptimization(events);
        saveTasksForOptimization(tasks);
        return 'بلوک زبان به تقویم و لیست تسک اضافه شد.';
    }

    if (actionId === 'defer_routine_tasks') {
        const tasks = readTasksForOptimization();
        let moved = 0;
        const updated = tasks.map(task => {
            if (moved >= 2) return task;
            if (task.completed) return task;
            const title = String(task.title || '');
            const isRoutine = /جلسه|روزمره|اداری|meeting/i.test(title) || task.priority === 'low';
            const due = normalizeGregorianDate(task.dueDate || '');
            if (isRoutine && (!due || due <= todayG)) {
                moved += 1;
                return { ...task, dueDate: tomorrowG };
            }
            return task;
        });
        saveTasksForOptimization(updated);
        return moved > 0
            ? `${formatFa(moved)} تسک کم‌اولویت به فردا منتقل شد.`
            : 'تسک مناسب برای انتقال پیدا نشد.';
    }

    return 'اقدامی اعمال نشد.';
}

function bindOptimizationButton() {
    const btn = document.getElementById('optimizationBtn');
    const panel = document.getElementById('optimizationPanel');
    if (!btn || !panel || btn.dataset.bound) return;
    if (AI_SYSTEM_DISABLED) {
        btn.disabled = true;
        btn.textContent = 'بهینگی موقتاً غیرفعال است';
        panel.classList.remove('visible');
        panel.innerHTML = '';
        return;
    }
    btn.addEventListener('click', () => {
        const { summary, suggestions } = buildOptimizationAdvice();
        panel.innerHTML = `
            <div class="optimization-summary">${summary}</div>
            <div class="optimization-actions">
                ${suggestions.map(item => `
                    <div class="optimization-suggestion">
                        <p>${item.label}</p>
                        <button class="optimization-apply" data-action="${item.id}" type="button">اعمال خودکار</button>
                    </div>
                `).join('')}
            </div>
            <div id="optimizationResult" class="optimization-result"></div>
        `;
        panel.classList.add('visible');
    });
    panel.addEventListener('click', event => {
        const target = event.target.closest('.optimization-apply');
        if (!target) return;
        const result = applyOptimizationSuggestion(target.dataset.action);
        const resultNode = document.getElementById('optimizationResult');
        if (resultNode) {
            resultNode.textContent = result;
        }
        renderLifeSyncInsights();
        loadWeeklyStats();
        renderTodaySchedule();
    });
    btn.dataset.bound = 'true';
}

function renderLifeSyncInsights() {
    const container = document.getElementById('lifeSyncList');
    const meter = document.getElementById('lifeSyncMeter');
    if (!container || !meter) return;
    const { tasks, habits, dietLog, goals, assets, meditationStats, exercises } = readLifeSyncArrays();
    const todayKey = normalizeGregorianDate(new Date());
    const overdueTasks = tasks.filter(task => !task.completed && task.dueDate && normalizeGregorianDate(task.dueDate) < todayKey).length;
    const activeGoals = goals.filter(goal => (goal.status || 'active') === 'active').length;
    const avgCalories7 = calculateLastDaysAverageCalories(dietLog, 7);
    const proteinGoal = Number(safeJsonParse(localStorage.getItem('nutritionTargets') || '{}', {}).proteinMin) || 80;
    const todayProtein = dietLog.filter(item => item.date === todayKey).reduce((sum, item) => sum + (Number(item.pro) || 0), 0);
    const weeklyHabitChecks = habits.reduce((sum, habit) => sum + ((habit.history || []).filter(date => {
        const d = new Date(date);
        const now = new Date();
        return (now - d) <= (7 * 24 * 60 * 60 * 1000);
    }).length), 0);
    const assetTotal = assets.reduce((sum, asset) => sum + (Number(asset.totalValue) || 0), 0);
    const meditationMinutes = Number(meditationStats.totalMinutes) || 0;
    const exerciseSessionsWeek = exercises.filter(item => {
        const d = new Date(item.date || item.createdAt || 0);
        return (new Date() - d) <= (7 * 24 * 60 * 60 * 1000);
    }).length;

    const insights = [
        {
            title: '🎯 بهره‌وری و انرژی',
            body: overdueTasks > 0
                ? `${formatFa(overdueTasks)} تسک عقب‌مانده داری. اگر خواب/تغذیه را پایدار کنی فشار ذهنی کمتر می‌شود.`
                : 'تسک عقب‌مانده‌ای نداری؛ زمان خوبی برای پیشبرد اهداف عمیق است.'
        },
        {
            title: '🍎 تغذیه و عملکرد',
            body: `میانگین ۷ روزه کالری: ${formatFa(Math.round(avgCalories7))}. پروتئین امروز ${formatFa(Math.round(todayProtein))}g از هدف ${formatFa(proteinGoal)}g است.`
        },
        {
            title: '🌿 عادت، ورزش و ذهن',
            body: `این هفته ${formatFa(weeklyHabitChecks)} ثبت عادت، ${formatFa(exerciseSessionsWeek)} جلسه تمرین و ${formatFa(meditationMinutes)} دقیقه مدیتیشن ثبت شده است.`
        },
        {
            title: '💰 مالی و برنامه‌ریزی',
            body: `ارزش تقریبی دارایی‌ها: ${formatFa(Math.round(assetTotal))}. بهتر است اهداف فعال (${formatFa(activeGoals)}) با بودجه‌ات هم‌راستا بماند.`
        }
    ];

    container.innerHTML = insights.map(item => `
        <article class="life-sync-card">
            <strong>${item.title}</strong>
            <p>${item.body}</p>
        </article>
    `).join('');

    let score = 100;
    score -= Math.min(35, overdueTasks * 5);
    score -= Math.max(0, 20 - Math.min(20, weeklyHabitChecks));
    score -= Math.max(0, 15 - Math.min(15, exerciseSessionsWeek * 4));
    score -= todayProtein < proteinGoal ? Math.min(20, Math.round((proteinGoal - todayProtein) / 4)) : 0;
    score = Math.max(25, Math.min(100, score));
    const status = score >= 80 ? 'یکپارچگی عالی' : score >= 60 ? 'نیاز به تنظیم' : 'هشدار پیوستگی';
    meter.textContent = `شاخص پیوستگی زندگی: ${formatFa(Math.round(score))} از ۱۰۰ — ${status}.`;

    renderLocalAiPhone(collectLocalAiSignals({ tasks, habits, dietLog, exercises }));
    renderSmartModules();
    bindOptimizationButton();
}


function initAgenticAssistant() {
    if (AI_SYSTEM_DISABLED) {
        const mount = document.getElementById('agentAssistantPanel');
        if (mount) mount.innerHTML = '';
        return;
    }
    const mount = document.getElementById('agentAssistantPanel');
    if (!mount || !window.AgenticAssistantKernel) return;

    mount.innerHTML = `
        <section class="agent-assistant-card" aria-live="polite">
            <div class="agent-assistant-head">
                <h3>🧠 سایه‌یار AURA</h3>
                <span id="assistantConnectionBadge" class="assistant-badge">AI Coach: backend</span>
            </div>
            <p class="assistant-hint">نمونه: «برای امروزم یک برنامه تمرکز بچین» یا «چی را حذف کنم که روزم سبک‌تر شود؟»</p>
            <div class="assistant-config-row">
                <input id="assistantModel" type="text" class="assistant-input" value="gemini-3.1-pro-preview" placeholder="Model">
                <button id="assistantSaveConfig" type="button" class="assistant-btn secondary">ذخیره مدل</button>
            </div>
            <div class="assistant-chat-log" id="assistantChatLog"></div>
            <div class="assistant-action-row">
                <input id="assistantPrompt" type="text" class="assistant-input" placeholder="به دستیار بگو چه کاری انجام دهد...">
                <button id="assistantRun" type="button" class="assistant-btn">اجرا</button>
            </div>
        </section>
    `;

    const hooks = {
        getSignals: () => {
            const { tasks, habits, dietLog, exercises } = readLifeSyncArrays();
            return collectLocalAiSignals({ tasks, habits, dietLog, exercises });
        },
        buildContext: () => {
            const { tasks, habits, dietLog, goals, assets } = readLifeSyncArrays();
            return {
                now: new Date().toISOString(),
                pendingTasks: tasks.filter(task => !task.completed).slice(0, 10),
                habits: habits.slice(0, 10),
                todayDiet: dietLog.filter(item => item.date === normalizeGregorianDate(new Date())),
                goals: goals.slice(0, 8),
                assetsTotal: assets.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0)
            };
        }
    };

    const kernel = window.agenticAssistant || new window.AgenticAssistantKernel({
        hooks,
        onDataChanged: () => {
            renderLifeSyncInsights();
            renderTodaySchedule();
            loadWeeklyStats();
        }
    });
    kernel.hooks = hooks;

    const modelInput = document.getElementById('assistantModel');
    const saveBtn = document.getElementById('assistantSaveConfig');
    const runBtn = document.getElementById('assistantRun');
    const promptInput = document.getElementById('assistantPrompt');
    const chatLog = document.getElementById('assistantChatLog');
    const badge = document.getElementById('assistantConnectionBadge');

    function appendChat(role, text) {
        if (!chatLog) return;
        const node = document.createElement('article');
        node.className = `assistant-message ${role}`;
        node.innerHTML = `<strong>${role === 'assistant' ? 'دستیار' : 'شما'}</strong><p>${String(text || '').replace(/</g, '&lt;')}</p>`;
        chatLog.appendChild(node);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function refreshStatus() {
        const settings = kernel.getSettings();
        const remoteMode = settings.provider !== 'local';
        badge.textContent = remoteMode
            ? `AI Coach: ${settings.model || 'backend'}`
            : 'حالت داخلی: فعال';
        badge.classList.toggle('connected', remoteMode);
    }

    const history = kernel.getHistory();
    history.slice(-10).forEach(item => appendChat(item.role, item.text));

    saveBtn.addEventListener('click', () => {
        kernel.configureProvider({
            provider: 'gapgpt',
            model: modelInput.value.trim() || 'gemini-3.1-pro-preview'
        });
        refreshStatus();
        appendChat('assistant', 'مدل دستیار ذخیره شد. کلید API از سمت سرور استفاده می‌شود.');
    });

    runBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) return;
        promptInput.value = '';
        appendChat('user', prompt);
        runBtn.disabled = true;
        try {
            const response = await kernel.run(prompt);
            appendChat('assistant', response);
            renderLifeSyncInsights();
        } catch (error) {
            appendChat('assistant', `خطا: ${error.message}`);
        } finally {
            runBtn.disabled = false;
        }
    });

    promptInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runBtn.click();
        }
    });

    kernel.startMonitoring();
    refreshStatus();
    window.agenticAssistant = kernel;
}

function initializeUserOnboarding() {
    if (AI_SYSTEM_DISABLED) return;
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    const PROFILE_KEY = 'userProfile';
    const existing = safeJsonParse(localStorage.getItem(PROFILE_KEY) || 'null', null);
    if (existing) return;

    const submitBtn = document.getElementById('onboardingSubmit');
    const skipBtn = document.getElementById('onboardingSkip');
    if (!submitBtn || !skipBtn) return;

    function skipAndClose() {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({
            skipped: true,
            createdAt: new Date().toISOString()
        }));
        overlay.classList.remove('visible');
    }

    overlay.classList.add('visible');
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            skipAndClose();
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay.classList.contains('visible')) {
            skipAndClose();
        }
    });

    function collectProfile() {
        return {
            name: document.getElementById('onboardingName')?.value?.trim() || '',
            prayer: document.getElementById('onboardingPrayer')?.value || 'yes',
            exercise: document.getElementById('onboardingExercise')?.value || 'yes',
            exerciseTypes: document.getElementById('onboardingExerciseTypes')?.value?.trim() || '',
            exerciseFrequency: Number(document.getElementById('onboardingExerciseFrequency')?.value) || 0,
            keyHabits: document.getElementById('onboardingHabits')?.value?.trim() || '',
            lifeGoals: document.getElementById('onboardingGoals')?.value?.trim() || '',
            personality: {
                laziness: Number(document.getElementById('onboardingLaziness')?.value) || 3,
                punctuality: Number(document.getElementById('onboardingPunctuality')?.value) || 3,
                focus: Number(document.getElementById('onboardingFocus')?.value) || 3
            },
            coachingStyle: document.getElementById('onboardingCoachingStyle')?.value || 'balanced',
            custom: document.getElementById('onboardingCustom')?.value?.trim() || '',
            createdAt: new Date().toISOString()
        };
    }

    function addPrayerHabitIfNeeded(profile) {
        if (profile.prayer !== 'yes') return;
        const habits = safeJsonParse(localStorage.getItem('myHabits') || '[]', []);
        const exists = habits.some(item => /نماز/.test(String(item?.name || item?.title || '')));
        if (exists) return;
        habits.push({
            id: Date.now(),
            name: 'نماز روزانه',
            category: 'spiritual',
            recurring: 'daily',
            streak: 0,
            history: [],
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('myHabits', JSON.stringify(habits));
    }

    function addPrayerRemindersIfNeeded(profile) {
        if (profile.prayer !== 'yes' || !window.agenticAssistant?.addReminder) return;
        const today = normalizeGregorianDate(new Date());
        const slots = [
            ['یادآوری نماز صبح', `${today}T05:00:00`],
            ['یادآوری نماز ظهر', `${today}T12:15:00`],
            ['یادآوری نماز مغرب', `${today}T18:30:00`]
        ];
        slots.forEach(([text, dueAt]) => {
            window.agenticAssistant.addReminder({ text, dueAt, severity: 'high', tag: `prayer-${text}` });
        });
    }

    function finalizeProfile(profile) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        addPrayerHabitIfNeeded(profile);
        addPrayerRemindersIfNeeded(profile);
        overlay.classList.remove('visible');
        renderLifeSyncInsights();
        renderHomeGlanceStrip();
        showPageToast('پروفایل شخصی‌سازی ذخیره شد ✅');
    }

    submitBtn.addEventListener('click', () => {
        finalizeProfile(collectProfile());
    });

    skipBtn.addEventListener('click', () => {
        skipAndClose();
    });
}

window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('dashboardTheme') || 'light';
    setTheme(savedTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        updateHeaderClock();
        setInterval(updateHeaderClock, 1000);
    }
    const dailyQuote = document.getElementById('dailyQuote');
    if (dailyQuote) {
        pickDailyQuote();
    }
    const timerDisplay = document.getElementById('timerDisplay');
    const stopwatchDisplay = document.getElementById('stopwatchDisplay');
    const miniCalendar = document.getElementById('miniCalendar');
    if (timerDisplay || stopwatchDisplay || miniCalendar) {
        loadDashboardSnapshot();
        renderTodaySchedule();
        renderGoalFocus();
        renderHomeGlanceStrip();
        initializeMoodCheckin();
        initializeFocusRoulette();
        initializeWallpaperPicker();
        renderTodayPrayerTimes();
        renderLifeSyncInsights();
        initAgenticAssistant();
        initializeUserOnboarding();
        if (timerDisplay) {
            initializeDashboardTimerControls();
        }
        if (stopwatchDisplay) {
            initializeDashboardStopwatchControls();
            restoreDashboardStopwatch();
        }
        if (miniCalendar) {
            renderMiniCalendar();
        }
        if (timerDisplay) {
            restoreDashboardTimer();
        }
        loadWeeklyStats();
        ensureAdhanDataForCurrentYear()
            .then(() => {
                if (miniCalendar) {
                    renderMiniCalendar();
                }
                renderTodayPrayerTimes();
                renderTodaySchedule();
                renderGoalFocus();
                renderHomeGlanceStrip();
                loadWeeklyStats();
                renderLifeSyncInsights();
            })
            .catch(error => {
                console.error('Unable to load prayer times:', error);
                renderTodayPrayerTimes();
            });
    }
});

window.addEventListener('storage', event => {
    const adhanStoragePrefixMatch = String(event.key || '').startsWith(ADHAN_STORAGE_KEY_PREFIX);
    if (!DASHBOARD_STORAGE_SYNC_KEYS.includes(event.key) && !adhanStoragePrefixMatch) {
        return;
    }
    loadDashboardSnapshot();
    renderTodaySchedule();
    renderGoalFocus();
    renderHomeGlanceStrip();
    renderTodayPrayerTimes();
    loadWeeklyStats();
    renderLifeSyncInsights();
    if (document.getElementById('miniCalendar')) {
        renderMiniCalendar();
    }
});

window.addEventListener('languagechange', () => {
    if (document.getElementById('headerDate')) {
        updateHeaderClock();
    }
    if (document.getElementById('timerDisplay') || document.getElementById('stopwatchDisplay') || document.getElementById('miniCalendar')) {
        loadDashboardSnapshot();
        renderTodaySchedule();
        renderGoalFocus();
        renderHomeGlanceStrip();
        renderTodayPrayerTimes();
        loadWeeklyStats();
        renderLifeSyncInsights();
        if (document.getElementById('miniCalendar')) {
            renderMiniCalendar();
        }
    }
});

Object.assign(window, {
    setDashboardTimer,
    toggleDashboardTimer,
    resetDashboardTimer,
    toggleDashboardStopwatch,
    resetDashboardStopwatch,
    selectCalendarDay,
    shiftMiniCalendarMonth,
    goToCalendarPage,
    scrollToTodayPlans,
    openTasks,
    updateGoalProgress,
    saveMonthlyGoalProgress
});
