# 🚀 Quick Start: Add Navigation to Any Module

## Copy-Paste Guide (3 Simple Steps)

### 1️⃣ BEFORE `</body>` - Add HTML

```html
<!-- Navigation Sidebar -->
<div class="nav-sidebar" id="navSidebar">
    <div class="nav-header">
        <div class="nav-logo">🏛️ کاخ</div>
        <button class="nav-close" onclick="toggleNav(false)">✕</button>
    </div>
    <div class="nav-modules">
        <a href="tasks.html" class="nav-module"><div class="nav-module-icon">📝</div><span>تسک‌ها</span></a>
        <a href="habits.html" class="nav-module"><div class="nav-module-icon">🌿</div><span>عادت‌ها</span></a>
        <a href="meditation.html" class="nav-module"><div class="nav-module-icon">🧘</div><span>مدیتیشن</span></a>
        <a href="finance.html" class="nav-module"><div class="nav-module-icon">💰</div><span>دارایی</span></a>
        <a href="diet.html" class="nav-module"><div class="nav-module-icon">🍎</div><span>تغذیه</span></a>
        <a href="fitness.html" class="nav-module"><div class="nav-module-icon">💪</div><span>جسم‌پرداز</span></a>
        <a href="calendar.html" class="nav-module"><div class="nav-module-icon">📅</div><span>تقویم</span></a>
        <a href="goals.html" class="nav-module"><div class="nav-module-icon">🎯</div><span>اهداف</span></a>
        <a href="notes.html" class="nav-module"><div class="nav-module-icon">✍️</div><span>یادداشت‌ها</span></a>
        <a href="social.html" class="nav-module"><div class="nav-module-icon">👥</div><span>روابط</span></a>
        <a href="stats.html" class="nav-module"><div class="nav-module-icon">📊</div><span>آمار</span></a>
        <a href="deep_report.html" class="nav-module"><div class="nav-module-icon">📈</div><span>گزارش</span></a>
    </div>
    <div class="nav-divider"></div>
    <div class="nav-tools">
        <button class="nav-tool-btn" onclick="toggleThemeNav()">
            <span id="themeNavIcon">🌙</span>
            <span id="themeNavLabel">تم تاریک</span>
        </button>
        <a href="index.html" class="nav-tool-btn">
            <span>🏠</span>
            <span>خانه داشبورد</span>
        </a>
    </div>
</div>
<div class="nav-overlay" id="navOverlay" onclick="toggleNav(false)"></div>
<button class="nav-toggle" onclick="toggleNav(true)" title="منو">☰</button>
```

### 2️⃣ INSIDE `<style>` - Add CSS

```css
/* Navigation Sidebar */
.nav-sidebar {
    position: fixed;
    right: -280px;
    top: 0;
    width: 280px;
    height: 100vh;
    background: linear-gradient(180deg, var(--surface-strong) 0%, var(--surface) 100%);
    border-left: 1px solid var(--border);
    z-index: 1000;
    transition: right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    overflow-y: auto;
    box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
}

.nav-sidebar.open {
    right: 0;
}

body[data-theme='dark'] .nav-sidebar {
    background: rgba(30, 38, 52, 0.95);
    border-left-color: rgba(232, 226, 216, 0.1);
}

.nav-header {
    padding: 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.nav-logo {
    font-size: 28px;
    font-weight: 800;
    color: var(--saffron);
}

.nav-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--text);
    opacity: 0.7;
    transition: opacity 0.2s;
}

.nav-close:hover {
    opacity: 1;
}

.nav-modules {
    padding: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.nav-module {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    color: var(--text);
    font-size: 12px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.5);
}

body[data-theme='dark'] .nav-module {
    background: rgba(255, 255, 255, 0.08);
}

.nav-module:hover {
    background: var(--saffron);
    color: white;
    transform: translateY(-2px);
}

.nav-module-icon {
    font-size: 28px;
}

.nav-divider {
    height: 1px;
    background: var(--border);
    margin: 16px 16px;
}

.nav-tools {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.nav-tool-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
}

body[data-theme='dark'] .nav-tool-btn {
    background: rgba(255, 255, 255, 0.08);
}

.nav-tool-btn:hover {
    background: var(--saffron);
    color: white;
    border-color: var(--saffron);
}

.nav-toggle {
    position: fixed;
    bottom: 30px;
    left: 30px;
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, var(--saffron), var(--gold));
    border: none;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    z-index: 999;
    box-shadow: 0 8px 24px rgba(200, 138, 52, 0.3);
    transition: all 0.3s ease;
}

.nav-toggle:hover {
    transform: scale(1.1);
    box-shadow: 0 12px 32px rgba(200, 138, 52, 0.4);
}

.nav-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
}

.nav-overlay.active {
    opacity: 1;
    pointer-events: auto;
}

@media (max-width: 768px) {
    .nav-toggle {
        left: 20px;
        bottom: 20px;
    }
}
```

