(function () {
    var STORAGE_KEY = 'preferredLanguage';
    var DEFAULT_LANGUAGE = 'en';
    var currentLanguage = DEFAULT_LANGUAGE;

    function readLanguage() {
        try {
            var value = localStorage.getItem(STORAGE_KEY);
            return value === 'fa' || value === 'en' ? value : DEFAULT_LANGUAGE;
        } catch (error) {
            return DEFAULT_LANGUAGE;
        }
    }

    function syncDocument(language) {
        var normalized = language === 'fa' ? 'fa' : 'en';
        var direction = normalized === 'fa' ? 'rtl' : 'ltr';
        currentLanguage = normalized;

        document.documentElement.lang = normalized;
        document.documentElement.dir = direction;
        document.documentElement.setAttribute('data-language', normalized);

        if (document.body) {
            document.body.setAttribute('dir', direction);
            document.body.setAttribute('data-language', normalized);
            document.body.classList.toggle('lang-en', normalized === 'en');
            document.body.classList.toggle('lang-fa', normalized === 'fa');
        }

        return normalized;
    }

    function applyLanguageChrome(language, shouldPersist) {
        var normalized = syncDocument(language);

        if (shouldPersist !== false) {
            try {
                localStorage.setItem(STORAGE_KEY, normalized);
            } catch (error) {
                return normalized;
            }
        }

        return normalized;
    }

    function ensureBodyLanguage() {
        if (!document.body) return;
        syncDocument(currentLanguage);
    }

    window.applyLanguageChrome = applyLanguageChrome;
    window.getPreferredLanguage = readLanguage;

    currentLanguage = readLanguage();
    syncDocument(currentLanguage);

    if (document.body) {
        ensureBodyLanguage();
    } else {
        var bodyObserver = new MutationObserver(function () {
            if (document.body) {
                ensureBodyLanguage();
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', ensureBodyLanguage);
    window.addEventListener('storage', function (event) {
        if (event.key !== STORAGE_KEY) return;
        applyLanguageChrome(event.newValue === 'fa' ? 'fa' : 'en', false);
    });
}());
