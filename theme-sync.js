(function () {
    var PRIMARY_KEY = 'dashboardTheme';
    var LEGACY_KEYS = ['reportTheme'];
    var LIGHT_THEME_COLOR = '#0f766e';
    var DARK_THEME_COLOR = '#081b24';
    var currentTheme = 'light';

    function readTheme() {
        try {
            var keys = [PRIMARY_KEY].concat(LEGACY_KEYS);
            for (var i = 0; i < keys.length; i += 1) {
                var value = localStorage.getItem(keys[i]);
                if (value === 'light' || value === 'dark') {
                    return value;
                }
            }
        } catch (error) {
            return 'light';
        }
        return 'light';
    }

    function persistTheme(theme) {
        try {
            localStorage.setItem(PRIMARY_KEY, theme);
            for (var i = 0; i < LEGACY_KEYS.length; i += 1) {
                localStorage.setItem(LEGACY_KEYS[i], theme);
            }
        } catch (error) {
            return;
        }
    }

    function syncMeta(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
        var themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
        }
    }

    function applyTheme(theme, shouldPersist) {
        var normalized = theme === 'dark' ? 'dark' : 'light';
        currentTheme = normalized;
        syncMeta(normalized);
        if (document.body) {
            document.body.setAttribute('data-theme', normalized);
        }
        if (shouldPersist !== false) {
            persistTheme(normalized);
        }
        return normalized;
    }

    function ensureBodyTheme() {
        if (document.body && document.body.getAttribute('data-theme') !== currentTheme) {
            document.body.setAttribute('data-theme', currentTheme);
        }
    }

    function watchBodyTheme() {
        if (!document.body) {
            return;
        }
        var observer = new MutationObserver(function () {
            var bodyTheme = document.body.getAttribute('data-theme');
            if (bodyTheme === 'light' || bodyTheme === 'dark') {
                if (bodyTheme !== currentTheme || document.documentElement.getAttribute('data-theme') !== bodyTheme) {
                    applyTheme(bodyTheme, true);
                }
                return;
            }
            ensureBodyTheme();
        });
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    window.applyDashboardTheme = function (theme) {
        return applyTheme(theme, true);
    };

    window.getDashboardTheme = function () {
        return currentTheme;
    };

    currentTheme = readTheme();
    applyTheme(currentTheme, true);

    if (document.body) {
        watchBodyTheme();
    } else {
        var bodyObserver = new MutationObserver(function () {
            if (document.body) {
                ensureBodyTheme();
                watchBodyTheme();
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', ensureBodyTheme);
    window.addEventListener('storage', function (event) {
        if ([PRIMARY_KEY].concat(LEGACY_KEYS).indexOf(event.key) === -1) {
            return;
        }
        applyTheme(event.newValue === 'dark' ? 'dark' : 'light', false);
    });
}());