### 3️⃣ INSIDE `<script>` - Add Functions

```javascript
// Navigation Functions
function toggleNav(open) {
    const sidebar = document.getElementById('navSidebar');
    const overlay = document.getElementById('navOverlay');
    if (open) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function toggleThemeNav() {
    const current = document.body.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
    updateThemeNavLabel();
}

function updateThemeNavLabel() {
    const theme = document.body.getAttribute('data-theme');
    const icon = document.getElementById('themeNavIcon');
    const label = document.getElementById('themeNavLabel');
    if (theme === 'dark') {
        icon.textContent = '☀️';
        label.textContent = 'تم روشن';
    } else {
        icon.textContent = '🌙';
        label.textContent = 'تم تاریک';
    }
}

// Close nav when clicking a link
document.querySelectorAll('.nav-module').forEach(link => {
    link.addEventListener('click', () => toggleNav(false));
});

// Load theme on page load
const savedTheme = localStorage.getItem('dashboardTheme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
updateThemeNavLabel();
```

---

## ✅ Verify Your Setup

- [ ] HTML code pasted before `</body>`
- [ ] CSS code in `<style>` section
- [ ] JS functions in `<script>` section
- [ ] `<body data-theme="light">` exists
- [ ] `app.js` is loaded via `<script src="app.js"></script>`
- [ ] Button appears at ☰ bottom-left corner
- [ ] Click button and menu slides in from right
- [ ] Menu closes when clicking overlay or module link
- [ ] Theme toggle works (button text changes)
- [ ] Theme persists on page reload

---

## 🎯 One-by-One Checklist

Apply above 3 steps to each module:

- [ ] **tasks.html** - تسک‌ها
- [ ] **habits.html** - عادت‌ها
- [ ] **meditation.html** - مدیتیشن
- [ ] **finance.html** - دارایی
- [ ] **diet.html** - تغذیه
- [ ] **fitness.html** - جسم‌پرداز
- [ ] **calendar.html** - تقویم
- [ ] **goals.html** - اهداف
- [ ] **notes.html** - یادداشت‌ها
- [ ] **social.html** - روابط
- [ ] **stats.html** - آمار
- [ ] **deep_report.html** - گزارش

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Button doesn't appear | Check z-index > 999, position: fixed |
| Menu doesn't slide | Ensure CSS transition is in `.nav-sidebar` |
| Links don't close menu | Verify `document.querySelectorAll` line is in JS |
| Theme doesn't change | Check `setTheme()` function called, `app.js` loaded |
| Style conflict | Import `style.css` before module styles |

---

## 💡 Pro Tips

1. **Copy all 3 parts together** to avoid missing pieces
2. **Test on mobile** - navigation is touch-friendly
3. **Dark mode** - toggle works automatically via localStorage
4. **Performance** - navigation has minimal size (8-10 KB) 
5. **Reusable** - same code works on all 13 pages
