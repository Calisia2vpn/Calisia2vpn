(function () {
    const SETTINGS_KEY = 'agentAssistantSettings';
    const REMINDERS_KEY = 'agentAssistantReminders';
    const INSTALLMENTS_KEY = 'financeInstallments';
    const HISTORY_KEY = 'agentAssistantHistory';
    const AUTONOMY_KEY = 'agentAssistantAutonomyState';
    const PROFILE_KEY = 'userProfile';
    const TASKS_KEY = 'advancedTasks';
    const HABITS_KEY = 'myHabits';
    const EVENTS_KEY = 'proEvents';
    const ASSISTANT_NAME = 'سایه‌یار AURA';
    const LOW_VALUE_PATTERNS = [/اسکرول/, /شبکه اجتماعی/, /بی‌هدف/, /تفریح طولانی/, /چک کردن( مداوم)? پیام/, /بدون اولویت/, /general/i];
    const HIGH_VALUE_PATTERNS = [/ورزش/, /مطالعه/, /زبان/, /درآمد/, /پروژه/, /نماز/, /خواب/, /health/i, /focus/i];
    const DEFAULT_SETTINGS = {
        provider: 'local',
        model: 'gemini-2.5-flash',
        apiKey: '',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        temperature: 0.4
    };

    function parseJson(raw, fallback) {
        try {
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch {
            return fallback;
        }
    }

    function normalizeDateKey(dateLike) {
        const date = dateLike ? new Date(dateLike) : new Date();
        if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('en-CA');
        return date.toLocaleDateString('en-CA');
    }

    function buildIsoWithTime(baseDateKey, time) {
        const safeTime = /^(\d{1,2}):(\d{2})$/.test(String(time || '').trim()) ? String(time).trim() : '09:00';
        return `${baseDateKey}T${safeTime}:00`;
    }

    function sanitizeText(text) {
        return String(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function getTodayJalaaliKey() {
        if (typeof window.jalaali?.toJalaali === 'function') {
            const now = new Date();
            const j = window.jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
            return `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
        }
        return '';
    }

    function textScore(text) {
        const value = String(text || '').trim();
        if (!value) return 0;
        let score = 0;
        HIGH_VALUE_PATTERNS.forEach(pattern => {
            if (pattern.test(value)) score += 2;
        });
        LOW_VALUE_PATTERNS.forEach(pattern => {
            if (pattern.test(value)) score -= 3;
        });
        if (value.length > 45) score += 1;
        return score;
    }

    class AgenticAssistantKernel {
        constructor(options = {}) {
            this.hooks = options.hooks || {};
            this.onDataChanged = options.onDataChanged || null;
            const stored = parseJson(localStorage.getItem(SETTINGS_KEY) || '{}', {});
            this.settings = { ...DEFAULT_SETTINGS, ...stored };
            this.monitorIntervalMs = 60 * 1000;
            this.autonomyIntervalMs = 5 * 60 * 1000;
            this._intervalId = null;
            this._autonomyId = null;
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        }

        configureProvider(input = {}) {
            const next = {
                provider: input.provider || this.settings.provider || DEFAULT_SETTINGS.provider,
                model: input.model || this.settings.model || DEFAULT_SETTINGS.model,
                apiKey: input.apiKey || this.settings.apiKey || DEFAULT_SETTINGS.apiKey,
                endpoint: input.endpoint || this.settings.endpoint || DEFAULT_SETTINGS.endpoint,
                temperature: Number.isFinite(Number(input.temperature)) ? Number(input.temperature) : (this.settings.temperature ?? DEFAULT_SETTINGS.temperature)
            };
            this.settings = { ...this.settings, ...next };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
            return this.settings;
        }

        getSettings() {
            return { ...this.settings };
        }

        getHistory() {
            return parseJson(localStorage.getItem(HISTORY_KEY) || '[]', []);
        }

        pushHistory(entry) {
            const history = this.getHistory();
            history.push({ ...entry, at: new Date().toISOString() });
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-100)));
        }

        readReminders() {
            return parseJson(localStorage.getItem(REMINDERS_KEY) || '[]', []);
        }

        saveReminders(reminders) {
            localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
        }

        readTasks() {
            return parseJson(localStorage.getItem(TASKS_KEY) || '[]', []);
        }

        saveTasks(tasks) {
            localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
            if (typeof this.onDataChanged === 'function') this.onDataChanged();
        }

        readHabits() {
            return parseJson(localStorage.getItem(HABITS_KEY) || '[]', []);
        }

        saveHabits(habits) {
            localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
            if (typeof this.onDataChanged === 'function') this.onDataChanged();
        }

        readEvents() {
            return parseJson(localStorage.getItem(EVENTS_KEY) || '[]', []);
        }

        saveEvents(events) {
            localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
            if (typeof this.onDataChanged === 'function') this.onDataChanged();
        }

        addReminder({ text, dueAt, severity = 'normal', tag = '' }) {
            const reminders = this.readReminders();
            const normalizedDueAt = dueAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();
            const fingerprint = `${String(text || '').trim()}|${new Date(normalizedDueAt).toISOString()}|${tag}`;
            const exists = reminders.some(item => item.fingerprint === fingerprint && !item.done);
            if (exists) {
                return reminders.find(item => item.fingerprint === fingerprint) || null;
            }
            const reminder = {
                id: `rem-${Date.now()}`,
                text: String(text || 'یادآوری بدون عنوان'),
                dueAt: normalizedDueAt,
                severity,
                tag,
                fingerprint,
                done: false,
                notifiedAt: null,
                createdAt: new Date().toISOString()
            };
            reminders.push(reminder);
            this.saveReminders(reminders);
            return reminder;
        }

        addInstallment({ title, amount, dueDate }) {
            const list = parseJson(localStorage.getItem(INSTALLMENTS_KEY) || '[]', []);
            const item = {
                id: `ins-${Date.now()}`,
                title: title || 'قسط جدید',
                amount: Number(amount) || 0,
                dueDate: normalizeDateKey(dueDate),
                status: 'pending',
                createdAt: new Date().toISOString(),
                source: 'agent'
            };
            list.push(item);
            localStorage.setItem(INSTALLMENTS_KEY, JSON.stringify(list));

            const events = this.readEvents();
            events.push({
                id: `ins-event-${Date.now()}`,
                title: `موعد قسط: ${item.title}`,
                date: item.dueDate,
                time: '09:00 - 09:15',
                hour: '09',
                category: 'مالی',
                priority: 'high',
                desc: `مبلغ ${item.amount.toLocaleString('fa-IR')} برای ${item.title}`
            });
            this.saveEvents(events);
            return item;
        }

        addTask({ title, dueDate }) {
            const tasks = this.readTasks();
            const item = {
                id: Date.now(),
                title: String(title || 'تسک جدید'),
                category: 'general',
                priority: 'medium',
                dueDate: normalizeDateKey(dueDate || new Date()),
                recurring: 'none',
                completed: false,
                createdAt: new Date().toISOString(),
                source: 'assistant'
            };
            tasks.push(item);
            this.saveTasks(tasks);
            return item;
        }

        evaluateCandidate({ text, type = 'task' }) {
            const profile = this.getUserProfile() || {};
            const score = textScore(text);
            const laziness = Number(profile?.personality?.laziness) || 3;
            const strictnessBoost = laziness >= 4 ? -1 : 0;
            const finalScore = score + strictnessBoost;

            if (finalScore <= -2) {
                return {
                    accepted: false,
                    reason: `این ${type === 'habit' ? 'عادت' : 'کار'} احتمالاً کم‌اثر یا حواس‌پرت‌کن است. بهتره حذف یا بازطراحی شود.`
                };
            }
            if (finalScore <= 0) {
                return {
                    accepted: true,
                    warning: `این ${type === 'habit' ? 'عادت' : 'کار'} ارزش متوسطی دارد. پیشنهاد: نسخه خروجی‌محورتر تعریف کن.`
                };
            }
            return { accepted: true, warning: '' };
        }

        addHabit({ name }) {
            const habits = this.readHabits();
            const exists = habits.some(item => String(item?.name || '').trim() === String(name || '').trim());
            if (exists) return habits.find(item => String(item?.name || '').trim() === String(name || '').trim());
            const habit = {
                id: Date.now(),
                name: String(name || 'عادت جدید'),
                category: 'personal',
                recurring: 'daily',
                streak: 0,
                history: [],
                createdAt: new Date().toISOString(),
                source: 'assistant'
            };
            habits.push(habit);
            this.saveHabits(habits);
            return habit;
        }

        getLocalSignalsFallback() {
            const todayKey = normalizeDateKey(new Date());
            const tasks = this.readTasks();
            const events = this.readEvents();
            const overdueTasks = tasks.filter(task => !task.completed && task.dueDate && normalizeDateKey(task.dueDate) < todayKey);
            const upcomingEvents = events.filter(event => {
                const raw = String(event?.date || '');
                return raw === todayKey || raw === todayKey.replace(/-/g, '/');
            });
            const openTasks = tasks.filter(task => !task.completed).length;
            const highPriorityTasks = tasks.filter(task => !task.completed && String(task.priority) === 'high').length;
            return { overdueTasks, upcomingEvents, openTasks, highPriorityTasks };
        }

        buildTodayDigest() {
            const todayG = normalizeDateKey(new Date());
            const todayJ = getTodayJalaaliKey();
            const tasks = this.readTasks().filter(item => !item.completed);
            const habits = this.readHabits();
            const events = this.readEvents();
            const reminders = this.readReminders().filter(item => !item.done);

            const todayTasks = tasks.filter(item => normalizeDateKey(item.dueDate) <= todayG);
            const todayEvents = events.filter(item => {
                const raw = String(item?.date || '');
                return raw === todayG || raw === todayJ || raw === todayJ.replace(/\//g, '-');
            });
            const todayHabits = habits.filter(item => {
                const recurring = item?.recurring || 'daily';
                if (recurring !== 'daily') return false;
                const history = Array.isArray(item?.history) ? item.history.map(String) : [];
                return !history.includes(todayG) && !history.includes(todayJ);
            });
            const todayReminders = reminders.filter(item => normalizeDateKey(item.dueAt) === todayG);

            const lines = [
                ...todayTasks.slice(0, 3).map(item => `📝 ${item.title}`),
                ...todayHabits.slice(0, 2).map(item => `🌿 ${item.name || item.title}`),
                ...todayEvents.slice(0, 2).map(item => `📅 ${item.title}`),
                ...todayReminders.slice(0, 2).map(item => `⏰ ${item.text}`)
            ];

            return {
                counts: {
                    tasks: todayTasks.length,
                    habits: todayHabits.length,
                    events: todayEvents.length,
                    reminders: todayReminders.length
                },
                lines
            };
        }

        getUserProfile() {
            return parseJson(localStorage.getItem(PROFILE_KEY) || 'null', null);
        }

        suggestFromSignals() {
            const signalHook = typeof this.hooks.getSignals === 'function' ? this.hooks.getSignals() : null;
            if (signalHook) {
                const notes = [];
                if ((signalHook.overdueTasks || []).length > 0) notes.push('تسک عقب‌مانده داری؛ امروز فقط ۳ کار حیاتی را نگه دار.');
                if ((signalHook.scheduleConflicts || []).length > 0) notes.push('تداخل زمانی دیده شده؛ بین قرارها ۱۵ دقیقه بافر بگذار.');
                if ((signalHook.missedHabits || []).length > 0) notes.push('عادت جامانده داری؛ نسخه ۲ دقیقه‌ای را همین الان انجام بده.');
                if (signalHook.todayProtein < signalHook.proteinGoal) notes.push('پروتئین امروز زیر هدف است؛ یک میان‌وعده پروتئینی اضافه کن.');
                return notes.length ? notes.join('\n') : 'فعلاً وضعیت روزانه پایدار است.';
            }

            const fallback = this.getLocalSignalsFallback();
            if (fallback.overdueTasks.length || fallback.upcomingEvents.length) {
                return `تسک عقب‌مانده: ${fallback.overdueTasks.length} | رویدادهای امروز: ${fallback.upcomingEvents.length}`;
            }
            return 'سیگنال فوری خاصی ثبت نشده است.';
        }

        buildHighImpactPlan() {
            const tasks = this.readTasks().filter(item => !item.completed);
            const mustKeep = tasks
                .filter(item => textScore(item.title) > 0)
                .slice(0, 3)
                .map(item => `✅ نگه‌دار: ${item.title}`);
            const shouldDrop = tasks
                .filter(item => textScore(item.title) <= -2)
                .slice(0, 3)
                .map(item => `❌ حذف/کاهش: ${item.title}`);
            const fallbackKeep = mustKeep.length ? mustKeep : ['✅ نگه‌دار: یک کار عمیق ۹۰ دقیقه‌ای امروز'];
            const fallbackDrop = shouldDrop.length ? shouldDrop : ['❌ حذف/کاهش: کارهای بی‌اولویت یا پراکنده'];
            return [
                `${ASSISTANT_NAME} (برنامه اثر بالا):`,
                ...fallbackKeep,
                ...fallbackDrop,
                '🎯 اگر نتیجه می‌خوای: امروز فقط ۳ خروجی مهم، بقیه defer یا حذف.'
            ].join('\n');
        }

        async askGemini(message) {
            if (!this.settings.apiKey) {
                return 'برای استفاده از Gemini باید API Key را در پنل دستیار وارد کنید. تا آن زمان از تحلیل داخلی استفاده می‌کنم.';
            }
            const model = this.settings.model || DEFAULT_SETTINGS.model;
            const endpointRoot = (this.settings.endpoint || DEFAULT_SETTINGS.endpoint).replace(/\/+$/, '');
            const url = `${endpointRoot}/${model}:generateContent?key=${encodeURIComponent(this.settings.apiKey || '')}`;
            const context = typeof this.hooks.buildContext === 'function' ? this.hooks.buildContext() : this.getLocalSignalsFallback();
            const profile = this.getUserProfile();
            const payload = {
                contents: [{
                    role: 'user',
                    parts: [{ text: `UserProfile: ${JSON.stringify(profile)}\nContext: ${JSON.stringify(context)}\n\nUser: ${message}` }]
                }],
                generationConfig: {
                    temperature: this.settings.temperature ?? DEFAULT_SETTINGS.temperature
                }
            };

            let response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch {
                return 'اتصال به Gemini در دسترس نیست. پاسخ داخلی را امتحان کنید.';
            }
            if (!response.ok) {
                const errText = await response.text();
                return `اتصال Gemini خطا داد (${response.status}). ${errText.slice(0, 180)}.`;
            }
            const data = await response.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'پاسخی از Gemini دریافت نشد.';
        }

        parseCommand(message) {
            const text = String(message || '').trim();
            const lowered = text.toLowerCase();

            if (/^(help|راهنما|دستورها)/i.test(text)) {
                return {
                    type: 'help',
                    payload: `${ASSISTANT_NAME} آماده‌ست.\nدستورها:\n• «یک قسط 500000 برای بیمه اضافه کن»\n• «یادآوری تماس با علی ساعت 19:30»\n• «تسک پیگیری مشتری اضافه کن»\n• «عادت مطالعه اضافه کن»\n• «چی حذف کنم؟» یا «برنامه امروز»\n• «تحلیل وضعیت من»\n• «هشدارهای امروز را بگو»`
                };
            }

            const installmentMatch = text.match(/قسط\s+([\d۰-۹,،\.]+)?\s*(?:تومان)?\s*(?:برای|جهت)?\s*(.+?)\s*(?:اضافه\s*کن|ثبت\s*کن)/i)
                || text.match(/(?:اضافه\s*کن|ثبت\s*کن).*(?:قسط)\s+(.+)/i);
            if (installmentMatch) {
                const amountRaw = installmentMatch[1] || '0';
                const amount = Number(amountRaw.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[,،]/g, '')) || 0;
                const title = (installmentMatch[2] || 'قسط جدید').trim();
                return { type: 'action:add_installment', payload: { title, amount, dueDate: normalizeDateKey(new Date()) } };
            }

            const reminderMatch = text.match(/یادآوری\s+(.+?)\s+ساعت\s+(\d{1,2}:\d{2})/i);
            if (reminderMatch) {
                const isTomorrow = /فردا/.test(text);
                const base = new Date();
                if (isTomorrow) base.setDate(base.getDate() + 1);
                return {
                    type: 'action:add_reminder',
                    payload: {
                        text: reminderMatch[1].trim(),
                        dueAt: buildIsoWithTime(normalizeDateKey(base), reminderMatch[2])
                    }
                };
            }

            const taskMatch = text.match(/(?:تسک|کار)\s+(.+?)\s*(?:اضافه\s*کن|ثبت\s*کن)/i);
            if (taskMatch) {
                return {
                    type: 'action:add_task',
                    payload: { title: taskMatch[1].trim(), dueDate: normalizeDateKey(new Date()) }
                };
            }

            const habitMatch = text.match(/(?:عادت)\s+(.+?)\s*(?:اضافه\s*کن|ثبت\s*کن)/i);
            if (habitMatch) {
                return {
                    type: 'action:add_habit',
                    payload: { name: habitMatch[1].trim() }
                };
            }

            if (lowered.includes('برنامه امروز') || lowered.includes('چی حذف کنم') || lowered.includes('high impact')) {
                return { type: 'insight:high_impact_plan' };
            }

            if (lowered.includes('هشدار') || lowered.includes('today warnings')) return { type: 'insight:warnings' };
            if (lowered.includes('تحلیل وضعیت') || lowered.includes('analysis')) return { type: 'insight:signals' };
            return { type: 'llm', payload: { message: text } };
        }

        async run(message) {
            const command = this.parseCommand(message);
            let reply = '';

            if (command.type === 'help') {
                reply = command.payload;
            } else if (command.type === 'action:add_installment') {
                const item = this.addInstallment(command.payload);
                reply = `✅ قسط ثبت شد: ${item.title} (${item.amount.toLocaleString('fa-IR')} تومان).`;
            } else if (command.type === 'action:add_reminder') {
                const item = this.addReminder(command.payload);
                reply = `⏰ یادآوری ثبت شد: ${item.text} ساعت ${new Date(item.dueAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
            } else if (command.type === 'action:add_task') {
                const quality = this.evaluateCandidate({ text: command.payload.title, type: 'task' });
                if (!quality.accepted) {
                    reply = `🚫 ${quality.reason}\nپیشنهاد جایگزین: این کار را به خروجی قابل‌سنجش تبدیل کن (مثلاً: «۳۰ دقیقه تمرین زبان با ۲۰ واژه جدید»).`;
                    this.pushHistory({ role: 'user', text: message });
                    this.pushHistory({ role: 'assistant', text: reply });
                    return reply;
                }
                const item = this.addTask(command.payload);
                reply = `📝 تسک جدید اضافه شد: ${item.title}${quality.warning ? `\n⚠️ ${quality.warning}` : ''}`;
            } else if (command.type === 'action:add_habit') {
                const quality = this.evaluateCandidate({ text: command.payload.name, type: 'habit' });
                if (!quality.accepted) {
                    reply = `🚫 ${quality.reason}\nاول یک عادت با ارزش بالا مثل ورزش، مطالعه یا خواب منظم ثبت کن.`;
                    this.pushHistory({ role: 'user', text: message });
                    this.pushHistory({ role: 'assistant', text: reply });
                    return reply;
                }
                const item = this.addHabit(command.payload);
                reply = `🌿 عادت ثبت شد: ${item.name || item.title}${quality.warning ? `\n⚠️ ${quality.warning}` : ''}`;
            } else if (command.type === 'insight:high_impact_plan') {
                reply = this.buildHighImpactPlan();
            } else if (command.type === 'insight:warnings' || command.type === 'insight:signals') {
                reply = this.suggestFromSignals();
            } else {
                reply = await this.askGemini(command.payload.message);
            }

            this.pushHistory({ role: 'user', text: message });
            this.pushHistory({ role: 'assistant', text: reply });
            return reply;
        }

        maybeNotify(title, body) {
            if (!('Notification' in window)) return;
            if (Notification.permission === 'granted') {
                new Notification(title, { body });
                return;
            }
            if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') new Notification(title, { body });
                });
            }
        }

        monitorReminders() {
            const reminders = this.readReminders();
            const now = Date.now();
            let changed = false;
            reminders.forEach(item => {
                if (item.done) return;
                const dueTs = new Date(item.dueAt).getTime();
                if (!Number.isFinite(dueTs)) return;
                if (dueTs <= now && !item.notifiedAt) {
                    item.notifiedAt = new Date().toISOString();
                    changed = true;
                    this.maybeNotify('یادآوری دستیار', item.text);
                }
            });
            if (changed) this.saveReminders(reminders);
        }

        monitorAutonomy() {
            const state = parseJson(localStorage.getItem(AUTONOMY_KEY) || '{}', {});
            const todayKey = normalizeDateKey(new Date());
            const fallback = this.getLocalSignalsFallback();
            const profile = this.getUserProfile();
            if (fallback.overdueTasks.length > 0 && state.overdueNotifiedFor !== todayKey) {
                this.maybeNotify('هشدار دستیار', `شما ${fallback.overdueTasks.length} تسک عقب‌مانده دارید.`);
                state.overdueNotifiedFor = todayKey;
            }
            if (fallback.upcomingEvents.length > 0 && state.eventsNotifiedFor !== todayKey) {
                this.maybeNotify('یادآوری برنامه', `امروز ${fallback.upcomingEvents.length} رویداد دارید.`);
                state.eventsNotifiedFor = todayKey;
            }
            const tasks = this.readTasks().filter(item => !item.completed);
            const lowValueTasks = tasks.filter(item => textScore(item.title) <= -2);
            if (lowValueTasks.length > 0 && state.lowValueHintFor !== todayKey) {
                this.maybeNotify(
                    `${ASSISTANT_NAME} | هشدار تمرکز`,
                    `${lowValueTasks.length} کار کم‌اثر دارید. برای نتیجه بهتر، حذف یا کوتاه‌سازی‌شان کنید.`
                );
                state.lowValueHintFor = todayKey;
            }
            if (profile?.prayer === 'yes') {
                const hour = new Date().getHours();
                let slot = '';
                if (hour >= 4 && hour < 7) slot = 'fajr';
                if (hour >= 11 && hour < 15) slot = 'dhuhr';
                if (hour >= 17 && hour < 22) slot = 'maghrib';
                if (!slot) {
                    localStorage.setItem(AUTONOMY_KEY, JSON.stringify(state));
                    return;
                }
                const slotKey = `${todayKey}-${slot}`;
                if (!state.prayerReminderSlots || !state.prayerReminderSlots[slotKey]) {
                    const message = slot === 'fajr'
                        ? 'یادآوری نماز صبح'
                        : slot === 'dhuhr'
                            ? 'یادآوری نماز ظهر'
                            : 'یادآوری نماز مغرب/عشاء';
                    this.maybeNotify('یادآوری معنوی', message);
                    state.prayerReminderSlots = { ...(state.prayerReminderSlots || {}), [slotKey]: true };
                }
            }
            localStorage.setItem(AUTONOMY_KEY, JSON.stringify(state));
        }

        startMonitoring() {
            if (!this._intervalId) {
                this.monitorReminders();
                this._intervalId = setInterval(() => this.monitorReminders(), this.monitorIntervalMs);
            }
            if (!this._autonomyId) {
                this.monitorAutonomy();
                this._autonomyId = setInterval(() => this.monitorAutonomy(), this.autonomyIntervalMs);
            }
        }

        stopMonitoring() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            if (this._autonomyId) {
                clearInterval(this._autonomyId);
                this._autonomyId = null;
            }
        }
    }

    class FloatingAssistantWidget {
        constructor(kernel) {
            this.kernel = kernel;
            this.root = null;
        }

        mount() {
            if (document.getElementById('globalAgentAssistant')) return;
            this.root = document.createElement('section');
            this.root.id = 'globalAgentAssistant';
            this.root.className = 'global-agent-assistant';
            this.root.innerHTML = `
                <button type="button" id="assistantFab" class="assistant-fab" aria-label="باز کردن دستیار">🤖</button>
                <div id="assistantPanel" class="assistant-panel" aria-live="polite">
                    <div class="assistant-panel-head">
                        <strong>${ASSISTANT_NAME} • Gemini 3 Pro</strong>
                        <button id="assistantClose" type="button">×</button>
                    </div>
                    <div id="assistantFeed" class="assistant-feed"></div>
                    <div class="assistant-quick-actions">
                        <button type="button" data-quick="تحلیل وضعیت من">تحلیل وضعیت</button>
                        <button type="button" data-quick="چی حذف کنم؟">چی حذف کنم؟</button>
                        <button type="button" data-quick="هشدارهای امروز را بگو">هشدارها</button>
                    </div>
                    <div class="assistant-input-wrap">
                        <input id="assistantInput" type="text" placeholder="مثل: یک قسط 500000 برای بیمه اضافه کن">
                        <button id="assistantSend" type="button">ارسال</button>
                    </div>
                </div>
            `;
            document.body.appendChild(this.root);
            this.bind();
            this.renderHistory();
        }

        append(role, text) {
            const feed = this.root.querySelector('#assistantFeed');
            const bubble = document.createElement('article');
            bubble.className = `assistant-bubble ${role}`;
            bubble.innerHTML = `<span>${role === 'assistant' ? 'دستیار' : 'شما'}</span><p>${sanitizeText(text)}</p>`;
            feed.appendChild(bubble);
            feed.scrollTop = feed.scrollHeight;
        }

        renderHistory() {
            const feed = this.root.querySelector('#assistantFeed');
            feed.innerHTML = '';
            const history = this.kernel.getHistory().slice(-12);
            history.forEach(item => this.append(item.role, item.text));
            if (!history.length) {
                this.append('assistant', `سلام 👋 من ${ASSISTANT_NAME} هستم؛ مثل سایه کنارت می‌مونم. هر چیز کم‌اثر رو بهت می‌گم حذف کنی تا زودتر نتیجه بگیری.`);
            }
        }

        bind() {
            const fab = this.root.querySelector('#assistantFab');
            const panel = this.root.querySelector('#assistantPanel');
            const close = this.root.querySelector('#assistantClose');
            const send = this.root.querySelector('#assistantSend');
            const input = this.root.querySelector('#assistantInput');

            fab.addEventListener('click', () => panel.classList.toggle('open'));
            close.addEventListener('click', () => panel.classList.remove('open'));

            this.root.querySelectorAll('[data-quick]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    input.value = btn.dataset.quick;
                    await this.handleSend();
                });
            });

            send.addEventListener('click', () => this.handleSend());
            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleSend();
                }
            });
        }

        async handleSend() {
            const input = this.root.querySelector('#assistantInput');
            const send = this.root.querySelector('#assistantSend');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            this.append('user', text);
            send.disabled = true;
            try {
                const reply = await this.kernel.run(text);
                this.append('assistant', reply);
            } catch (error) {
                this.append('assistant', `خطا: ${error.message}`);
            } finally {
                send.disabled = false;
            }
        }
    }

    class DailyPulseBar {
        constructor(kernel) {
            this.kernel = kernel;
            this.root = null;
            this._interval = null;
        }

        mount() {
            if (document.getElementById('dailyPulseBar')) return;
            this.root = document.createElement('aside');
            this.root.id = 'dailyPulseBar';
            this.root.className = 'daily-pulse-bar';
            this.root.innerHTML = `
                <button type="button" id="dailyPulseToggle" class="daily-pulse-toggle">📌 خلاصه امروز</button>
                <div id="dailyPulsePanel" class="daily-pulse-panel">
                    <div class="daily-pulse-head">
                        <strong>کارهای باقی‌مانده امروز</strong>
                        <button type="button" id="dailyPulseClose">×</button>
                    </div>
                    <div id="dailyPulseStats" class="daily-pulse-stats"></div>
                    <div id="dailyPulseItems" class="daily-pulse-items"></div>
                </div>
            `;
            document.body.appendChild(this.root);
            this.bind();
            this.refresh();
            this._interval = setInterval(() => this.refresh(), 60 * 1000);
            window.addEventListener('storage', () => this.refresh());
        }

        bind() {
            const toggle = this.root.querySelector('#dailyPulseToggle');
            const close = this.root.querySelector('#dailyPulseClose');
            const panel = this.root.querySelector('#dailyPulsePanel');
            toggle.addEventListener('click', () => panel.classList.toggle('open'));
            close.addEventListener('click', () => panel.classList.remove('open'));
        }

        refresh() {
            const digest = this.kernel.buildTodayDigest();
            const statsNode = this.root.querySelector('#dailyPulseStats');
            const itemsNode = this.root.querySelector('#dailyPulseItems');
            statsNode.innerHTML = `
                <span>📝 ${digest.counts.tasks}</span>
                <span>🌿 ${digest.counts.habits}</span>
                <span>📅 ${digest.counts.events}</span>
                <span>⏰ ${digest.counts.reminders}</span>
            `;
            if (!digest.lines.length) {
                itemsNode.innerHTML = '<p class="daily-pulse-empty">برای امروز کار باز خاصی نداری 👌</p>';
                return;
            }
            itemsNode.innerHTML = digest.lines.map(line => `<p>${sanitizeText(line)}</p>`).join('');
        }
    }

    function autoInitAssistant() {
        if (window.__globalAgentAssistantMounted) return;
        const kernel = new AgenticAssistantKernel();
        kernel.startMonitoring();
        const widget = new FloatingAssistantWidget(kernel);
        const pulseBar = new DailyPulseBar(kernel);
        widget.mount();
        pulseBar.mount();
        window.agenticAssistant = kernel;
        window.__globalAgentAssistantMounted = true;
    }

    window.AgenticAssistantKernel = AgenticAssistantKernel;
    window.addEventListener('DOMContentLoaded', autoInitAssistant);
})();
