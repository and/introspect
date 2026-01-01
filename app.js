// Storage Key
const STORAGE_KEY = 'introspection_thoughts';

// DOM Elements
const form = document.getElementById('thoughtForm');
const thoughtsList = document.getElementById('thoughtsList');
const historyPanel = document.getElementById('historyPanel');
const clearHistoryBtn = document.getElementById('clearHistory');
const searchInput = document.getElementById('searchTerm');
const sortSelect = document.getElementById('sortThoughts');
const privacyToggleBtn = document.getElementById('privacyToggle');
const fontIncreaseBtn = document.getElementById('fontIncrease');
const fontDecreaseBtn = document.getElementById('fontDecrease');

// Settings Elements
const settingsToggleBtn = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const mainDashboard = document.getElementById('mainDashboard');
const backToHomeBtn = document.getElementById('backToHome');
const exportArea = document.getElementById('exportArea');
const copyBtn = document.getElementById('copyBtn');
const importArea = document.getElementById('importArea');
const importBtn = document.getElementById('importBtn');
const deleteConfirmInput = document.getElementById('deleteConfirmInput');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const copyFeedback = document.getElementById('copyFeedback');
const languageSelect = document.getElementById('languageSelect');

// State
let thoughts = [];
let editingId = null;
let currentFontSize = 100; // Percentage
let currentLanguage = 'en'; // Default

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadThoughts();
    renderApp();

    // Listeners for filters
    searchInput.addEventListener('input', renderList);
    sortSelect.addEventListener('change', () => {
        localStorage.setItem('introspection_sort', sortSelect.value);
        renderList();
    });

    // Privacy Toggle
    privacyToggleBtn.addEventListener('click', togglePrivacy);

    // Font Controls
    fontIncreaseBtn.addEventListener('click', () => changeFontSize(10));
    fontDecreaseBtn.addEventListener('click', () => changeFontSize(-10));

    // Restore Settings
    if (localStorage.getItem('introspection_privacy') === 'true') {
        togglePrivacy();
    }

    const savedSort = localStorage.getItem('introspection_sort');
    if (savedSort) {
        sortSelect.value = savedSort;
    }

    const savedSize = localStorage.getItem('introspection_fontsize');
    if (savedSize) {
        currentFontSize = parseInt(savedSize, 10);
        applyFontSize();
    }

    // Language State
    const savedLang = localStorage.getItem('introspection_language');
    if (savedLang && translations[savedLang]) {
        currentLanguage = savedLang;
        languageSelect.value = savedLang;
    }
    applyLanguage(currentLanguage);

    // Settings Navigation
    settingsToggleBtn.addEventListener('click', openSettings);
    backToHomeBtn.addEventListener('click', closeSettings);

    // Data Management
    copyBtn.addEventListener('click', copyDataToClipboard);
    importBtn.addEventListener('click', importData);
    deleteConfirmInput.addEventListener('input', validateDeleteInput);
    deleteAllBtn.addEventListener('click', nukeAllData); // "Nuke" for dramatic effect in comments only :)

    languageSelect.addEventListener('change', (e) => {
        changeLanguage(e.target.value);
    });

    // Footer Backup Link
    const footerBackupLink = document.getElementById('footerBackupLink');
    if (footerBackupLink) {
        footerBackupLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSettings();
            // Wait for display:block to apply then scroll
            setTimeout(() => {
                const exportSection = document.getElementById('exportSection');
                if (exportSection) {
                    exportSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight effect
                    exportSection.style.transition = 'background-color 0.5s';
                    exportSection.style.backgroundColor = 'rgba(230, 53, 34, 0.1)';
                    setTimeout(() => {
                        exportSection.style.backgroundColor = '';
                    }, 1500);
                }
            }, 50);
        });
    }

    // Re-render with restored settings
    renderList();
});

// i18n Helpers
function t(key) {
    if (!translations[currentLanguage]) return key;
    return translations[currentLanguage][key] || key;
}

function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('introspection_language', lang);
    applyLanguage(lang);
    renderApp(); // Re-render dynamic content (charts, list)
}

function applyLanguage(lang) {
    const dict = translations[lang] || translations['en'];

    // Text Content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.textContent = dict[key];
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) el.placeholder = dict[key];
    });
}

// Settings Logic
function openSettings() {
    mainDashboard.style.display = 'none';
    settingsPanel.style.display = 'block';

    // Auto-populate export
    exportArea.value = JSON.stringify(thoughts);
}

