(function () {
    const SETTINGS_KEY = 'agentAssistantSettings';
    const REMINDERS_KEY = 'agentAssistantReminders';
    const INSTALLMENTS_KEY = 'financeInstallments';
    const HISTORY_KEY = 'agentAssistantHistory';
    const AUTONOMY_KEY = 'agentAssistantAutonomyState';
    const DEFAULT_SETTINGS = {
        provider: 'gemini',
        model: 'gemini-3-pro',
        apiKey: 'AIzaSyCRYlfstQ6UaSxPr5Ypkw69dneFmLcgOsM',
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

    class AgenticAssistantKernel {
        constructor(options = {}) {
            this.hooks = options.hooks || {};
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
                provider: 'gemini',
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
                desc: `مبلغ ${item.amount.toLocaleString('fa-IR')} برای ${item.title}`
            });
            localStorage.setItem('proEvents', JSON.stringify(events));
            return item;
        }

        getLocalSignalsFallback() {
            const todayKey = normalizeDateKey(new Date());
            const tasks = parseJson(localStorage.getItem('advancedTasks') || '[]', []);
            const events = parseJson(localStorage.getItem('proEvents') || '[]', []);
            const overdueTasks = tasks.filter(task => !task.completed && task.dueDate && normalizeDateKey(task.dueDate) < todayKey);
            const upcomingEvents = events.filter(event => {
                const raw = String(event?.date || '');
                return raw === todayKey || raw === todayKey.replace(/-/g, '/');
            });
            return { overdueTasks, upcomingEvents };
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

        async askGemini(message) {
            const model = this.settings.model || DEFAULT_SETTINGS.model;
            const endpointRoot = (this.settings.endpoint || DEFAULT_SETTINGS.endpoint).replace(/\/+$/, '');
            const url = `${endpointRoot}/${model}:generateContent?key=${encodeURIComponent(this.settings.apiKey || '')}`;
            const context = typeof this.hooks.buildContext === 'function' ? this.hooks.buildContext() : this.getLocalSignalsFallback();
            const payload = {
                contents: [{
                    role: 'user',
                    parts: [{ text: `Context: ${JSON.stringify(context)}\n\nUser: ${message}` }]
                }],
                generationConfig: {
                    temperature: this.settings.temperature ?? DEFAULT_SETTINGS.temperature
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errText = await response.text();
                return `اتصال Gemini خطا داد (${response.status}). ${errText.slice(0, 180)}`;
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
                    payload: 'دستورها:\n• «یک قسط 500000 برای بیمه اضافه کن»\n• «یادآوری تماس با علی ساعت 19:30»\n• «تحلیل وضعیت من»\n• «هشدارهای امروز را بگو»'
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
                return {
                    type: 'action:add_reminder',
                    payload: {
                        text: reminderMatch[1].trim(),
                        dueAt: buildIsoWithTime(normalizeDateKey(new Date()), reminderMatch[2])
                    }
                };
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
            if (fallback.overdueTasks.length > 0 && state.overdueNotifiedFor !== todayKey) {
                this.maybeNotify('هشدار دستیار', `شما ${fallback.overdueTasks.length} تسک عقب‌مانده دارید.`);
                state.overdueNotifiedFor = todayKey;
            }
            if (fallback.upcomingEvents.length > 0 && state.eventsNotifiedFor !== todayKey) {
                this.maybeNotify('یادآوری برنامه', `امروز ${fallback.upcomingEvents.length} رویداد دارید.`);
                state.eventsNotifiedFor = todayKey;
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
                        <strong>Gemini 3 Pro Assistant</strong>
                        <button id="assistantClose" type="button">×</button>
                    </div>
                    <div id="assistantFeed" class="assistant-feed"></div>
                    <div class="assistant-quick-actions">
                        <button type="button" data-quick="تحلیل وضعیت من">تحلیل وضعیت</button>
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
                this.append('assistant', 'سلام 👋 من فعال هستم. می‌تونی دستور بدی، یادآوری ثبت کنی یا تحلیل بخوای.');
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

    function autoInitAssistant() {
        if (window.__globalAgentAssistantMounted) return;
        const kernel = new AgenticAssistantKernel();
        kernel.startMonitoring();
        const widget = new FloatingAssistantWidget(kernel);
        widget.mount();
        window.agenticAssistant = kernel;
        window.__globalAgentAssistantMounted = true;
    }

    window.AgenticAssistantKernel = AgenticAssistantKernel;
    window.addEventListener('DOMContentLoaded', autoInitAssistant);
})();
