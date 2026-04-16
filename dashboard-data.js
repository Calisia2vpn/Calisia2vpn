(function (global) {
    'use strict';

    const TASK_STORAGE_KEY = 'advancedTasks';
    const USER_EVENTS_STORAGE_KEY = 'proEvents';
    const HABITS_STORAGE_KEY = 'myHabits';
    const GOALS_STORAGE_KEY = 'goals';
    const FOOD_STORAGE_KEY = 'myFoodDB';
    const NUTRITION_TARGETS_KEY = 'nutritionTargets';
    const LIFE_PLAN_BOOTSTRAP_KEY = 'lifePlanBootstrapVersion';
    const LIFE_PLAN_BOOTSTRAP_VERSION = '2026-04-life-v1';

    const PERSIAN_WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    const TASK_CATEGORY_META = {
        personal: { label: 'شخصی', color: '#9b59b6' },
        work: { label: 'کاری', color: '#1a73e8' },
        study: { label: 'درسی', color: '#5e60ce' },
        health: { label: 'سلامتی', color: '#1fb580' },
        shopping: { label: 'خرید', color: '#f39c12' },
        other: { label: 'سایر', color: '#6c757d' }
    };
    const HABIT_CATEGORY_META = {
        health: { label: 'سلامتی', color: '#2ecc71' },
        learning: { label: 'درسی', color: '#3498db' },
        fitness: { label: 'ورزشی', color: '#e67e22' },
        personal: { label: 'شخصی', color: '#9b59b6' }
    };

    function safeReadArray(key) {
        try {
            const raw = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch {
            return [];
        }
    }

    function safeWriteArray(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function stripTime(dateLike) {
        const date = new Date(dateLike);
        if (Number.isNaN(date.getTime())) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function normalizeGregorianDate(dateLike) {
        if (!dateLike) return '';
        if (typeof dateLike === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateLike)) {
            return dateLike;
        }
        const date = stripTime(dateLike);
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function makeDateFromGregorianKey(dateKey) {
        if (!dateKey) return null;
        const parts = String(dateKey).split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return stripTime(dateKey);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function normalizeJalaaliDateKey(value) {
        if (!value) return '';
        const parts = String(value).split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return String(value);
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }

    function gregorianDateToJalaaliKey(dateLike) {
        const date = makeDateFromGregorianKey(normalizeGregorianDate(dateLike)) || stripTime(dateLike);
        if (!date || typeof jalaali === 'undefined') return '';
        const jDate = jalaali.toJalaali(date);
        return normalizeJalaaliDateKey(`${jDate.jy}-${jDate.jm}-${jDate.jd}`);
    }

    function jalaaliKeyToGregorianDate(dateKey) {
        const normalized = normalizeJalaaliDateKey(dateKey);
        const parts = normalized.split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN) || typeof jalaali === 'undefined') return null;
        const gregorian = jalaali.toGregorian(parts[0], parts[1], parts[2]);
        return new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
    }

    function getCurrentJalaaliYear() {
        if (typeof jalaali === 'undefined') return null;
        return jalaali.toJalaali(new Date()).jy;
    }

    function getAdhanStorageKey(year = getCurrentJalaaliYear()) {
        if (!year) return 'adhanEvents1405';
        return `adhanEvents${year}`;
    }

    function getPersianWeekdayIndex(dateLike) {
        const date = stripTime(dateLike);
        if (!date) return 0;
        return (date.getDay() + 1) % 7;
    }

    function normalizeTime(value) {
        if (!value) return '';
        const match = String(value).match(/(\d{1,2}):(\d{2})/);
        if (!match) return '';
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }

    function sanitizeTimingValue(value) {
        return normalizeTime(String(value || '').split(' ')[0]);
    }

    function buildTimeRange(startTime, endTime) {
        const normalizedStart = normalizeTime(startTime);
        const normalizedEnd = normalizeTime(endTime);
        if (normalizedStart && normalizedEnd) return `${normalizedStart} - ${normalizedEnd}`;
        return normalizedStart || normalizedEnd || '';
    }

    function getTimeSortValue(value) {
        const time = sanitizeTimingValue(value);
        if (!time) return 24 * 60;
        const [hour, minute] = time.split(':').map(Number);
        return (hour * 60) + minute;
    }

    function compareGregorianKeys(a, b) {
        return normalizeGregorianDate(a).localeCompare(normalizeGregorianDate(b));
    }

    function inferTaskRecurringDays(task) {
        if (Array.isArray(task.recurringDays) && task.recurringDays.length) {
            return task.recurringDays;
        }
        const anchorDate = task.dueDate || task.createdAt || new Date();
        return [getPersianWeekdayIndex(anchorDate)];
    }

    function normalizeTask(task) {
        const recurring = ['daily', 'weekly', 'monthly'].includes(task?.recurring) ? task.recurring : 'none';
        const createdAt = task?.createdAt || new Date().toISOString();
        const dueDate = normalizeGregorianDate(task?.dueDate || (recurring !== 'none' ? createdAt : ''));
        const subtasks = Array.isArray(task?.subtasks)
            ? task.subtasks
                .filter(Boolean)
                .map((subtask, index) => ({
                    id: Number.isFinite(subtask?.id) ? subtask.id : index,
                    text: String(subtask?.text || '').trim(),
                    completed: Boolean(subtask?.completed)
                }))
                .filter(subtask => subtask.text)
            : [];
        let recurringDays = Array.isArray(task?.recurringDays)
            ? task.recurringDays.map(Number).filter(value => Number.isInteger(value) && value >= 0 && value <= 6)
            : [];
        if (recurring === 'weekly' && recurringDays.length === 0) {
            recurringDays = inferTaskRecurringDays({ ...task, dueDate, createdAt });
        }
        recurringDays = Array.from(new Set(recurringDays)).sort((left, right) => left - right);

        return {
            id: task?.id || Date.now(),
            title: String(task?.title || '').trim(),
            description: String(task?.description || '').trim(),
            category: task?.category || 'other',
            priority: ['high', 'medium', 'low'].includes(task?.priority) ? task.priority : 'low',
            dueDate,
            dueTime: normalizeTime(task?.dueTime),
            endTime: normalizeTime(task?.endTime),
            recurring,
            recurringDays,
            recurringUntil: normalizeGregorianDate(task?.recurringUntil),
            monthlyByJalaaliDay: Boolean(task?.monthlyByJalaaliDay),
            subtasks,
            completed: recurring === 'none' ? Boolean(task?.completed) : false,
            createdAt,
            completedAt: recurring === 'none' ? (task?.completedAt || null) : null,
            completionHistory: Array.isArray(task?.completionHistory)
                ? task.completionHistory.map(normalizeGregorianDate).filter(Boolean)
                : [],
            tags: Array.isArray(task?.tags) ? task.tags : [],
            syncToCalendar: task?.syncToCalendar !== false
        };
    }

    function readTasks() {
        return safeReadArray(TASK_STORAGE_KEY).map(normalizeTask);
    }

    function writeTasks(tasks) {
        safeWriteArray(TASK_STORAGE_KEY, tasks.map(normalizeTask));
    }

    function normalizeHabit(habit) {
        const createdAt = normalizeGregorianDate(habit?.createdAtG || habit?.createdAt || new Date());
        let recurringDays = Array.isArray(habit?.recurringDays)
            ? habit.recurringDays.map(Number).filter(value => Number.isInteger(value) && value >= 0 && value <= 6)
            : [];
        if ((habit?.recurring || 'daily') === 'weekly' && recurringDays.length === 0) {
            recurringDays = [getPersianWeekdayIndex(createdAt)];
        }
        return {
            id: habit?.id || Date.now(),
            title: String(habit?.title || '').trim(),
            icon: String(habit?.icon || '🌿'),
            category: habit?.category || 'personal',
            time: normalizeTime(habit?.time),
            recurring: ['daily', 'weekly', 'monthly'].includes(habit?.recurring) ? habit.recurring : 'daily',
            recurringDays: Array.from(new Set(recurringDays)).sort((left, right) => left - right),
            dayOfMonth: Number(habit?.dayOfMonth) || 1,
            history: Array.isArray(habit?.history) ? habit.history.map(normalizeGregorianDate).filter(Boolean) : [],
            createdAtG: createdAt,
            createdAtJ: normalizeJalaaliDateKey(habit?.createdAtJ),
            syncToCalendar: Boolean(habit?.syncToCalendar)
        };
    }

    function readHabits() {
        return safeReadArray(HABITS_STORAGE_KEY).map(normalizeHabit);
    }

    function normalizeUserEvent(event) {
        const rawTime = String(event?.time || '').trim();
        const normalizedTime = rawTime.includes('-')
            ? rawTime.split('-').map(part => normalizeTime(part.trim())).filter(Boolean).join(' - ')
            : buildTimeRange(rawTime, '') || (event?.hour !== undefined && event?.hour !== '' ? `${String(event.hour).padStart(2, '0')}:00` : '');
        return {
            id: event?.id || `user-event-${Date.now()}`,
            source: 'user',
            date: normalizeJalaaliDateKey(event?.date || gregorianDateToJalaaliKey(new Date())),
            title: String(event?.title || '').trim(),
            hour: String(event?.hour ?? '').replace(/\D/g, '').slice(0, 2),
            time: normalizedTime,
            color: String(event?.color || '#1a73e8'),
            category: String(event?.category || 'شخصی'),
            priority: ['high', 'medium', 'low'].includes(event?.priority) ? event.priority : 'medium',
            desc: String(event?.desc || '').trim(),
            reminder: Boolean(event?.reminder),
            recurring: Boolean(event?.recurring),
            recurringType: ['daily', 'weekly', 'monthly', 'yearly'].includes(event?.recurringType) ? event.recurringType : 'daily',
            recurringUntil: normalizeGregorianDate(event?.recurringUntil)
        };
    }

    function readUserEvents() {
        return safeReadArray(USER_EVENTS_STORAGE_KEY)
            .filter(event => event?.source !== 'adhan')
            .map(normalizeUserEvent);
    }

    function writeUserEvents(events) {
        safeWriteArray(USER_EVENTS_STORAGE_KEY, events.map(normalizeUserEvent));
    }

    function taskOccursOnDate(task, dateLike) {
        const taskData = normalizeTask(task);
        const dateKey = normalizeGregorianDate(dateLike);
        const targetDate = makeDateFromGregorianKey(dateKey);
        const anchorDateKey = normalizeGregorianDate(taskData.dueDate || taskData.createdAt);
        if (!dateKey || !targetDate || !anchorDateKey) return false;
        if (dateKey < anchorDateKey) return false;
        if (taskData.recurringUntil && dateKey > taskData.recurringUntil) return false;

        if (taskData.recurring === 'none') {
            return Boolean(taskData.dueDate) && normalizeGregorianDate(taskData.dueDate) === dateKey;
        }
        if (taskData.recurring === 'daily') return true;
        if (taskData.recurring === 'weekly') {
            return inferTaskRecurringDays(taskData).includes(getPersianWeekdayIndex(targetDate));
        }
        if (taskData.recurring === 'monthly') {
            if (taskData.monthlyByJalaaliDay && typeof jalaali !== 'undefined') {
                const anchorDate = makeDateFromGregorianKey(anchorDateKey);
                if (!anchorDate) return false;
                const targetJ = jalaali.toJalaali(targetDate);
                const anchorJ = jalaali.toJalaali(anchorDate);
                return targetJ.jd === anchorJ.jd;
            }
            const anchorDate = makeDateFromGregorianKey(anchorDateKey);
            return Boolean(anchorDate) && anchorDate.getDate() === targetDate.getDate();
        }
        return false;
    }

    function isTaskOccurrenceCompleted(task, dateLike) {
        const taskData = normalizeTask(task);
        const dateKey = normalizeGregorianDate(dateLike);
        if (taskData.recurring === 'none') {
            return Boolean(taskData.completed);
        }
        return taskData.completionHistory.includes(dateKey);
    }

    function toggleTaskCompletion(tasks, taskId, dateLike) {
        const dateKey = normalizeGregorianDate(dateLike || new Date());
        return tasks.map(rawTask => {
            const task = normalizeTask(rawTask);
            if (task.id !== taskId) return task;
            if (task.recurring === 'none') {
                task.completed = !task.completed;
                task.completedAt = task.completed ? new Date().toISOString() : null;
                return task;
            }
            if (task.completionHistory.includes(dateKey)) {
                task.completionHistory = task.completionHistory.filter(item => item !== dateKey);
            } else {
                task.completionHistory = [...task.completionHistory, dateKey].sort(compareGregorianKeys);
            }
            return task;
        });
    }

    function getTaskNextOccurrence(task, fromDateLike) {
        const taskData = normalizeTask(task);
        const fromDate = stripTime(fromDateLike || new Date());
        if (!fromDate) return null;
        for (let offset = 0; offset <= 370; offset += 1) {
            const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + offset);
            if (taskOccursOnDate(taskData, candidate)) {
                return candidate;
            }
        }
        return null;
    }

    function getTaskRecurrenceLabel(task) {
        const taskData = normalizeTask(task);
        if (taskData.recurring === 'daily') return 'روزانه';
        if (taskData.recurring === 'weekly') {
            const labels = inferTaskRecurringDays(taskData).map(day => PERSIAN_WEEK_DAYS[day]).join('، ');
            return `هفتگی (${labels})`;
        }
        if (taskData.recurring === 'monthly') return 'ماهانه';
        return 'بدون تکرار';
    }

    function getTaskOccurrencesForDate(dateLike, options) {
        const settings = { includeCompleted: true, includeUndated: false, ...(options || {}) };
        const dateKey = normalizeGregorianDate(dateLike);
        return readTasks()
            .filter(task => {
                if (task.recurring === 'none' && !task.dueDate) {
                    return settings.includeUndated;
                }
                return taskOccursOnDate(task, dateKey);
            })
            .filter(task => settings.includeCompleted || !isTaskOccurrenceCompleted(task, dateKey))
            .map(task => ({
                task,
                date: dateKey,
                completed: isTaskOccurrenceCompleted(task, dateKey),
                dueToday: taskOccursOnDate(task, dateKey)
            }));
    }

    function habitOccursOnDate(habit, dateLike) {
        const habitData = normalizeHabit(habit);
        const targetDate = stripTime(dateLike);
        if (!targetDate) return false;
        const createdAt = makeDateFromGregorianKey(habitData.createdAtG) || targetDate;
        if (targetDate < createdAt) return false;
        if (habitData.recurring === 'daily') return true;
        if (habitData.recurring === 'weekly') {
            return habitData.recurringDays.includes(getPersianWeekdayIndex(targetDate));
        }
        const targetJalaali = typeof jalaali === 'undefined' ? null : jalaali.toJalaali(targetDate);
        return Boolean(targetJalaali) && targetJalaali.jd === habitData.dayOfMonth;
    }

    function isHabitCompletedOnDate(habit, dateLike) {
        return normalizeHabit(habit).history.includes(normalizeGregorianDate(dateLike));
    }

    function userEventOccursOnDate(event, dateLike) {
        const eventData = normalizeUserEvent(event);
        const targetDate = stripTime(dateLike);
        if (!targetDate) return false;
        const targetKey = gregorianDateToJalaaliKey(targetDate);
        const baseKey = normalizeJalaaliDateKey(eventData.date);
        if (!eventData.recurring) {
            return targetKey === baseKey;
        }
        const baseDate = jalaaliKeyToGregorianDate(baseKey);
        if (!baseDate || targetDate < baseDate) return false;
        if (eventData.recurringUntil && normalizeGregorianDate(targetDate) > eventData.recurringUntil) {
            return false;
        }
        if (eventData.recurringType === 'daily') return true;
        if (eventData.recurringType === 'weekly') {
            return getPersianWeekdayIndex(targetDate) === getPersianWeekdayIndex(baseDate);
        }
        if (eventData.recurringType === 'yearly') {
            const targetJ = jalaali.toJalaali(targetDate);
            const baseJ = jalaali.toJalaali(baseDate);
            return targetJ.jm === baseJ.jm && targetJ.jd === baseJ.jd;
        }
        const targetJ = jalaali.toJalaali(targetDate);
        const baseJ = jalaali.toJalaali(baseDate);
        return targetJ.jd === baseJ.jd;
    }

    function addYearsToDate(date, years) {
        const next = new Date(date);
        next.setFullYear(next.getFullYear() + years);
        return next;
    }

    function toGregorianDateFromJalaali(jy, jm, jd) {
        if (typeof jalaali === 'undefined') return null;
        const g = jalaali.toGregorian(jy, jm, jd);
        return new Date(g.gy, g.gm - 1, g.gd);
    }

    function getTodayJalaali() {
        if (typeof jalaali === 'undefined') return null;
        return jalaali.toJalaali(new Date());
    }

    function upsertByTitle(items, title, createFn) {
        if (items.some(item => String(item.title || '').trim() === title)) return items;
        return [...items, createFn()];
    }

    function ensureLifePlanData() {
        if (localStorage.getItem(LIFE_PLAN_BOOTSTRAP_KEY) === LIFE_PLAN_BOOTSTRAP_VERSION) {
            return;
        }
        const today = new Date();
        const todayJ = getTodayJalaali();
        if (!todayJ) return;

        const endKhordad1405 = toGregorianDateFromJalaali(1405, 3, 31);
        const debt8y = addYearsToDate(today, 8);
        const oneYearLater = addYearsToDate(today, 1);

        let tasks = readTasks();
        tasks = upsertByTitle(tasks, '🏋️ کراس‌فیت', () => normalizeTask({
            id: Date.now() + 11,
            title: '🏋️ کراس‌فیت',
            description: 'تمرین کراس‌فیت در روزهای زوج هفته',
            category: 'health',
            priority: 'high',
            dueDate: normalizeGregorianDate(today),
            dueTime: '17:00',
            endTime: '19:00',
            recurring: 'weekly',
            recurringDays: [0, 2, 4],
            recurringUntil: normalizeGregorianDate(endKhordad1405),
            syncToCalendar: true,
            tags: ['ورزش']
        }));
        tasks = upsertByTitle(tasks, '💳 قسط وام ازدواج', () => normalizeTask({
            id: Date.now() + 12,
            title: '💳 قسط وام ازدواج',
            description: 'سررسید سوم هر ماه شمسی',
            category: 'shopping',
            priority: 'high',
            dueDate: normalizeGregorianDate(toGregorianDateFromJalaali(todayJ.jy, todayJ.jm, 3)),
            dueTime: '10:00',
            recurring: 'monthly',
            monthlyByJalaaliDay: true,
            recurringUntil: normalizeGregorianDate(debt8y),
            syncToCalendar: true,
            tags: ['مالی']
        }));
        tasks = upsertByTitle(tasks, '💳 قسط اسنپ‌پی', () => normalizeTask({
            id: Date.now() + 13,
            title: '💳 قسط اسنپ‌پی',
            description: 'قسط ماهانه اول ماه شمسی',
            category: 'shopping',
            priority: 'medium',
            dueDate: normalizeGregorianDate(toGregorianDateFromJalaali(todayJ.jy, todayJ.jm, 1)),
            dueTime: '10:00',
            recurring: 'monthly',
            monthlyByJalaaliDay: true,
            recurringUntil: normalizeGregorianDate(oneYearLater),
            syncToCalendar: true,
            tags: ['مالی']
        }));
        tasks = upsertByTitle(tasks, '💳 قسط دیجی‌پی', () => normalizeTask({
            id: Date.now() + 14,
            title: '💳 قسط دیجی‌پی',
            description: 'قسط ماهانه اول ماه شمسی',
            category: 'shopping',
            priority: 'medium',
            dueDate: normalizeGregorianDate(toGregorianDateFromJalaali(todayJ.jy, todayJ.jm, 1)),
            dueTime: '10:30',
            recurring: 'monthly',
            monthlyByJalaaliDay: true,
            recurringUntil: normalizeGregorianDate(oneYearLater),
            syncToCalendar: true,
            tags: ['مالی']
        }));
        tasks = upsertByTitle(tasks, '💳 قسط تارا', () => normalizeTask({
            id: Date.now() + 15,
            title: '💳 قسط تارا',
            description: 'قسط ماهانه اول ماه شمسی',
            category: 'shopping',
            priority: 'medium',
            dueDate: normalizeGregorianDate(toGregorianDateFromJalaali(todayJ.jy, todayJ.jm, 1)),
            dueTime: '11:00',
            recurring: 'monthly',
            monthlyByJalaaliDay: true,
            recurringUntil: normalizeGregorianDate(oneYearLater),
            syncToCalendar: true,
            tags: ['مالی']
        }));
        writeTasks(tasks);

        let habits = readHabits();
        const defaultHabits = [
            { title: '🥤 پروتئین روزانه', icon: '🥤', category: 'health', time: '15:00' },
            { title: '🌅 نماز صبح', icon: '🌅', category: 'personal', time: '05:30' },
            { title: '☀️ نماز ظهر', icon: '☀️', category: 'personal', time: '12:30' },
            { title: '🌇 نماز عصر', icon: '🌇', category: 'personal', time: '16:30' },
            { title: '🪥 مسواک', icon: '🪥', category: 'health', time: '22:30' },
            { title: '🚿 حموم', icon: '🚿', category: 'health', time: '21:00' },
            { title: '📖 آیت‌الکرسی', icon: '📖', category: 'learning', time: '20:30' }
        ];
        defaultHabits.forEach((habit, index) => {
            habits = upsertByTitle(habits, habit.title, () => normalizeHabit({
                id: Date.now() + 100 + index,
                title: habit.title,
                icon: habit.icon,
                category: habit.category,
                time: habit.time,
                recurring: 'daily',
                recurringDays: [0],
                history: [],
                createdAtG: normalizeGregorianDate(today),
                createdAtJ: normalizeJalaaliDateKey(`${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`)
            }));
        });
        safeWriteArray(HABITS_STORAGE_KEY, habits.map(normalizeHabit));

        let events = readUserEvents();
        const birthdayEvents = [
            { title: '🎂 تولد همسرم', jm: 1, jd: 30 },
            { title: '🎂 تولد خودم', jm: 6, jd: 14 },
            { title: '🎂 تولد بابام', jm: 1, jd: 1 },
            { title: '🎂 تولد الهه', jm: 6, jd: 9 },
            { title: '🎂 تولد افروز', jm: 5, jd: 15 }
        ];
        birthdayEvents.forEach((event, index) => {
            events = upsertByTitle(events, event.title, () => normalizeUserEvent({
                id: Date.now() + 200 + index,
                date: normalizeJalaaliDateKey(`${todayJ.jy}-${event.jm}-${event.jd}`),
                title: event.title,
                time: '09:00',
                color: '#f59e0b',
                category: 'شخصی',
                priority: 'medium',
                desc: 'یادآوری سالانه',
                reminder: true,
                recurring: true,
                recurringType: 'yearly'
            }));
        });
        events = upsertByTitle(events, '🏋️ کراس‌فیت', () => normalizeUserEvent({
            id: Date.now() + 220,
            date: normalizeJalaaliDateKey(`${todayJ.jy}-${todayJ.jm}-${todayJ.jd}`),
            title: '🏋️ کراس‌فیت',
            time: '17:00 - 19:00',
            color: '#1fb580',
            category: 'ورزشی',
            priority: 'high',
            desc: 'روزهای زوج هفته تا پایان خرداد',
            reminder: true,
            recurring: true,
            recurringType: 'weekly',
            recurringUntil: normalizeGregorianDate(endKhordad1405)
        }));
        events = upsertByTitle(events, '💳 قسط وام ازدواج', () => normalizeUserEvent({
            id: Date.now() + 221,
            date: normalizeJalaaliDateKey(`${todayJ.jy}-${todayJ.jm}-${3}`),
            title: '💳 قسط وام ازدواج',
            time: '10:00',
            color: '#e67e22',
            category: 'مالی',
            priority: 'high',
            desc: 'سوم هر ماه شمسی',
            reminder: true,
            recurring: true,
            recurringType: 'monthly',
            recurringUntil: normalizeGregorianDate(debt8y)
        }));
        writeUserEvents(events);

        const existingGoals = safeReadArray(GOALS_STORAGE_KEY);
        const seededGoals = [...existingGoals];
        const addGoal = (title, payload) => {
            if (seededGoals.some(goal => String(goal.title || '').trim() === title)) return;
            seededGoals.push(payload);
        };
        addGoal('IELTS 7.5', {
            id: Date.now() + 301,
            title: 'IELTS 7.5',
            type: 'long',
            startDate: normalizeGregorianDate(today),
            endDate: normalizeGregorianDate(addYearsToDate(today, 2)),
            priority: 'high',
            category: 'education',
            description: 'رسیدن به نمره ۷.۵ آیلتس با ثبت پیشرفت ماهانه',
            actions: [
                { text: 'لیسنینگ و ریدینگ هفتگی', completed: false, date: null },
                { text: 'اسپیکینگ و رایتینگ هفتگی', completed: false, date: null }
            ],
            progress: 0,
            progressHistory: [],
            trackMonthly: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        addGoal('اپلای به هاروارد', {
            id: Date.now() + 302,
            title: 'اپلای به هاروارد',
            type: 'long',
            startDate: normalizeGregorianDate(today),
            endDate: normalizeGregorianDate(addYearsToDate(today, 3)),
            priority: 'high',
            category: 'career',
            description: 'آماده‌سازی کامل رزومه، زبان و مدارک اپلای',
            actions: [
                { text: 'تکمیل رزومه و SOP', completed: false, date: null },
                { text: 'آمادگی آزمون زبان', completed: false, date: null }
            ],
            progress: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        addGoal('خرید KMC', {
            id: Date.now() + 303,
            title: 'خرید KMC',
            type: 'long',
            startDate: normalizeGregorianDate(today),
            endDate: normalizeGregorianDate(addYearsToDate(today, 4)),
            priority: 'high',
            category: 'financial',
            description: 'برنامه‌ریزی مالی برای خرید خودرو KMC',
            actions: [
                { text: 'برنامه پس‌انداز ماهانه', completed: false, date: null },
                { text: 'بررسی بازار و قیمت', completed: false, date: null }
            ],
            progress: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            completedAt: null
        });
        safeWriteArray(GOALS_STORAGE_KEY, seededGoals);

        localStorage.setItem(NUTRITION_TARGETS_KEY, JSON.stringify({
            caloriesMax: 2000,
            proteinMin: 80
        }));

        const frequentFoods = [
            { name: '۱۲ قاشق برنج + ۱ ظرف ماست‌خوری قرمه‌سبزی', cal: 530, pro: 16.5, carb: 60, fat: 20.5 },
            { name: '۲ نان تست + پنیر پروتئینی + ۲ گردو', cal: 275, pro: 10.5, carb: 31.5, fat: 12.5 },
            { name: 'نیمرو ۳ تخم‌مرغ + نصف کف دست سنگک', cal: 385, pro: 22, carb: 27.5, fat: 20.5 },
            { name: '۱۲ قاشق برنج + ۱ ظرف فسنجان', cal: 680, pro: 16.5, carb: 70, fat: 35.5 },
            { name: '۱۲ قاشق برنج + ۱ ظرف قیمه', cal: 510, pro: 19.5, carb: 65, fat: 15.5 },
            { name: '۱۲ قاشق برنج + ۱ سیخ کوبیده', cal: 480, pro: 19.5, carb: 52, fat: 20.5 },
            { name: '۱۲ قاشق برنج + ۱ سیخ جوجه', cal: 480, pro: 34.5, carb: 52, fat: 10.5 },
            { name: '۱۲ قاشق برنج + ۱ تکه مرغ', cal: 480, pro: 44.5, carb: 50, fat: 10.5 },
            { name: '۱ ظرف پاستا آلفردو', cal: 600, pro: 20, carb: 50, fat: 35 },
            { name: '۳ فیله سوخاری + سیب‌زمینی + سس چیلی', cal: 800, pro: 28, carb: 80, fat: 37 },
            { name: 'پیتزا مخلوط ۲۰۰ گرم + سس قرمز', cal: 515, pro: 20, carb: 54, fat: 25 },
            { name: '۱۲ قاشق عدس‌پلو با گوشت', cal: 350, pro: 15, carb: 50, fat: 10 },
            { name: '۱۲ قاشق لوبیاپلو با گوشت', cal: 300, pro: 12, carb: 40, fat: 10 },
            { name: 'ساندویچ سیب‌زمینی + تخم‌مرغ + نان لواش', cal: 340, pro: 13, carb: 58.5, fat: 6 },
            { name: 'بیسکویت دایجستیو ۳ عددی', cal: 210, pro: 3, carb: 30, fat: 9 }
        ];
        const currentFoods = safeReadArray(FOOD_STORAGE_KEY);
        const byName = new Set(currentFoods.map(item => String(item.name || '').trim()));
        const mergedFoods = [...currentFoods];
        frequentFoods.forEach((food, index) => {
            if (byName.has(food.name)) return;
            mergedFoods.push({
                id: Date.now() + 500 + index,
                name: food.name,
                cal: food.cal,
                pro: food.pro,
                carb: food.carb,
                fat: food.fat
            });
        });
        safeWriteArray(FOOD_STORAGE_KEY, mergedFoods);

        localStorage.setItem(LIFE_PLAN_BOOTSTRAP_KEY, LIFE_PLAN_BOOTSTRAP_VERSION);
    }

    function buildDateRange(rangeStart, rangeEnd) {
        const defaultStart = stripTime(rangeStart || new Date());
        const defaultEnd = stripTime(rangeEnd || new Date(defaultStart.getFullYear(), defaultStart.getMonth(), defaultStart.getDate() + 45));
        if (!defaultStart || !defaultEnd) {
            const today = stripTime(new Date());
            return { start: today, end: today };
        }
        return defaultStart <= defaultEnd
            ? { start: defaultStart, end: defaultEnd }
            : { start: defaultEnd, end: defaultStart };
    }

    function forEachDayInRange(rangeStart, rangeEnd, callback) {
        const { start, end } = buildDateRange(rangeStart, rangeEnd);
        const cursor = new Date(start);
        while (cursor <= end) {
            callback(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
    }

    function getTaskCategoryMeta(category) {
        return TASK_CATEGORY_META[category] || TASK_CATEGORY_META.other;
    }

    function getHabitCategoryMeta(category) {
        return HABIT_CATEGORY_META[category] || HABIT_CATEGORY_META.personal;
    }

    function buildTaskDescription(task, dateLike) {
        const segments = [];
        if (task.description) segments.push(task.description);
        if (task.recurring !== 'none') segments.push(`تکرار: ${getTaskRecurrenceLabel(task)}`);
        const timeRange = buildTimeRange(task.dueTime, task.endTime);
        if (timeRange) segments.push(`ساعت: ${timeRange}`);
        if (task.recurring !== 'none' && isTaskOccurrenceCompleted(task, dateLike)) {
            segments.push('وضعیت: انجام شده');
        }
        return segments.join(' • ');
    }

    function buildTaskEvents(rangeStart, rangeEnd) {
        const events = [];
        forEachDayInRange(rangeStart, rangeEnd, currentDate => {
            const dateKey = gregorianDateToJalaaliKey(currentDate);
            readTasks().forEach(task => {
                if (!task.syncToCalendar) return;
                if (!taskOccursOnDate(task, currentDate)) return;
                const meta = getTaskCategoryMeta(task.category);
                events.push({
                    id: `task-${task.id}-${dateKey}`,
                    source: 'task',
                    sourceId: task.id,
                    date: dateKey,
                    title: `📝 ${task.title}`,
                    hour: sanitizeTimingValue(task.dueTime).split(':')[0],
                    time: buildTimeRange(task.dueTime, task.endTime),
                    color: isTaskOccurrenceCompleted(task, currentDate) ? '#94a3b8' : meta.color,
                    category: meta.label,
                    priority: task.priority,
                    desc: buildTaskDescription(task, currentDate),
                    completed: isTaskOccurrenceCompleted(task, currentDate),
                    link: 'tasks.html'
                });
            });
        });
        return events;
    }

    function buildHabitEvents(rangeStart, rangeEnd) {
        const events = [];
        forEachDayInRange(rangeStart, rangeEnd, currentDate => {
            const dateKey = gregorianDateToJalaaliKey(currentDate);
            readHabits().forEach(habit => {
                if (!habit.syncToCalendar) return;
                if (String(habit.title || '').includes('نماز')) return;
                if (!habitOccursOnDate(habit, currentDate)) return;
                const meta = getHabitCategoryMeta(habit.category);
                events.push({
                    id: `habit-${habit.id}-${dateKey}`,
                    source: 'habit',
                    sourceId: habit.id,
                    date: dateKey,
                    title: `${habit.icon || '🌿'} ${habit.title}`,
                    hour: sanitizeTimingValue(habit.time).split(':')[0],
                    time: buildTimeRange(habit.time, ''),
                    color: isHabitCompletedOnDate(habit, currentDate) ? '#9ec5ab' : meta.color,
                    category: meta.label,
                    priority: 'medium',
                    desc: `${habit.recurring === 'daily' ? 'عادت روزانه' : habit.recurring === 'weekly' ? 'عادت هفتگی' : 'عادت ماهانه'}${isHabitCompletedOnDate(habit, currentDate) ? ' • انجام شده' : ''}`,
                    completed: isHabitCompletedOnDate(habit, currentDate),
                    link: 'habits.html'
                });
            });
        });
        return events;
    }

    function buildUserEvents(rangeStart, rangeEnd) {
        const events = [];
        forEachDayInRange(rangeStart, rangeEnd, currentDate => {
            const dateKey = gregorianDateToJalaaliKey(currentDate);
            readUserEvents().forEach(event => {
                if (!userEventOccursOnDate(event, currentDate)) return;
                events.push({
                    ...event,
                    id: event.recurring ? `user-${event.id}-${dateKey}` : event.id,
                    source: 'user',
                    date: dateKey,
                    link: 'calendar.html'
                });
            });
        });
        return events;
    }

    function filterEventsInRange(events, rangeStart, rangeEnd) {
        const { start, end } = buildDateRange(rangeStart, rangeEnd);
        return events.filter(event => {
            const date = jalaaliKeyToGregorianDate(event.date);
            return Boolean(date) && date >= start && date <= end;
        });
    }

    function sortEvents(events) {
        return [...events].sort((left, right) => {
            const dateCompare = (jalaaliKeyToGregorianDate(left.date)?.getTime() || 0) - (jalaaliKeyToGregorianDate(right.date)?.getTime() || 0);
            if (dateCompare !== 0) return dateCompare;
            return getTimeSortValue(left.time || `${left.hour || ''}:00`) - getTimeSortValue(right.time || `${right.hour || ''}:00`);
        });
    }

    function getAllCalendarEvents(options) {
        const settings = {
            includeAdhan: true,
            includeUserEvents: true,
            includeTasks: true,
            includeHabits: true,
            ...(options || {})
        };
        const { start, end } = buildDateRange(settings.rangeStart, settings.rangeEnd);
        const events = [];

        if (settings.includeUserEvents) {
            events.push(...buildUserEvents(start, end));
        }
        if (settings.includeTasks) {
            events.push(...buildTaskEvents(start, end));
        }
        if (settings.includeHabits) {
            events.push(...buildHabitEvents(start, end));
        }
        if (settings.includeAdhan) {
            const adhanEvents = safeReadArray(getAdhanStorageKey());
            const legacyEvents = safeReadArray('adhanEvents1405');
            events.push(...filterEventsInRange(adhanEvents.length ? adhanEvents : legacyEvents, start, end));
        }

        return sortEvents(events);
    }

    global.DashboardData = {
        TASK_STORAGE_KEY,
        USER_EVENTS_STORAGE_KEY,
        HABITS_STORAGE_KEY,
        PERSIAN_WEEK_DAYS,
        TASK_CATEGORY_META,
        HABIT_CATEGORY_META,
        normalizeGregorianDate,
        normalizeJalaaliDateKey,
        gregorianDateToJalaaliKey,
        jalaaliKeyToGregorianDate,
        getPersianWeekdayIndex,
        sanitizeTimingValue,
        buildTimeRange,
        readTasks,
        writeTasks,
        readHabits,
        readUserEvents,
        writeUserEvents,
        normalizeTask,
        normalizeHabit,
        normalizeUserEvent,
        taskOccursOnDate,
        habitOccursOnDate,
        userEventOccursOnDate,
        isTaskOccurrenceCompleted,
        isHabitCompletedOnDate,
        toggleTaskCompletion,
        getTaskNextOccurrence,
        getTaskRecurrenceLabel,
        getTaskOccurrencesForDate,
        getAllCalendarEvents,
        getTaskCategoryMeta,
        getHabitCategoryMeta,
        filterEventsInRange,
        ensureLifePlanData
    };

    ensureLifePlanData();
}(window));
