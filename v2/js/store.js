// Local-only storage. Everything lives in localStorage on this device.
const Store = (() => {
    const KEY = 'introspect_v2_entries';
    const PREFIX = 'introspect_v2_';
    const V1_KEY = 'introspection_thoughts';

    // v1 root cause values -> v2 source ids
    const V1_SOURCES = {
        'Needs': 'need',
        'Habits': 'habit',
        'Environmental conditions': 'environment',
        'Others impositions': 'others',
        'Heredity': 'heredity',
        'Divinity': 'divine',
        'Unknown': 'unknown'
    };

    let entries = [];
    let lastId = 0;
    let onSaveError = () => { };

    function newId() {
        // Date-based like v1, but unique even when several are created in the same ms
        lastId = Math.max(Date.now(), lastId + 1);
        return lastId;
    }

    function setting(name, fallback) {
        const v = localStorage.getItem(PREFIX + name);
        return v === null ? fallback : v;
    }

    function setSetting(name, value) {
        localStorage.setItem(PREFIX + name, value);
    }

    function fromV1(t) {
        const causes = Array.isArray(t.rootCauses) ? t.rootCauses : (t.rootCause ? [t.rootCause] : []);
        const sources = causes.map(c => V1_SOURCES[c]).filter(Boolean);
        const nature = t.classification ? String(t.classification).toLowerCase() : null;
        const ts = t.timestamp || new Date(t.id || Date.now()).toISOString();
        return normalize({
            id: t.id,
            type: 'thought',
            status: 'done',
            content: t.content || '',
            createdAt: ts,
            updatedAt: ts,
            nsfw: !!t.nsfw,
            score: t.score || 0,
            answers: { sources, nature },
            comments: Array.isArray(t.comments) ? t.comments : [],
            importedFromV1: true
        });
    }

    function migrateV1() {
        if (setting('migrated', null)) return;
        try {
            const raw = localStorage.getItem(V1_KEY);
            const v1 = raw ? JSON.parse(raw) : [];
            if (Array.isArray(v1)) {
                const have = new Set(entries.map(e => e.id));
                v1.filter(t => t && t.content && !have.has(t.id)).forEach(t => entries.push(fromV1(t)));
            }
        } catch (e) {
            console.warn('v1 migration skipped', e);
        }
        setSetting('migrated', '1');
        save();
    }

    function normalize(e) {
        return {
            id: e.id || newId(),
            type: ['thought', 'desire', 'worry', 'anger'].includes(e.type) ? e.type : 'thought',
            status: e.status === 'draft' ? 'draft' : 'done',
            content: e.content || '',
            createdAt: e.createdAt || new Date().toISOString(),
            updatedAt: e.updatedAt || e.createdAt || new Date().toISOString(),
            nsfw: !!e.nsfw,
            score: e.score || 0,
            answers: e.answers || {},
            outcome: e.outcome || {},
            step: e.step || 0,
            linkedFrom: e.linkedFrom || null,
            comments: e.comments || [],
            recurredAt: e.recurredAt || [],
            history: e.history || [],
            ...(e.importedFromV1 ? { importedFromV1: true } : {})
        };
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            const data = raw ? JSON.parse(raw) : null;
            entries = data && Array.isArray(data.entries) ? data.entries.map(normalize) : [];
        } catch (e) {
            console.error('Failed to read entries', e);
            entries = [];
        }
        lastId = entries.reduce((m, e) => Math.max(m, e.id), 0);
        migrateV1();
        return entries;
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify({ version: 2, entries }));
            return true;
        } catch (e) {
            console.error('Failed to save', e);
            onSaveError(e);
            return false;
        }
    }

    function all() { return entries; }
    function get(id) { return entries.find(e => e.id === Number(id)); }

    function create(type, fields = {}) {
        const now = new Date().toISOString();
        const entry = normalize({ type, status: 'draft', createdAt: now, updatedAt: now, ...fields, id: newId() });
        entries.push(entry);
        save();
        return entry;
    }

    function update(id, patch) {
        const entry = get(id);
        if (!entry) return null;
        Object.assign(entry, patch, { updatedAt: new Date().toISOString() });
        save();
        return entry;
    }

    function remove(id) {
        entries = entries.filter(e => e.id !== Number(id));
        save();
    }

    function clear() {
        entries = [];
        save();
    }

    function exportJSON() {
        return JSON.stringify({ app: 'introspect', version: 2, exportedAt: new Date().toISOString(), entries }, null, 2);
    }

    // Accepts a v2 backup ({entries: [...]}) or a v1 export (array of thoughts).
    // Returns the number of entries imported, or throws on invalid input.
    function importJSON(text, mode) {
        const data = JSON.parse(text);
        let incoming;
        if (Array.isArray(data)) {
            incoming = data.filter(t => t && typeof t.content === 'string').map(fromV1);
        } else if (data && Array.isArray(data.entries)) {
            incoming = data.entries.filter(e => e && typeof e.content === 'string').map(normalize);
        } else {
            throw new Error('Unrecognised backup');
        }
        if (mode === 'replace') {
            entries = incoming;
        } else {
            const byId = new Map(entries.map(e => [e.id, e]));
            incoming.forEach(e => byId.set(e.id, e));
            entries = [...byId.values()];
        }
        lastId = entries.reduce((m, e) => Math.max(m, e.id), lastId);
        save();
        return incoming.length;
    }

    return {
        load, save, all, get, create, update, remove, clear,
        exportJSON, importJSON, setting, setSetting,
        set onSaveError(fn) { onSaveError = fn; }
    };
})();
