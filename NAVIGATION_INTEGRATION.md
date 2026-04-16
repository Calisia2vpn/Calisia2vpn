# Navigation Integration Guide

## Persistent Navigation System

کاخ وجود now has a beautiful, persistent floating navigation menu accessible from **all pages** via the round hamburger menu button (☰) at the bottom-left corner.

### Features
✅ Floating sidebar menu (slides from right)  
✅ All 12 modules accessible in 2-column grid  
✅ Theme toggle button  
✅ Home button to return to dashboard  
✅ Smooth animations & transitions  
✅ Works in both Light and Dark modes  
✅ Mobile responsive  

---

## How to Add Navigation to Module Pages

### Step 1: Add Navigation HTML

Copy and paste this **before the closing `</body>` tag** in each module page:

```html
<!-- Navigation Sidebar -->
<div class="nav-sidebar" id="navSidebar">
    <div class="nav-header">
        <div class="nav-logo">🏛️ کاخ</div>
        <button class="nav-close" onclick="toggleNav(false)">✕</button>
    </div>

    <div class="nav-modules">
        <a href="tasks.html" class="nav-module" title="تسک‌ها">
            <div class="nav-module-icon">📝</div>
            <span>تسک‌ها</span>
        </a>
        <a href="habits.html" class="nav-module" title="عادت‌ها">
            <div class="nav-module-icon">🌿</div>
            <span>عادت‌ها</span>
        </a>
        <a href="meditation.html" class="nav-module" title="مدیتیشن">
            <div class="nav-module-icon">🧘</div>
            <span>مدیتیشن</span>
        </a>
        <a href="finance.html" class="nav-module" title="دارایی">
            <div class="nav-module-icon">💰</div>
            <span>دارایی</span>
        </a>
        <a href="diet.html" class="nav-module" title="تغذیه">
            <div class="nav-module-icon">🍎</div>
            <span>تغذیه</span>
        </a>
        <a href="fitness.html" class="nav-module" title="جسم‌پرداز">
            <div class="nav-module-icon">💪</div>
            <span>جسم‌پرداز</span>
        </a>
        <a href="calendar.html" class="nav-module" title="تقویم">
            <div class="nav-module-icon">📅</div>
            <span>تقویم</span>
        </a>
        <a href="goals.html" class="nav-module" title="اهداف">
            <div class="nav-module-icon">🎯</div>
            <span>اهداف</span>
        </a>
        <a href="notes.html" class="nav-module" title="یادداشت‌ها">
            <div class="nav-module-icon">✍️</div>
            <span>یادداشت‌ها</span>
        </a>
        <a href="social.html" class="nav-module" title="روابط">
            <div class="nav-module-icon">👥</div>
            <span>روابط</span>
        </a>
        <a href="stats.html" class="nav-module" title="آمار">
            <div class="nav-module-icon">📊</div>
            <span>آمار</span>
        </a>
        <a href="deep_report.html" class="nav-module" title="گزارش">
            <div class="nav-module-icon">📈</div>
            <span>گزارش</span>
        </a>
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

### Step 2: Add Navigation Styles

Add this **inside the `<style>` block** (or at the top of embedded `<style>` tag):

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
    display: flex;
    align-items: center;
    gap: 8px;
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
    padding: 16px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 16px;
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

### Step 3: Add Navigation JavaScript Functions

Add this **in the `<script>` section** at the bottom of each module page (before or after the existing module JavaScript):

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

### Step 4: Make Sure Body Has Theme Attribute

Verify that each module page's `<body>` tag has this:

```html
<body data-theme="light">
```

And that module pages load `app.js`:

```html
<script src="app.js"></script>
```

---

## Quick Checklist

- [x] index.html - Already updated ✅
- [ ] tasks.html
- [ ] habits.html
- [ ] meditation.html
- [ ] finance.html
- [ ] diet.html
- [ ] fitness.html
- [ ] calendar.html
- [ ] goals.html
- [ ] notes.html
- [ ] social.html
- [ ] stats.html
- [ ] deep_report.html

---

## Theme System

The theme system works automatically via `localStorage`:
- **Light Theme** (default): Cream/beige background, dark text
- **Dark Theme**: Deep navy/charcoal background, light text

When user toggles theme:
1. Button updates icon (🌙 ↔ ☀️)
2. Value saved to `localStorage.dashboardTheme`
3. All pages load the saved theme on page load
4. CSS variables adapt via `[data-theme='dark']` selector

---

## Benefits

🎯 **Unified Navigation**: Access all 12 modules from anywhere  
🎨 **Responsive Design**: Works great on mobile and desktop  
🌓 **Theme Persistence**: Theme preference saved across all pages  
⚡ **Smooth Animations**: Beautiful transitions and hover effects  
🇮🇷 **Persian Optimized**: RTL-ready with full Farsi support  

---

## Support

If you have questions or issues adding navigation to a specific module, check that:
1. The page loads `app.js`
2. CSS variables from `style.css` are accessible
3. `<body data-theme="light">` attribute exists
4. Navigation functions are placed before used in HTML
