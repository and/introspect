// Generic step-by-step renderer for any flow in FLOWS. One question per screen.
const Wizard = (() => {
    let current = null; // { entry, idx }

    function visibleSteps(entry) {
        const steps = FLOWS[entry.type].steps;
        return steps.map((s, i) => i).filter(i => stepVisible(steps[i], entry.answers));
    }

    function nextIdx(entry, from) {
        return visibleSteps(entry).find(i => i > from);
    }

    function prevIdx(entry, from) {
        return visibleSteps(entry).filter(i => i < from).pop();
    }

    function setAnswer(key, value) {
        const { entry } = current;
        if (key === 'content') Store.update(entry.id, { content: value });
        else Store.update(entry.id, { answers: { ...entry.answers, [key]: value } });
    }

    function go(idx) {
        location.hash = `#/e/${current.entry.id}/${idx}`;
    }

    function render(root, entry, idx) {
        const flow = FLOWS[entry.type];
        if (!flow.steps[idx] || !stepVisible(flow.steps[idx], entry.answers)) {
            idx = nextIdx(entry, idx - 1) ?? 0;
        }
        current = { entry, idx };
        if (entry.step !== idx) Store.update(entry.id, { step: idx });

        const step = flow.steps[idx];
        const visible = visibleSteps(entry);
        const pos = visible.indexOf(idx);
        const isLast = nextIdx(entry, idx) === undefined;
        const base = `f.${entry.type}.${step.key}`;

        root.innerHTML = `
        <section class="wizard" style="--accent:${flow.accent}">
            <div class="wiz-top">
                <button class="link-btn" data-act="later">&larr; ${t('wiz_later')}</button>
                <span class="wiz-practice">${t('type.' + entry.type)}</span>
            </div>
            <div class="wiz-progress" aria-hidden="true">
                ${visible.map((v, i) => `<span class="${i < pos ? 'done' : i === pos ? 'now' : ''}"></span>`).join('')}
            </div>
            <div class="wiz-card">
                <p class="wiz-stepcount">${t('wiz_step', { n: pos + 1, total: visible.length })}</p>
                ${pos > 0 && entry.content ? `<blockquote class="wiz-context private-text">${escapeHtml(entry.content)}</blockquote>` : ''}
                <h2 class="wiz-q" tabindex="-1">${t(base + '.q')}</h2>
                <div class="wiz-body">${renderInput(entry, step, base)}</div>
                <p class="wiz-error" hidden></p>
                <details class="wiz-why"><summary>${t('wiz_why')}</summary><p>${t(base + '.why')}</p></details>
            </div>
            <div class="wiz-nav">
                <button class="btn btn-ghost" data-act="back">${t('wiz_back')}</button>
                <span class="spacer"></span>
                ${step.required ? '' : `<button class="btn btn-ghost" data-act="skip">${t('wiz_skip')}</button>`}
                <button class="btn btn-primary" data-act="next">${isLast ? t('wiz_finish') : t('wiz_next')}</button>
            </div>
            ${keysHint(step) ? `<p class="wiz-keys">${keysHint(step)}</p>` : ''}
        </section>`;

        bind(root, entry, step);

        const field = root.querySelector('.wiz-body .wiz-text');
        if (field && !('ontouchstart' in window)) {
            field.focus();
            field.setSelectionRange(field.value.length, field.value.length);
        } else {
            root.querySelector('.wiz-q').focus({ preventScroll: true });
        }
        window.scrollTo(0, 0);
    }

    // Keyboard hint that only lists keys that work on this step
    function keysHint(step) {
        const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? 'Cmd' : 'Ctrl';
        if (step.type === 'text' && step.splitLines) return t('wiz_keys_split', { mod });
        if (step.type === 'text' && !step.short) return t('wiz_keys_text');
        if (step.type === 'text' || step.type === 'date') return t('wiz_keys_input');
        if (step.options) return t('wiz_keys_options', { n: step.options.length }) + (step.note ? ' ' + t('wiz_keys_note') : '');
        if (step.type === 'scale') return t('wiz_keys_options', { n: 5 });
        return '';
    }

    function optionHtml(entry, step, value, i, selected, suggested) {
        const prefix = step.optPrefix || `f.${entry.type}.${step.key}`;
        const desc = t(`${prefix}.${value}.d`);
        const hasDesc = desc !== `${prefix}.${value}.d`;
        return `
            <button type="button" class="opt ${selected ? 'selected' : ''} ${suggested ? 'suggested' : ''}" data-value="${value}" aria-pressed="${selected}">
                <span class="opt-key">${i + 1}</span>
                <span class="opt-text">
                    <span class="opt-label">${t(`${prefix}.${value}`)}</span>
                    ${hasDesc ? `<span class="opt-desc">${desc}</span>` : ''}
                </span>
                ${suggested ? `<span class="opt-badge">${t('wiz_suggested')}</span>` : ''}
            </button>`;
    }

    function noteHtml(entry, step) {
        const val = entry.answers[step.key + 'Note'] || '';
        return `<textarea class="wiz-note" rows="2" placeholder="${t('wiz_note_ph')}">${escapeHtml(val)}</textarea>`;
    }

    function renderInput(entry, step, base) {
        const value = stepAnswer(entry, step);
        switch (step.type) {
            case 'text': {
                const ph = t(base + '.ph');
                const placeholder = ph === base + '.ph' ? '' : ph;
                if (step.short) {
                    return `<input type="text" class="wiz-text" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}">`;
                }
                const lines = step.splitLines ? splitLines(value) : [];
                return `<textarea class="wiz-text ${step.key === 'content' ? 'private-text' : ''}" rows="4" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value || '')}</textarea>
                    ${step.splitLines ? `<label class="check-row wiz-split" ${lines.length > 1 ? '' : 'hidden'}>
                        <input type="checkbox" checked> <span>${t('wiz_split', { n: lines.length })}</span></label>` : ''}`;
            }
            case 'choice': {
                const suggested = step.suggest ? step.suggest(entry.answers) : null;
                return `<div class="opts">${step.options.map((o, i) => optionHtml(entry, step, o, i, value === o, suggested === o)).join('')}</div>
                    ${step.note ? noteHtml(entry, step) : ''}`;
            }
            case 'multi': {
                const sel = value || [];
                return `<div class="opts opts-multi">${step.options.map((o, i) => optionHtml(entry, step, o, i, sel.includes(o), false)).join('')}</div>
                    ${step.note ? noteHtml(entry, step) : ''}`;
            }
            case 'scale':
                return `<div class="scale">
                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="scale-btn ${value === n ? 'selected' : ''}" data-value="${n}" aria-pressed="${value === n}">${n}</button>`).join('')}
                    </div>
                    <div class="scale-labels"><span>${t('scale_low')}</span><span>${t('scale_high')}</span></div>`;
            case 'date':
                return `<input type="date" class="wiz-date" value="${value || ''}" min="${isoDay(new Date())}">
                    <div class="quick-dates">
                        <button type="button" class="chip" data-days="1">${t('wiz_date_tomorrow')}</button>
                        <button type="button" class="chip" data-days="weekend">${t('wiz_date_weekend')}</button>
                        <button type="button" class="chip" data-days="7">${t('wiz_date_week')}</button>
                    </div>`;
            case 'blessing': {
                const who = (entry.answers.who || '').trim() || t('f.anger.blessing.someone');
                return `<div class="blessing ${value ? 'given' : ''}">
                    <p class="blessing-title">${t('f.anger.blessing.text')}</p>
                    <p class="blessing-sub">${t('f.anger.blessing.sub', { who: `<span class="private-text">${escapeHtml(who)}</span>` })}</p>
                    <button type="button" class="btn btn-primary blessing-btn">${value ? t('f.anger.blessing.done') : t('f.anger.blessing.btn')}</button>
                </div>`;
            }
        }
        return '';
    }

    function splitLines(text) {
        return (text || '').split('\n').map(s => s.trim()).filter(Boolean);
    }

    function bind(root, entry, step) {
        const body = root.querySelector('.wiz-body');
        const autoAdvance = () => setTimeout(next, 220);

        root.querySelector('[data-act="later"]').onclick = later;
        root.querySelector('[data-act="back"]').onclick = back;
        root.querySelector('[data-act="next"]').onclick = next;
        const skip = root.querySelector('[data-act="skip"]');
        if (skip) skip.onclick = () => advance();

        const text = body.querySelector('.wiz-text');
        if (text) {
            text.addEventListener('input', () => {
                setAnswer(step.key, text.value);
                const split = body.querySelector('.wiz-split');
                if (split) {
                    const n = splitLines(text.value).length;
                    split.hidden = n < 2;
                    split.querySelector('span').textContent = t('wiz_split', { n });
                }
                root.querySelector('.wiz-error').hidden = true;
            });
        }

        const note = body.querySelector('.wiz-note');
        if (note) note.addEventListener('input', () => setAnswer(step.key + 'Note', note.value));

        body.querySelectorAll('.opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const v = btn.dataset.value;
                if (step.type === 'multi') {
                    const sel = new Set(entry.answers[step.key] || []);
                    sel.has(v) ? sel.delete(v) : sel.add(v);
                    setAnswer(step.key, step.options.filter(o => sel.has(o)));
                    btn.classList.toggle('selected');
                    btn.setAttribute('aria-pressed', btn.classList.contains('selected'));
                } else {
                    setAnswer(step.key, v);
                    body.querySelectorAll('.opt').forEach(b => {
                        b.classList.toggle('selected', b === btn);
                        b.setAttribute('aria-pressed', b === btn);
                    });
                    if (!step.note) autoAdvance();
                }
            });
        });

        body.querySelectorAll('.scale-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                setAnswer(step.key, Number(btn.dataset.value));
                body.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('selected', b === btn));
                autoAdvance();
            });
        });

        const date = body.querySelector('.wiz-date');
        if (date) {
            date.addEventListener('change', () => setAnswer(step.key, date.value));
            body.querySelectorAll('[data-days]').forEach(chip => {
                chip.addEventListener('click', () => {
                    const d = new Date();
                    if (chip.dataset.days === 'weekend') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
                    else d.setDate(d.getDate() + Number(chip.dataset.days));
                    date.value = isoDay(d);
                    setAnswer(step.key, date.value);
                    autoAdvance();
                });
            });
        }

        const bless = body.querySelector('.blessing-btn');
        if (bless) {
            bless.addEventListener('click', () => {
                setAnswer('blessing', true);
                body.querySelector('.blessing').classList.add('given');
                bless.textContent = t('f.anger.blessing.done');
                setTimeout(next, 900);
            });
        }
    }

    function next() {
        const { entry, idx } = current;
        const step = FLOWS[entry.type].steps[idx];
        if (step.required && !String(stepAnswer(entry, step) || '').trim()) {
            const err = document.querySelector('.wiz-error');
            err.textContent = t('wiz_required');
            err.hidden = false;
            return;
        }
        if (step.splitLines) splitIntoSiblings(entry);
        advance();
    }

    // Worry dump: first line stays in this entry, every other line becomes its own draft
    function splitIntoSiblings(entry) {
        const box = document.querySelector('.wiz-split');
        if (!box || box.hidden || !box.querySelector('input').checked) return;
        const [first, ...rest] = splitLines(entry.content);
        Store.update(entry.id, { content: first });
        rest.forEach(line => Store.create(entry.type, { content: line, nsfw: entry.nsfw, linkedFrom: entry.id, step: 1 }));
    }

    function advance() {
        const { entry, idx } = current;
        const n = nextIdx(entry, idx);
        if (n === undefined) finish(entry);
        else go(n);
    }

    function back() {
        const p = prevIdx(current.entry, current.idx);
        if (p === undefined) later();
        else go(p);
    }

    function later() {
        location.hash = '#/';
    }

    function finish(entry) {
        Store.update(entry.id, { status: 'done', step: 0, outcome: computeOutcome(entry) });
        const behind = entry.type === 'thought' && entry.answers.behind;
        if (behind && behind !== 'none') {
            const linked = Store.create(behind, { content: entry.content, nsfw: entry.nsfw, linkedFrom: entry.id, step: 1 });
            toast(t('done_branch_toast'));
            location.hash = `#/e/${linked.id}/1`;
            return;
        }
        location.hash = `#/e/${entry.id}/done`;
    }

    function onKey(e) {
        if (!current || !document.querySelector('.wizard')) return false;
        const inText = e.target.matches('textarea, input[type="text"], input[type="date"]');
        if (e.key === 'Enter' && !e.shiftKey) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SUMMARY') return false;
            // Worry dump keeps Enter for new lines; Cmd/Ctrl+Enter still moves on
            const step = FLOWS[current.entry.type].steps[current.idx];
            if (e.target.tagName === 'TEXTAREA' && step.splitLines && !e.metaKey && !e.ctrlKey) return false;
            e.preventDefault();
            next();
            return true;
        }
        if (!inText && !e.metaKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) {
            const btn = document.querySelectorAll('.wiz-body .opt, .wiz-body .scale-btn')[Number(e.key) - 1];
            if (btn) { btn.click(); return true; }
        }
        return false;
    }

    // Drop a draft that was abandoned before anything was written
    function cleanup() {
        if (!current) return;
        const entry = Store.get(current.entry.id);
        if (entry && entry.status === 'draft' && !entry.content.trim()) Store.remove(entry.id);
        current = null;
    }

    return { render, onKey, cleanup };
})();
