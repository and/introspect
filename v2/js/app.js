// App shell: i18n, routing, header controls, global keys
let currentLanguage = 'en';
let lastRoute = null;

// ---------- Helpers shared by all modules ----------
function t(key, vars) {
    const dict = window.translations[currentLanguage] || {};
    let s = dict[key] ?? window.translations.en[key] ?? key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split(`{${k}}`).join(vars[k]); });
    return s;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML.replace(/"/g, '&quot;');
}

// Local YYYY-MM-DD (not UTC, so "today" matches the user's day)
function isoDay(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
    if (!value) return '';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
    return d.toLocaleDateString(currentLanguage, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

function relTime(iso) {
    const diff = (Date.now() - new Date(iso)) / 1000;
    // Older mobile browsers (iOS < 14) lack RelativeTimeFormat
    if (!Intl.RelativeTimeFormat) return formatDate(iso);
    const rtf = new Intl.RelativeTimeFormat(currentLanguage, { numeric: 'auto' });
    if (diff < 60) return rtf.format(0, 'second');
    if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
    if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
    if (diff < 86400 * 7) return rtf.format(-Math.floor(diff / 86400), 'day');
    return formatDate(iso);
}

function toast(message, isError) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function startFlow(type, fields = {}) {
    const entry = Store.create(type, { step: 0, ...fields });
    location.hash = `#/e/${entry.id}/0`;
}

function changeLanguage(lang) {
    currentLanguage = lang;
    Store.setSetting('language', lang);
    applyLanguage();
    render();
}

function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
        el.setAttribute('aria-label', el.title);
    });
}

// ---------- Routing ----------
function parseRoute() {
    const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
    const parts = path.split('/').filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(query));
    return { parts, params };
}

function render() {
    const { parts, params } = parseRoute();
    const view = document.getElementById('view');
    const [name, id, step] = parts;
    const route = name === 'e' ? `e/${id}` : name || 'home';

    // Leaving a wizard (not just moving between its steps) drops empty drafts
    if (lastRoute && lastRoute.startsWith('e/') && lastRoute !== route) Wizard.cleanup();
    if (lastRoute !== route) window.scrollTo(0, 0);
    lastRoute = route;

    document.querySelectorAll('.nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.route === (name || 'home'));
    });
    document.body.classList.toggle('in-wizard', name === 'e' && step !== 'done');

    if (name === 'e') {
        const entry = Store.get(id);
        if (!entry) { location.replace('#/'); return; }
        if (step === 'done') Views.done(view, entry);
        else Wizard.render(view, entry, Number(step) || 0);
    } else if (name === 'entry') Views.detail(view, Store.get(id));
    else if (name === 'journal') Views.journal(view, params);
    else if (name === 'insights') Views.insights(view);
    else if (name === 'learn') Views.learn(view);
    else if (name === 'settings') Views.settings(view);
    else Views.home(view);
}

// ---------- Header controls ----------
const EYE_OPEN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const EYE_CLOSED = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function setPrivacy(on) {
    document.body.classList.toggle('privacy-mode', on);
    Store.setSetting('privacy', on ? '1' : '');
    const btn = document.getElementById('privacyToggle');
    btn.innerHTML = on ? EYE_CLOSED : EYE_OPEN;
    btn.classList.toggle('active', on);
}

function applyFontSize(pct) {
    document.documentElement.style.fontSize = pct + '%';
    Store.setSetting('fontsize', pct);
}

function changeFontSize(delta) {
    const pct = Math.min(140, Math.max(80, Number(Store.setting('fontsize', 100)) + delta));
    applyFontSize(pct);
}

// NSFW text stays blurred until pressed and held. Pointer events cover mouse and touch;
// no preventDefault, so scrolling over a blurred entry still works (it cancels the reveal).
function bindNsfwReveal() {
    let held = null, heldAt = 0;
    document.addEventListener('pointerdown', e => {
        held = e.target.closest('.nsfw');
        if (held) { held.classList.add('revealed'); heldAt = Date.now(); }
    });
    const hide = () => { document.querySelectorAll('.nsfw.revealed').forEach(el => el.classList.remove('revealed')); };
    ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, hide));
    // A long hold to read should not also open the entry
    document.addEventListener('click', e => {
        if (held && e.target.closest('.nsfw') && Date.now() - heldAt > 300) {
            e.preventDefault();
            e.stopPropagation();
        }
        held = null;
    }, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest('.nsfw')) e.preventDefault(); });
}

document.addEventListener('DOMContentLoaded', () => {
    Store.onSaveError = () => toast(t('save_failed'), true);
    Store.load();

    currentLanguage = Store.setting('language', 'en');
    if (!window.translations[currentLanguage]) currentLanguage = 'en';
    applyLanguage();
    applyFontSize(Number(Store.setting('fontsize', 100)));
    setPrivacy(!!Store.setting('privacy', ''));

    document.getElementById('privacyToggle').addEventListener('click', () => setPrivacy(!document.body.classList.contains('privacy-mode')));
    document.getElementById('fontIncrease').addEventListener('click', () => changeFontSize(10));
    document.getElementById('fontDecrease').addEventListener('click', () => changeFontSize(-10));
    bindNsfwReveal();

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.querySelector('.overlay')) return;
            setPrivacy(!document.body.classList.contains('privacy-mode'));
            return;
        }
        if (e.altKey || document.querySelector('.overlay')) return;
        Wizard.onKey(e) || Views.homeKey(e);
    });

    window.addEventListener('hashchange', render);
    render();
    Views.onboarding(false);
});