function closeSettings() {
    settingsPanel.style.display = 'none';
    mainDashboard.style.display = 'grid'; // Restore grid
    // Reset danger zone
    deleteConfirmInput.value = '';
    validateDeleteInput();
}

function copyDataToClipboard() {
    exportArea.select();
    exportArea.setSelectionRange(0, 99999); // Mobile
    navigator.clipboard.writeText(exportArea.value).then(() => {
        copyFeedback.style.display = 'block';
        setTimeout(() => copyFeedback.style.display = 'none', 2000);
    });
}

function importData() {
    const raw = importArea.value;
    try {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
            thoughts = data;
            saveThoughts();
            importArea.value = '';
            alert(t('msg_import_success'));
            closeSettings();
        } else {
            alert(t('err_invalid_format'));
        }
    } catch (e) {
        alert(t('err_invalid_json'));
    }
}

function validateDeleteInput() {
    if (deleteConfirmInput.value.trim().toUpperCase() === 'DELETE') {
        deleteAllBtn.disabled = false;
        deleteAllBtn.style.opacity = '1';
        deleteAllBtn.style.cursor = 'pointer';
    } else {
        deleteAllBtn.disabled = true;
        deleteAllBtn.style.opacity = '0.5';
        deleteAllBtn.style.cursor = 'not-allowed';
    }
}

function nukeAllData() {
    // Confirmation is implied by typing 'delete'
    thoughts = [];
    saveThoughts();
    // alert(t('msg_all_deleted')); 
    closeSettings();
}

// Font Size Logic
function changeFontSize(delta) {
    currentFontSize += delta;
    // Limits: 70% to 150%
    if (currentFontSize < 70) currentFontSize = 70;
    if (currentFontSize > 150) currentFontSize = 150;

    applyFontSize();
    localStorage.setItem('introspection_fontsize', currentFontSize);
}

function applyFontSize() {
    // We adjust the root html font-size
    // Default is usually 16px (100%).
    document.documentElement.style.fontSize = `${currentFontSize}%`;
}

// Load thoughts from LocalStorage
function loadThoughts() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            thoughts = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to parse thoughts', e);
            thoughts = [];
        }
    }
}

// Save thoughts to LocalStorage
function saveThoughts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thoughts));
    renderApp();
}

// Handle Form Submit (Create or Update)
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const content = document.getElementById('thoughtContent').value;
    const rootCause = document.getElementById('rootCause').value;
    const nature = document.querySelector('input[name="nature"]:checked').value;

    if (editingId) {
        // Update existing thought
        const index = thoughts.findIndex(t => t.id === editingId);
        if (index !== -1) {
            thoughts[index] = {
                ...thoughts[index],
                content,
                rootCause,
                classification: nature,
                // keep original timestamp or update? Keeping original usually better for history, 
                // but maybe we want an 'updatedAt'. For simplicity, keeping original.
            };
        }
        editingId = null;
        exitEditModeUI();
    } else {
        // Create new thought
        const newThought = {
            id: Date.now(),
            content,
            rootCause,
            classification: nature,
            score: 0, // Initialize score
            timestamp: new Date().toISOString()
        };
        thoughts.unshift(newThought);
    }

    saveThoughts();
    form.reset();

    // Feedback
    const btn = form.querySelector('.btn-primary');
    // const originalText = btn.textContent; // Not needed if we reset correctly

    btn.textContent = editingId ? t('msg_updated') : t('msg_saved');

    setTimeout(() => {
        // Reset to original label
        if (!editingId) btn.textContent = t('btn_log_thought');
    }, 2000);
});

// Edit Thought
window.editThought = function (id) {
    const thought = thoughts.find(t => t.id === id);
    if (!thought) return;

    editingId = id;

    // Populate form
    document.getElementById('thoughtContent').value = thought.content;
    document.getElementById('rootCause').value = thought.rootCause;

    const radio = document.querySelector(`input[name="nature"][value="${thought.classification}"]`);
    if (radio) radio.checked = true;

    // Change UI to Edit Mode
    const btn = form.querySelector('.btn-primary');
    btn.textContent = t('btn_update_thought');
    btn.style.background = 'var(--text-main)'; // Dark slate to indicate edit mode

    // Scroll to form on mobile
    form.scrollIntoView({ behavior: 'smooth' });
};

