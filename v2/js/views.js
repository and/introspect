// Screens: home, completion, journal, entry detail, insights, learn, settings, onboarding
const Views = (() => {
    let captureText = '';
    let captureNsfw = false;
    const journal = { type: 'all', status: 'all', q: '' };

    const accent = type => FLOWS[type].accent;
    const byNewest = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

    function decisionLabel(e) {
        const flow = FLOWS[e.type];
        const step = flow.steps.find(s => s.key === flow.decisionKey);
        const v = e.answers[flow.decisionKey];
        return v ? optionLabel(e.type, step, v) : '';
    }

    function isDue(e) {
        return e.status === 'done' && e.outcome.dueDate && !e.outcome.completed;
    }

    function entryHref(e) {
        return e.status === 'draft' ? `#/e/${e.id}/${e.step || 0}` : `#/entry/${e.id}`;
    }

    function entryCard(e) {
        const badges = [];
        if (e.status === 'draft') badges.push(`<span class="badge badge-draft">${t('badge_draft')}</span>`);
        if (isDue(e)) badges.push(`<span class="badge badge-due">${t('badge_due', { date: formatDate(e.outcome.dueDate) })}</span>`);
        if (e.score > 0) badges.push(`<span class="badge">${t('badge_recurs', { n: e.score + 1 })}</span>`);
        const decision = e.status === 'done' ? decisionLabel(e) : '';
        return `
        <a class="entry-card" href="${entryHref(e)}" style="--accent:${accent(e.type)}">
            <span class="entry-main">
                <span class="entry-text private-text ${e.nsfw ? 'nsfw' : ''}" ${e.nsfw ? `title="${t('nsfw_hold')}"` : ''}>${escapeHtml(e.content || '...')}</span>
                <span class="entry-meta">
                    <span class="type-tag">${t('type_short.' + e.type)}</span>
                    ${decision ? `<span class="entry-decision">${escapeHtml(decision)}</span>` : ''}
                    ${badges.join('')}
                    <span class="entry-date">${relTime(e.updatedAt)}</span>
                </span>
            </span>
        </a>`;
    }

    // ---------- Home ----------
    function home(root) {
        const entries = Store.all();
        const drafts = entries.filter(e => e.status === 'draft' && e.content.trim()).sort(byNewest);
        const today = isoDay(new Date());
        const due = entries.filter(e => isDue(e) && e.outcome.dueDate <= today);
        const recent = entries.filter(e => e.status === 'done').sort(byNewest).slice(0, 3);

        root.innerHTML = `
        <section class="card capture">
            <label for="capture" class="capture-label">${t('home_prompt')}</label>
            <textarea id="capture" class="private-text" rows="3" placeholder="${t('home_placeholder')}">${escapeHtml(captureText)}</textarea>
            <div class="triage" ${captureText.trim() ? '' : 'hidden'}>
                <p class="triage-q">${t('home_choose')}</p>
                <div class="triage-grid">
                    ${FLOW_TYPES.map((type, i) => `
                    <button type="button" class="triage-card" data-type="${type}" style="--accent:${accent(type)}">
                        <span class="opt-key">${i + 1}</span>
                        <span class="triage-label">${t('triage.' + type)}</span>
                        <span class="triage-desc">${t('triage.' + type + '.d')}</span>
                        <span class="triage-sub">${t('type.' + type)}</span>
                        <span class="opt-badge triage-hint">${t('triage_hint')}</span>
                    </button>`).join('')}
                </div>
                <label class="check-row"><input type="checkbox" id="captureNsfw" ${captureNsfw ? 'checked' : ''}> <span>${t('home_nsfw')}</span></label>
            </div>
            ${entries.length ? '' : `<p class="hint">${t('home_empty_hint')}</p>`}
        </section>

        ${due.length ? `
        <section class="strip">
            <h3>${t('home_due')}</h3>
            <div class="entry-list">${due.map(entryCard).join('')}</div>
        </section>` : ''}

        ${drafts.length ? `
        <section class="strip">
            <h3>${t('home_continue')}</h3>
            <div class="entry-list">${drafts.slice(0, 4).map(entryCard).join('')}</div>
        </section>` : ''}

        <section class="strip">
            <h3>${t('home_or_start')}</h3>
            <div class="tiles">
                ${FLOW_TYPES.map(type => `
                <button type="button" class="tile" data-start="${type}" style="--accent:${accent(type)}">
                    <span class="tile-title">${t('type.' + type)}</span>
                    <span class="tile-desc">${t('learn.' + type + '.what')}</span>
                </button>`).join('')}
            </div>
        </section>

        ${recent.length ? `
        <section class="strip">
            <div class="strip-head"><h3>${t('home_recent')}</h3><a href="#/journal" class="link-btn">${t('home_see_all')}</a></div>
            <div class="entry-list">${recent.map(entryCard).join('')}</div>
        </section>` : ''}

        <p class="local-only">${t('local_only')}</p>`;

        const box = root.querySelector('#capture');
        const triage = root.querySelector('.triage');
        const highlight = () => {
            const guess = guessType(box.value);
            root.querySelectorAll('.triage-card').forEach(c => c.classList.toggle('hinted', c.dataset.type === guess));
        };
        highlight();
        box.addEventListener('input', () => {
            captureText = box.value;
            triage.hidden = !box.value.trim();
            highlight();
        });
        box.addEventListener('keydown', e => {
            // Enter jumps to the suggested card; Shift+Enter keeps a new line
            if (e.key === 'Enter' && !e.shiftKey && box.value.trim()) {
                e.preventDefault();
                root.querySelector('.triage-card.hinted')?.focus();
            }
        });
        root.querySelector('#captureNsfw').addEventListener('change', e => { captureNsfw = e.target.checked; });

        root.querySelectorAll('.triage-card').forEach(card => {
            card.addEventListener('click', () => {
                const entry = Store.create(card.dataset.type, { content: box.value.trim(), nsfw: captureNsfw, step: 1 });
                captureText = '';
                captureNsfw = false;
                location.hash = `#/e/${entry.id}/1`;
            });
        });
        root.querySelectorAll('[data-start]').forEach(btn => btn.addEventListener('click', () => startFlow(btn.dataset.start)));

        if (!('ontouchstart' in window)) box.focus();
    }

    function homeKey(e) {
        if (!document.querySelector('.capture') || e.metaKey || e.ctrlKey || e.target.matches('textarea, input')) return false;
        if (/^[1-4]$/.test(e.key) && !document.querySelector('.triage').hidden) {
            document.querySelectorAll('.triage-card')[Number(e.key) - 1].click();
            return true;
        }
        return false;
    }

    // ---------- Completion ----------
    function done(root, entry) {
        const flow = FLOWS[entry.type];
        const decision = decisionLabel(entry);
        const o = entry.outcome;
        // The answer to the step right after the decision (first step, plan, acceptance, etc.)
        const steps = flow.steps;
        const di = steps.findIndex(s => s.key === flow.decisionKey);
        const follow = steps.slice(di + 1)
            .filter(s => s.type === 'text' || s.type === 'date')
            .filter(s => stepVisible(s, entry.answers) && entry.answers[s.key])
            .map(s => `<p class="done-follow"><span>${t(`f.${entry.type}.${s.key}.s`)}:</span> ${escapeHtml(formatAnswer(entry.type, s, entry.answers[s.key]))}</p>`)
            .join('');
        const siblings = Store.all().filter(e => e.status === 'draft' && e.type === entry.type && e.content &&
            (e.linkedFrom === entry.id || (entry.linkedFrom && e.linkedFrom === entry.linkedFrom)));

        root.innerHTML = `
        <section class="card done" style="--accent:${flow.accent}">
            <div class="done-mark" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 tabindex="-1">${t('done_title.' + entry.type)}</h2>
            <blockquote class="private-text">${escapeHtml(entry.content)}</blockquote>
            ${decision ? `<p class="done-decision">${t('done_decision')}: <strong>${escapeHtml(decision)}</strong></p>` : ''}
            ${follow}
            ${o.before && o.after ? `<p class="done-relief">${t('done_relief', { a: o.before, b: o.after })}</p>` : ''}
            <div class="done-actions">
                ${siblings.length ? `<a class="btn btn-primary" href="${entryHref(siblings[0])}">${t('done_more_worries', { n: siblings.length })}</a>` : ''}
                <a class="btn ${siblings.length ? 'btn-ghost' : 'btn-primary'}" href="#/">${t('done_again')}</a>
                <a class="btn btn-ghost" href="#/entry/${entry.id}">${t('done_view')}</a>
            </div>
        </section>`;
        root.querySelector('h2').focus({ preventScroll: true });
    }

    // ---------- Journal ----------
    function searchText(e) {
        const steps = FLOWS[e.type].steps;
        const answers = steps.filter(s => s.key !== 'content').map(s => formatAnswer(e.type, s, e.answers[s.key]));
        return [e.content, t('type.' + e.type), t('type_short.' + e.type), ...answers,
            ...(e.comments || []).map(c => c.text)].join(' ').toLowerCase();
    }

    function journalView(root, params) {
        if (params.type) journal.type = params.type;
        if (params.q !== undefined) journal.q = params.q;
        const sort = Store.setting('sort', 'newest');

        root.innerHTML = `
        <section class="journal">
            <div class="journal-tools">
                <input type="search" id="jSearch" placeholder="${t('journal_search')}" value="${escapeHtml(journal.q)}">
                <select id="jSort">
                    ${['newest', 'oldest', 'recurring'].map(s => `<option value="${s}" ${s === sort ? 'selected' : ''}>${t('sort_' + s)}</option>`).join('')}
                </select>
            </div>
            <div class="chips" id="jType">
                ${['all', ...FLOW_TYPES].map(v => `<button type="button" class="chip ${journal.type === v ? 'active' : ''}" data-v="${v}" ${v !== 'all' ? `style="--accent:${accent(v)}"` : ''}>${v === 'all' ? t('filter_all') : t('type_short.' + v)}</button>`).join('')}
            </div>
            <div class="chips" id="jStatus">
                ${['all', 'draft', 'done', 'due'].map(v => `<button type="button" class="chip chip-soft ${journal.status === v ? 'active' : ''}" data-v="${v}">${t('filter_' + v)}</button>`).join('')}
            </div>
            <div class="entry-list" id="jList"></div>
        </section>`;

        const list = root.querySelector('#jList');
        const draw = () => {
            const q = journal.q.trim().toLowerCase();
            const sortBy = Store.setting('sort', 'newest');
            let items = Store.all().filter(e => e.content.trim() || e.status === 'done')
                .filter(e => journal.type === 'all' || e.type === journal.type)
                .filter(e => journal.status === 'all' || (journal.status === 'due' ? isDue(e) : e.status === journal.status))
                .filter(e => !q || searchText(e).includes(q));
            items.sort((a, b) => sortBy === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt)
                : sortBy === 'recurring' ? (b.score - a.score) || byNewest(a, b)
                    : new Date(b.createdAt) - new Date(a.createdAt));
            list.innerHTML = items.length ? items.map(entryCard).join('') : `<p class="empty">${t('journal_empty')}</p>`;
        };
        draw();

        root.querySelector('#jSearch').addEventListener('input', e => { journal.q = e.target.value; draw(); });
        root.querySelector('#jSort').addEventListener('change', e => { Store.setSetting('sort', e.target.value); draw(); });
        [['#jType', 'type'], ['#jStatus', 'status']].forEach(([sel, key]) => {
            root.querySelector(sel).addEventListener('click', e => {
                const chip = e.target.closest('.chip');
                if (!chip) return;
                journal[key] = chip.dataset.v;
                root.querySelectorAll(sel + ' .chip').forEach(c => c.classList.toggle('active', c === chip));
                draw();
            });
        });
    }

    function openJournal(type, q) {
        journal.status = 'all';
        location.hash = `#/journal?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}`;
    }

    // ---------- Entry detail ----------
    function detail(root, entry) {
        if (!entry) {
            root.innerHTML = `<section class="card"><p class="empty">${t('detail_not_found')}</p></section>`;
            return;
        }
        const flow = FLOWS[entry.type];
        const rows = flow.steps
            .filter(s => s.key !== 'content' && stepVisible(s, entry.answers))
            .map(s => {
                const val = formatAnswer(entry.type, s, entry.answers[s.key]);
                const note = s.note && entry.answers[s.key + 'Note'];
                if (!val && !note) return '';
                return `<div class="sum-row"><dt>${t(`f.${entry.type}.${s.key}.s`)}</dt>
                    <dd class="private-text">${escapeHtml(val)}${note ? `<span class="sum-note">${escapeHtml(note)}</span>` : ''}</dd></div>`;
            }).join('');
        const parent = entry.linkedFrom && Store.get(entry.linkedFrom);
        const children = Store.all().filter(e => e.linkedFrom === entry.id);
        const due = isDue(entry);

        root.innerHTML = `
        <section class="card detail" style="--accent:${flow.accent}">
            <div class="detail-head">
                <span class="type-tag">${t('type.' + entry.type)}</span>
                <span class="entry-date">${formatDate(entry.createdAt)}</span>
            </div>
            <p class="detail-content private-text ${entry.nsfw ? 'nsfw' : ''}">${escapeHtml(entry.content)}</p>
            <div class="detail-actions">
                ${entry.status === 'draft'
                ? `<a class="btn btn-primary" href="${entryHref(entry)}">${t('detail_continue')}</a>`
                : `<button class="btn btn-primary" data-act="revisit">${t('detail_revisit')}</button>`}
                ${due ? `<button class="btn btn-ghost" data-act="complete">${t('detail_mark_done')}</button>` : ''}
                <button class="btn btn-ghost" data-act="recur">${t('detail_recur')}${entry.score ? ` · ${entry.score}` : ''}</button>
                <label class="check-row"><input type="checkbox" data-act="nsfw" ${entry.nsfw ? 'checked' : ''}> <span>${t('detail_nsfw')}</span></label>
                <span class="spacer"></span>
                <button class="btn btn-danger-ghost" data-act="delete">${t('detail_delete')}</button>
            </div>

            ${rows ? `<h3>${t('detail_answers')}</h3><dl class="summary">${rows}</dl>` : ''}
            ${entry.outcome.completed ? `<p class="badge badge-done">${t('detail_completed')} · ${formatDate(entry.outcome.completed)}</p>` : ''}

            ${parent ? `<h3>${t('detail_linked_from')}</h3><div class="entry-list">${entryCard(parent)}</div>` : ''}
            ${children.length ? `<h3>${t('detail_led_to')}</h3><div class="entry-list">${children.map(entryCard).join('')}</div>` : ''}
            ${entry.history.length ? `<p class="hint">${t('detail_history', { n: entry.history.length })}</p>` : ''}

            <h3>${t('detail_comments')}</h3>
            <ul class="comments">
                ${(entry.comments || []).slice().reverse().map(c => `
                <li><span class="private-text">${escapeHtml(c.text)}</span><time>${relTime(c.timestamp)}</time></li>`).join('')}
            </ul>
            <div class="comment-add">
                <textarea rows="2" id="commentText" placeholder="${t('detail_comment_ph')}"></textarea>
                <button class="btn btn-ghost" data-act="comment">${t('detail_add_comment')}</button>
            </div>
        </section>`;

        const on = (act, fn) => { const el = root.querySelector(`[data-act="${act}"]`); if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'click', fn); };
        const rerender = () => detail(root, Store.get(entry.id));

        on('revisit', () => {
            const history = [...entry.history, { at: new Date().toISOString(), answers: entry.answers, outcome: entry.outcome }];
            Store.update(entry.id, { status: 'draft', step: 1, history, outcome: {} });
            location.hash = `#/e/${entry.id}/1`;
        });
        on('complete', () => { Store.update(entry.id, { outcome: { ...entry.outcome, completed: new Date().toISOString() } }); rerender(); });
        on('recur', () => { Store.update(entry.id, { score: (entry.score || 0) + 1 }); rerender(); });
        on('nsfw', e => { Store.update(entry.id, { nsfw: e.target.checked }); rerender(); });
        on('comment', () => {
            const text = root.querySelector('#commentText').value.trim();
            if (!text) return;
            const comments = [...(entry.comments || []), { id: Date.now(), text, timestamp: new Date().toISOString() }];
            Store.update(entry.id, { comments });
            rerender();
        });
        on('delete', e => {
            const btn = e.currentTarget;
            if (btn.dataset.armed) {
                Store.remove(entry.id);
                location.hash = '#/journal';
                return;
            }
            btn.dataset.armed = '1';
            btn.textContent = t('detail_delete_confirm');
            setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = t('detail_delete'); } }, 5000);
        });
    }

    // ---------- Insights ----------
    function countBy(list, fn) {
        const counts = {};
        list.forEach(e => [].concat(fn(e) || []).forEach(k => { counts[k] = (counts[k] || 0) + 1; }));
        return counts;
    }

    function avg(nums) {
        const n = nums.filter(x => typeof x === 'number');
        return n.length ? (n.reduce((a, b) => a + b, 0) / n.length).toFixed(1) : null;
    }

    function streak(entries) {
        const days = new Set(entries.map(e => isoDay(new Date(e.updatedAt))));
        let n = 0;
        const d = new Date();
        if (!days.has(isoDay(d))) d.setDate(d.getDate() - 1); // today not done yet keeps yesterday's streak
        while (days.has(isoDay(d))) { n++; d.setDate(d.getDate() - 1); }
        return n;
    }

    function insights(root) {
        const doneEntries = Store.all().filter(e => e.status === 'done');
        if (!doneEntries.length) {
            root.innerHTML = `<section class="card"><h2>${t('ins_title')}</h2><p class="empty">${t('ins_empty')}</p></section>`;
            return;
        }
        const of = type => doneEntries.filter(e => e.type === type);
        const label = (type, key) => v => optionLabel(type, FLOWS[type].steps.find(s => s.key === key), v);
        const relief = (list, [b, a]) => ({ before: avg(list.map(e => e.answers[b])), after: avg(list.map(e => e.answers[a])) });

        const thoughts = of('thought'), desires = of('desire'), worries = of('worry'), angers = of('anger');
        const wr = relief(worries, FLOWS.worry.relief);
        const ar = relief(angers, FLOWS.anger.relief);

        root.innerHTML = `
        <section class="insights">
            <div class="stat-tiles">
                <div class="stat-tile"><span class="stat-num">${doneEntries.length}</span><span>${t('ins_total')}</span></div>
                <div class="stat-tile"><span class="stat-num">${streak(doneEntries)}</span><span>${t('ins_streak')}</span></div>
                ${FLOW_TYPES.map(type => `<a class="stat-tile" href="#/journal?type=${type}&q=" style="--accent:${accent(type)}"><span class="stat-num">${of(type).length}</span><span>${t('type_short.' + type)}</span></a>`).join('')}
            </div>
            <p class="hint">${t('ins_filter_hint')}</p>
            <div class="ins-grid">
                ${thoughts.length ? `
                <div class="card"><h3>${t('ins_sources')}</h3><div class="treemap-container" id="insSources"></div></div>
                <div class="card"><h3>${t('ins_nature')}</h3><div id="insNature"></div></div>` : ''}
                ${desires.length ? `<div class="card"><h3>${t('ins_desires')}</h3><div id="insDesires"></div></div>` : ''}
                ${worries.length ? `<div class="card"><h3>${t('ins_worries')}</h3><div id="insWorries"></div>
                    ${wr.before && wr.after ? `<p class="hint">${t('ins_worry_relief', wr)}</p>` : ''}</div>` : ''}
                ${angers.length ? `<div class="card"><h3>${t('ins_anger')}</h3><div id="insAnger"></div>
                    ${ar.before && ar.after ? `<p class="hint">${t('ins_anger_relief', ar)}</p>` : ''}</div>` : ''}
            </div>
        </section>`;

        const srcLabel = v => t('src.' + v);
        const relabel = (counts, fn) => Object.fromEntries(Object.entries(counts).map(([k, v]) => [fn(k), v]));
        const chart = (id, type, counts, fn, colors) => {
            const el = root.querySelector(id);
            if (!el) return;
            const labelled = relabel(counts, fn);
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const draw = id === '#insSources' ? renderTreemap : renderBarChart;
            draw(el, labelled, total, lbl => openJournal(type, lbl), colors);
        };

        chart('#insSources', 'thought', countBy(thoughts, e => e.answers.sources), srcLabel);
        chart('#insNature', 'thought', countBy(thoughts, e => e.answers.nature), label('thought', 'nature'),
            { [t('f.thought.nature.good')]: 'var(--success-text)', [t('f.thought.nature.harmful')]: 'var(--danger-text)', [t('f.thought.nature.unsure')]: '#B54708' });
        chart('#insDesires', 'desire', countBy(desires, e => e.answers.decision), label('desire', 'decision'));
        chart('#insWorries', 'worry', countBy(worries, e => e.answers.group), label('worry', 'group'));
        chart('#insAnger', 'anger', countBy(angers, e => e.answers.response), label('anger', 'response'));
    }

    // Ported from v1 app.js renderTreemap: binary split layout, slate scale
    function renderTreemap(container, counts, total, onPick) {
        container.innerHTML = '';
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
        if (!entries.length) return;

        function layout(items, rect) {
            if (!items.length) return;
            if (items.length === 1) return drawNode(items[0], rect);
            const totalW = items.reduce((s, i) => s + i.count, 0);
            let acc = 0, split = 1;
            for (let i = 0; i < items.length; i++) {
                acc += items[i].count;
                if (acc >= totalW / 2) { split = i + 1; break; }
            }
            split = Math.min(Math.max(split, 1), items.length - 1);
            const a = items.slice(0, split), b = items.slice(split);
            const ratio = a.reduce((s, i) => s + i.count, 0) / totalW;
            if (rect.w > rect.h) {
                const w = rect.w * ratio;
                layout(a, { x: rect.x, y: rect.y, w, h: rect.h });
                layout(b, { x: rect.x + w, y: rect.y, w: rect.w - w, h: rect.h });
            } else {
                const h = rect.h * ratio;
                layout(a, { x: rect.x, y: rect.y, w: rect.w, h });
                layout(b, { x: rect.x, y: rect.y + h, w: rect.w, h: rect.h - h });
            }
        }

        function drawNode(item, rect) {
            const node = document.createElement('button');
            node.type = 'button';
            node.className = 'treemap-node';
            Object.assign(node.style, { left: rect.x + '%', top: rect.y + '%', width: rect.w + '%', height: rect.h + '%' });
            const index = entries.indexOf(item);
            node.style.backgroundColor = `hsl(215, 25%, ${15 + index * (35 / entries.length)}%)`;
            node.onclick = () => onPick(item.label);
            node.innerHTML = `<span>${escapeHtml(item.label)}</span><span class="count">${item.count} (${Math.round(item.count / total * 100)}%)</span>`;
            container.appendChild(node);
        }

        layout(entries, { x: 0, y: 0, w: 100, h: 100 });
    }

    // Ported from v1 app.js renderBarChart
    function renderBarChart(container, counts, total, onPick, colors = {}) {
        container.innerHTML = '';
        Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([label, count]) => {
            const pct = Math.round(count / total * 100);
            const bar = document.createElement('button');
            bar.type = 'button';
            bar.className = 'stat-bar';
            bar.onclick = () => onPick(label);
            bar.innerHTML = `
                <span class="stat-label"><span>${escapeHtml(label)}</span><span>${count} (${pct}%)</span></span>
                <span class="stat-track"><span class="stat-fill" style="width:0%;background:${colors[label] || 'var(--accent, var(--primary-color))'}"></span></span>`;
            container.appendChild(bar);
            setTimeout(() => { bar.querySelector('.stat-fill').style.width = pct + '%'; }, 50);
        });
    }

    // ---------- Learn ----------
    function learn(root) {
        root.innerHTML = `
        <section class="learn">
            <div class="card">
                <h2>${t('learn_title')}</h2>
                <p>${t('learn_intro')}</p>
            </div>
            ${FLOW_TYPES.map(type => `
            <article class="card learn-card" style="--accent:${accent(type)}">
                <h3>${t('type.' + type)}</h3>
                <p class="learn-what">${t('learn.' + type + '.what')}</p>
                <p>${t('learn.' + type + '.why')}</p>
                <h4>${t('learn_steps')}</h4>
                <ol>${t('learn.' + type + '.steps').split('|').map(s => `<li>${s}</li>`).join('')}</ol>
                <button class="btn btn-primary" data-start="${type}">${t('learn_start')}</button>
            </article>`).join('')}
        </section>`;
        root.querySelectorAll('[data-start]').forEach(btn => btn.addEventListener('click', () => startFlow(btn.dataset.start)));
    }

    // ---------- Settings ----------
    function settings(root) {
        const langs = Object.keys(window.translations);
        const names = { en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', ml: 'മലയാളം', te: 'తెలుగు', kn: 'ಕನ್ನಡ' };
        root.innerHTML = `
        <section class="settings">
            <div class="card">
                <h2>${t('set_title')}</h2>
                <label class="field"><span>${t('set_language')}</span>
                    <select id="setLang">${langs.map(l => `<option value="${l}" ${l === currentLanguage ? 'selected' : ''}>${names[l] || l}</option>`).join('')}</select>
                </label>
                <p class="hint">${t('set_language_note')}</p>
                <button class="link-btn" id="setOnb">${t('set_onboarding')}</button>
            </div>
            <div class="card">
                <h3>${t('set_data')}</h3>
                <p class="hint">${t('local_only')}</p>
                <div class="row">
                    <button class="btn btn-primary" id="expFile">${t('set_export_file')}</button>
                    <button class="btn btn-ghost" id="expCopy">${t('set_export_copy')}</button>
                </div>
                <h3>${t('set_import')}</h3>
                <div class="row">
                    <label class="btn btn-ghost file-btn">${t('set_import_file')}<input type="file" id="impFile" accept=".json,application/json" hidden></label>
                </div>
                <textarea id="impText" rows="3" placeholder="${t('set_import_paste_ph')}"></textarea>
                <div class="row">
                    <button class="btn btn-ghost" data-mode="merge">${t('set_import_merge')}</button>
                    <button class="btn btn-ghost" data-mode="replace">${t('set_import_replace')}</button>
                </div>
            </div>
            <div class="card danger">
                <h3>${t('set_danger')}</h3>
                <p class="hint">${t('set_danger_note')}</p>
                <div class="row">
                    <input type="text" id="delConfirm" placeholder="DELETE" autocomplete="off">
                    <button class="btn btn-danger" id="delAll" disabled>${t('set_danger_btn')}</button>
                </div>
            </div>
            <p class="local-only"><a href="../index.html">${t('set_v1')}</a></p>
        </section>`;

        root.querySelector('#setLang').addEventListener('change', e => changeLanguage(e.target.value));
        root.querySelector('#setOnb').addEventListener('click', () => onboarding(true));

        root.querySelector('#expFile').addEventListener('click', () => {
            const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `introspect-backup-${isoDay(new Date())}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        });
        root.querySelector('#expCopy').addEventListener('click', async e => {
            try {
                await navigator.clipboard.writeText(Store.exportJSON());
                e.target.textContent = t('set_copied');
            } catch {
                root.querySelector('#impText').value = Store.exportJSON();
                root.querySelector('#impText').select();
            }
        });

        const impText = root.querySelector('#impText');
        root.querySelector('#impFile').addEventListener('change', async e => {
            const file = e.target.files[0];
            if (file) impText.value = await file.text();
        });
        root.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
            try {
                const n = Store.importJSON(impText.value, btn.dataset.mode);
                impText.value = '';
                toast(t('set_import_ok', { n }));
            } catch {
                toast(t('set_import_bad'), true);
            }
        }));

        const del = root.querySelector('#delAll');
        root.querySelector('#delConfirm').addEventListener('input', e => { del.disabled = e.target.value !== 'DELETE'; });
        del.addEventListener('click', () => {
            Store.clear();
            root.querySelector('#delConfirm').value = '';
            del.disabled = true;
            toast(t('set_deleted'));
        });
    }

    // ---------- Onboarding ----------
    function onboarding(force) {
        if (!force && Store.setting('onboarded', null)) return;
        let i = 0;
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        document.body.appendChild(overlay);
        const close = () => { Store.setSetting('onboarded', '1'); overlay.remove(); document.querySelector('#capture')?.focus(); };
        const draw = () => {
            const n = i + 1;
            overlay.innerHTML = `
            <div class="onb card">
                <span class="onb-num">${n}</span>
                <h2 tabindex="-1">${t(`onb_${n}_t`)}</h2>
                <p>${t(`onb_${n}_d`)}</p>
                <div class="onb-dots">${[0, 1, 2].map(d => `<span class="${d === i ? 'now' : ''}"></span>`).join('')}</div>
                <div class="row">
                    <button class="btn btn-ghost" data-onb="skip">${t('onb_skip')}</button>
                    <span class="spacer"></span>
                    <button class="btn btn-primary" data-onb="next">${i < 2 ? t('onb_next') : t('onb_start')}</button>
                </div>
            </div>`;
            overlay.querySelector('h2').focus();
            overlay.querySelector('[data-onb="skip"]').onclick = close;
            overlay.querySelector('[data-onb="next"]').onclick = () => { if (i < 2) { i++; draw(); } else close(); };
        };
        draw();
    }

    return { home, homeKey, done, journal: journalView, detail, insights, learn, settings, onboarding };
})();
