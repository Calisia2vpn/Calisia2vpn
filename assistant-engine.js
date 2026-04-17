(function () {
    const SETTINGS_KEY = 'agentAssistantSettings';
    const REMINDERS_KEY = 'agentAssistantReminders';
    const INSTALLMENTS_KEY = 'financeInstallments';
    const HISTORY_KEY = 'agentAssistantHistory';

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

    class AgenticAssistantKernel {
        constructor(options = {}) {
            this.hooks = options.hooks || {};
            this.settings = parseJson(localStorage.getItem(SETTINGS_KEY) || '{}', {});
            this.monitorIntervalMs = 60 * 1000;
            this._intervalId = null;
        }

        configureProvider(input = {}) {
            const next = {
                provider: 'gemini',
                model: input.model || this.settings.model || 'gemini-2.0-flash',
                apiKey: input.apiKey || this.settings.apiKey || '',
                endpoint: input.endpoint || this.settings.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models',
                temperature: Number.isFinite(Number(input.temperature)) ? Number(input.temperature) : 0.4
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
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-50)));
        }

        readReminders() {
            return parseJson(localStorage.getItem(REMINDERS_KEY) || '[]', []);
        }

        saveReminders(reminders) {
            localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
        }

        addReminder({ text, dueAt, severity = 'normal' }) {
            const reminders = this.readReminders();
            const reminder = {
                id: `rem-${Date.now()}`,
                text: String(text || 'یادآوری بدون عنوان'),
                dueAt: dueAt || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                severity,
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

            const events = parseJson(localStorage.getItem('proEvents') || '[]', []);
            events.push({
                id: `ins-event-${Date.now()}`,
                title: `موعد قسط: ${item.title}`,
                date: item.dueDate,
                time: '09:00 - 09:15',
                hour: '09',
                category: 'مالی',
                priority: 'high',
                desc: `مبلغ ${item.amount} برای ${item.title}`
            });
            localStorage.setItem('proEvents', JSON.stringify(events));
            return item;
        }

        suggestFromSignals() {
            const signals = typeof this.hooks.getSignals === 'function' ? this.hooks.getSignals() : null;
            if (!signals) {
                return 'داده کافی برای تحلیل سیگنال‌ها وجود ندارد. ابتدا چند تسک/عادت/رویداد ثبت کن.';
            }
            const notes = [];
            if ((signals.overdueTasks || []).length > 0) {
                notes.push('تسک عقب‌مانده داری؛ پیشنهاد علمی: قانون ۳ کار حیاتی روزانه را فعال کن.');
            }
            if ((signals.scheduleConflicts || []).length > 0) {
                notes.push('تداخل برنامه دیده شده؛ بین جلسات ۱۵ دقیقه بافر بگذار تا خطای تصمیم کم شود.');
            }
            if ((signals.missedHabits || []).length > 0) {
                notes.push('عادت جامانده وجود دارد؛ نسخه ۲ دقیقه‌ای همان عادت را اجرا کن تا زنجیره نشکند.');
            }
            if (signals.todayProtein < signals.proteinGoal) {
                notes.push('پروتئین کمتر از هدف است؛ برای حفظ تمرکز یک وعده پروتئینی سبک اضافه کن.');
            }
            return notes.length ? notes.join('\n') : 'فعلاً ریسک جدی دیده نشد؛ برنامه پایدار است.';
        }

        async askGemini(message) {
            if (!this.settings.apiKey) {
                return 'کلید Gemini ثبت نشده است. در تنظیمات دستیار API Key را وارد کن.';
            }
            const model = this.settings.model || 'gemini-2.0-flash';
            const endpointRoot = (this.settings.endpoint || '').replace(/\/+$/, '');
            const url = `${endpointRoot}/${model}:generateContent?key=${encodeURIComponent(this.settings.apiKey)}`;
            const context = typeof this.hooks.buildContext === 'function' ? this.hooks.buildContext() : {};
            const payload = {
                contents: [{
                    role: 'user',
                    parts: [{ text: `Context: ${JSON.stringify(context)}\n\nUser: ${message}` }]
                }],
                generationConfig: {
                    temperature: this.settings.temperature ?? 0.4
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errText = await response.text();
                return `اتصال به Gemini ناموفق بود: ${response.status} - ${errText.slice(0, 180)}`;
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
                    payload: 'دستورهای قابل اجرا:\n- «یک قسط ۵۰۰۰۰۰ برای لپتاپ اضافه کن»\n- «یادآوری تماس با علی ساعت 19:30»\n- «هشدارهای امروز را بگو»\n- «تحلیل وضعیت من»'
                };
            }

            const installmentMatch = text.match(/قسط\s+([\d۰-۹,،\.]+)?\s*(?:تومان)?\s*(?:برای|جهت)?\s*(.+?)\s*(?:اضافه\s*کن|ثبت\s*کن)/i)
                || text.match(/(?:اضافه\s*کن|ثبت\s*کن).*(?:قسط)\s+(.+)/i);
            if (installmentMatch) {
                const amountRaw = installmentMatch[1] || '0';
                const normalizedDigits = amountRaw.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[,،]/g, '');
                const amount = Number(normalizedDigits) || 0;
                const title = (installmentMatch[2] || 'قسط جدید').trim();
                return { type: 'action:add_installment', payload: { title, amount, dueDate: normalizeDateKey(new Date()) } };
            }

            const reminderMatch = text.match(/یادآوری\s+(.+?)\s+ساعت\s+(\d{1,2}:\d{2})/i);
            if (reminderMatch) {
                return {
                    type: 'action:add_reminder',
                    payload: {
                        text: reminderMatch[1].trim(),
                        dueAt: buildIsoWithTime(normalizeDateKey(new Date()), reminderMatch[2])
                    }
                };
            }

            if (lowered.includes('هشدار') || lowered.includes('alert') || lowered.includes('today warnings')) {
                return { type: 'insight:warnings' };
            }

            if (lowered.includes('تحلیل وضعیت') || lowered.includes('analysis')) {
                return { type: 'insight:signals' };
            }

            return { type: 'llm', payload: { message: text } };
        }

        async run(message) {
            const command = this.parseCommand(message);
            let reply = '';

            if (command.type === 'help') {
                reply = command.payload;
            } else if (command.type === 'action:add_installment') {
                const item = this.addInstallment(command.payload);
                reply = `✅ انجام شد: ${item.title} با مبلغ ${item.amount.toLocaleString('fa-IR')} ثبت شد.`;
            } else if (command.type === 'action:add_reminder') {
                const item = this.addReminder(command.payload);
                reply = `⏰ یادآوری ثبت شد: ${item.text} (${new Date(item.dueAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })})`;
            } else if (command.type === 'insight:warnings') {
                reply = this.suggestFromSignals();
            } else if (command.type === 'insight:signals') {
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
                    if (permission === 'granted') {
                        new Notification(title, { body });
                    }
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

        startMonitoring() {
            if (this._intervalId) return;
            this.monitorReminders();
            this._intervalId = setInterval(() => this.monitorReminders(), this.monitorIntervalMs);
        }

        stopMonitoring() {
            if (!this._intervalId) return;
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }

    window.AgenticAssistantKernel = AgenticAssistantKernel;
})();