function exitEditModeUI() {
    const btn = form.querySelector('.btn-primary');
    btn.textContent = t('btn_log_thought');
    btn.style.background = ''; // Reset to CSS default
}

// Clear All History
// Clear All History
clearHistoryBtn.addEventListener('click', () => {
    if (clearHistoryBtn.classList.contains('confirm-clear')) {
        // Second click: Confirm
        thoughts = [];
        saveThoughts();
        editingId = null;
        exitEditModeUI();
        form.reset();

        // Reset button
        clearHistoryBtn.textContent = 'Clear All';
        clearHistoryBtn.classList.remove('confirm-clear');
        clearHistoryBtn.style.color = '';
        clearHistoryBtn.style.fontWeight = '';
    } else {
        // First click: Request confirmation
        const originalText = clearHistoryBtn.textContent;
        clearHistoryBtn.textContent = t('btn_confirm_clear');
        clearHistoryBtn.classList.add('confirm-clear');
        clearHistoryBtn.style.color = 'var(--danger-text)';
        clearHistoryBtn.style.fontWeight = '700';

        // Reset if not clicked within 8 seconds
        setTimeout(() => {
            if (thoughts.length > 0) { // Only reset if data still exists (not cleared)
                clearHistoryBtn.textContent = t('btn_clear_all'); // Reset specific text
                clearHistoryBtn.classList.remove('confirm-clear');
                clearHistoryBtn.style.color = '';
                clearHistoryBtn.style.fontWeight = '';
            }
        }, 8000); // Extended to 8 seconds
    }
});

// Render App (List & Stats)
function renderApp() {
    // Visibility Check
    if (thoughts.length === 0) {
        historyPanel.style.display = 'none';
        // Also ensure main grid is single column if needed? 
        // With CSS grid 400px 1fr, if right col is hidden, left col stays 400px.
        // Ideally we might want to center the input form if history is gone, 
        // but user just asked to hide it.
    } else {
        historyPanel.style.display = 'flex';
    }

    renderList();
    renderStats();

    // clearHistoryBtn.style.display = thoughts.length > 0 ? 'block' : 'none';
    clearHistoryBtn.style.display = 'none';
}

// Toggle Privacy Mode
function togglePrivacy() {
    document.body.classList.toggle('privacy-mode');
    const isPrivate = document.body.classList.contains('privacy-mode');

    localStorage.setItem('introspection_privacy', isPrivate);

    // Icon State
    if (isPrivate) {
        // Closed Eye (Slashed)
        privacyToggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        privacyToggleBtn.style.color = 'var(--text-main)'; // Highlight when active
    } else {
        // Open Eye
        privacyToggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        privacyToggleBtn.style.color = 'var(--text-muted)';
    }
}

// Render Thoughts List
function renderList() {
    thoughtsList.innerHTML = '';

    // Filter
    const query = searchInput.value.toLowerCase();
    let filtered = thoughts.filter(t =>
        t.content.toLowerCase().includes(query) ||
        t.rootCause.toLowerCase().includes(query) ||
        t.classification.toLowerCase().includes(query)
    );

    // Sort
    const sortMode = sortSelect.value;
    filtered.sort((a, b) => {
        if (sortMode === 'newest') return b.id - a.id; // Time descending
        if (sortMode === 'oldest') return a.id - b.id; // Time ascending
        if (sortMode === 'votes') return (b.score || 0) - (a.score || 0); // Voted score descending
        return 0;
    });

    // Check if empty after filter
    if (filtered.length === 0) {
        if (thoughts.length === 0) {
            // Truly empty
            thoughtsList.innerHTML = `
                <div class="empty-state" style="margin-top: 2rem;">
                    <p data-i18n="empty_history">${t('empty_history')}</p>
                </div>
            `;
        } else {
            // Empty search result
            thoughtsList.innerHTML = `
                <div class="empty-state" style="margin-top: 2rem;">
                    <p data-i18n="empty_search_results">${t('empty_search_results')}</p>
                </div>
            `;
        }
        return;
    }

    filtered.forEach(thought => {
        const date = new Date(thought.timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const el = document.createElement('div');
        el.className = `thought-item ${thought.classification.toLowerCase()}`;

        // Simple Monocolor SVGs
        const iconGood = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`;
        const iconHarmful = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        const iconUnsure = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

        let icon;
        if (thought.classification === 'Good') icon = iconGood;
        else if (thought.classification === 'Harmful') icon = iconHarmful;
        else icon = iconUnsure;

        // Default score to 0 if not present
        const score = thought.score || 0;

        el.innerHTML = `
            <div class="thought-meta">
                <span class="thought-cause-tag">${thought.rootCause}</span>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span>${date}</span>
                    <button class="edit-btn" data-action="edit" data-id="${thought.id}" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="delete-btn" data-action="delete" data-id="${thought.id}" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
            <div class="thought-content" title="Click to reveal/hide in privacy mode">${escapeHtml(thought.content)}</div>
            <div class="thought-actions">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-right:auto;">
                    ${icon} <span>${thought.classification}</span>
                </div>
                
                <div class="vote-controls">
                    <button class="vote-btn" data-action="upvote" data-id="${thought.id}" title="Recurs">▲</button>
                    <span class="vote-count">${score}</span>
                    <button class="vote-btn" data-action="downvote" data-id="${thought.id}" title="Less">▼</button>
                </div>
            </div>
        `;
        thoughtsList.appendChild(el);
    });
}

// Event Delegation for List Actions
thoughtsList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    const content = e.target.closest('.thought-content');

    // Handle Privacy Reveal
    if (content && document.body.classList.contains('privacy-mode')) {
        content.classList.toggle('revealed');
        return;
    }

    if (!btn) return;

    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);

    if (action === 'edit') {
        editThought(id);
    }
    else if (action === 'upvote') {
        updateScore(id, 1);
    }
    else if (action === 'downvote') {
        updateScore(id, -1);
    }
    else if (action === 'delete') {
        // Custom Confirmation Logic
        if (btn.classList.contains('confirm-delete')) {
            // Second click: Delete
            deleteThought(id);
        } else {
            // First click: Ask for confirmation
            const originalContent = btn.innerHTML;
            btn.innerHTML = t('btn_sure');
            btn.classList.add('confirm-delete');
            btn.style.width = 'auto';
            btn.style.fontSize = '0.8rem';
            btn.style.color = 'var(--harmful-color)'; // Make it red immediately

            // Reset if not clicked within 8 seconds
            setTimeout(() => {
                if (btn && btn.isConnected) { // Check if element still exists
                    btn.innerHTML = originalContent; // Icon
                    btn.classList.remove('confirm-delete');
                    btn.style.fontSize = '';
                    btn.style.color = '';
                }
            }, 8000); // Extended to 8 seconds
        }
    }
});

// Render Statistics
function renderStats() {
    const rootContainer = document.getElementById('statsRootCause');
    const natureContainer = document.getElementById('statsNature');

    if (thoughts.length === 0) {
        const emptyHtml = `<p class="empty-state-text" style="color:var(--text-muted); text-align:center;" data-i18n="empty_log_to_see">${t('empty_log_to_see')}</p>`;
        rootContainer.innerHTML = emptyHtml;
        natureContainer.innerHTML = emptyHtml;
        return;
    }

    // 1. Root Cause Distribution (Treemap)
    const rootCounts = {};
    thoughts.forEach(t => { rootCounts[t.rootCause] = (rootCounts[t.rootCause] || 0) + 1; });
    renderTreemap(rootContainer, rootCounts, thoughts.length);

    // 2. Nature Distribution (Bar Chart)
    const natureCounts = {};
    thoughts.forEach(t => { natureCounts[t.classification] = (natureCounts[t.classification] || 0) + 1; });
    renderBarChart(natureContainer, natureCounts, thoughts.length);
}

// Helper: Render Treemap (Binary Split)
function renderTreemap(container, counts, total) {
    container.innerHTML = '';
    container.className = 'treemap-container'; // Set class for sizing

    const entries = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Sort desc
        .map(([label, count]) => ({ label, count, weight: count }));

    if (entries.length === 0) return;

    // Recursive layout function
    // items: array of {label, count, weight}
    // rect: {x, y, w, h} (percentages 0-100)
    function layout(items, rect) {
        if (items.length === 0) return;

        if (items.length === 1) {
            drawNode(items[0], rect);
            return;
        }

        // Divide items into two halves with roughly equal weight
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let currentWeight = 0;
        let splitIndex = 0;

        // Find split point
        for (let i = 0; i < items.length; i++) {
            currentWeight += items[i].weight;
            if (currentWeight >= totalWeight / 2) {
                splitIndex = i + 1;
                break;
            }
        }
        // Ensure at least one item in each group if possible
        if (splitIndex >= items.length) splitIndex = items.length - 1;
        if (splitIndex < 1) splitIndex = 1;

        const groupA = items.slice(0, splitIndex);
        const groupB = items.slice(splitIndex);

        const weightA = groupA.reduce((sum, item) => sum + item.weight, 0);
        const weightB = groupB.reduce((sum, item) => sum + item.weight, 0);
        const ratioA = weightA / totalWeight;

        // Split rect
        // If wider than tall, split horizontally (left/right)
        // If taller than wide, split vertically (top/bottom)
        // Note: Using container aspect ratio helps, but assuming local rect shape is fine.
        let rectA, rectB;

        if (rect.w > rect.h) {
            // Split Horizontally (Vertical Cut)
            const splitW = rect.w * ratioA;
            rectA = { x: rect.x, y: rect.y, w: splitW, h: rect.h };
            rectB = { x: rect.x + splitW, y: rect.y, w: rect.w - splitW, h: rect.h };
        } else {
            // Split Vertically (Horizontal Cut)
            const splitH = rect.h * ratioA;
            rectA = { x: rect.x, y: rect.y, w: rect.w, h: splitH };
            rectB = { x: rect.x, y: rect.y + splitH, w: rect.w, h: rect.h - splitH };
        }

        layout(groupA, rectA);
        layout(groupB, rectB);
    }

    function drawNode(item, rect) {
        const node = document.createElement('div');
        node.className = 'treemap-node';
        node.style.left = `${rect.x}%`;
        node.style.top = `${rect.y}%`;
        node.style.width = `${rect.w}%`;
        node.style.height = `${rect.h}%`;

        // Theme Colors: Monochromatic Slate Scale (Databricks style)
        // Map index to a lightness value between 20% (Dark Slate) and 60% (Muted Slate)
        // Base Hue: 215 (Slate Blue)
        const index = entries.findIndex(e => e.label === item.label);
        const minL = 15; // var(--text-main) approx
        const maxL = 50; // var(--text-muted) approx

        // Calculate lightness based on rank (rarer items are lighter)
        const step = (maxL - minL) / (entries.length || 1);
        const lightness = minL + (index * step);

        node.style.backgroundColor = `hsl(215, 25%, ${lightness}%)`;

        node.title = `Filter by ${item.label}`;
        node.onclick = () => {
            searchInput.value = item.label;
            renderList();
            document.getElementById('historyPanel').scrollIntoView({ behavior: 'smooth' });
        };

        const percentage = Math.round((item.count / total) * 100);
        node.innerHTML = `
            <span>${item.label}</span>
            <span class="count">${item.count} (${percentage}%)</span>
        `;

        container.appendChild(node);
    }

    // Start Layout
    layout(entries, { x: 0, y: 0, w: 100, h: 100 });
}

// Helper: Render Bar Chart
function renderBarChart(container, counts, total) {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    container.innerHTML = '';

    sorted.forEach(([label, count]) => {
        const percentage = Math.round((count / total) * 100);

        // Determine color for nature if applicable
        let fillColor = 'var(--primary-color)';
        if (label === 'Good') fillColor = 'var(--success-text)';
        if (label === 'Harmful') fillColor = 'var(--danger-text)';
        if (label === 'Unsure') fillColor = '#B54708';

        const bar = document.createElement('div');
        bar.className = 'stat-bar-container';
        bar.title = `Filter by ${label}`;
        bar.onclick = () => {
            searchInput.value = label;
            renderList();
            // Maybe scroll to list?
            document.getElementById('historyPanel').scrollIntoView({ behavior: 'smooth' });
        };

        bar.innerHTML = `
            <div class="stat-label">
                <span>${label}</span>
                <span>${count} (${percentage}%)</span>
            </div>
            <div class="stat-track">
                <div class="stat-fill" style="width: 0%; background-color: ${fillColor}"></div>
            </div>
        `;

        container.appendChild(bar);

        // Animate width after minor delay
        setTimeout(() => {
            bar.querySelector('.stat-fill').style.width = `${percentage}%`;
        }, 50);
    });
}

// Helper: Delete Thought
function deleteThought(id) {
    thoughts = thoughts.filter(t => t.id !== id);
    saveThoughts();
}

// Helper: Update Score
function updateScore(id, delta) {
    const thought = thoughts.find(t => t.id === id);
    if (thought) {
        thought.score = (thought.score || 0) + delta;
        saveThoughts();
    }
}

// Helper: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
