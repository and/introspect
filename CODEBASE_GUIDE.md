# Introspection Tool - Codebase Guide for LLMs

## Project Overview

**Project Name:** Introspection - Thought Analysis Tool
**Purpose:** A privacy-focused, client-side web application for practicing the introspection framework taught by Vethathiri Maharishi. Helps users systematically examine thoughts, trace them to root causes, and cultivate mental clarity.
**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES6+)
**Data Storage:** Browser LocalStorage (100% client-side, no backend)
**Live URL:** https://and.github.io/introspect

## Core Philosophy

- **Privacy First:** All data remains in the browser (LocalStorage). No server communication.
- **Minimalist Design:** Clean, "Databricks-inspired" aesthetic with Slate color palette
- **No Dependencies:** Pure vanilla JavaScript, no frameworks or libraries
- **Accessibility:** Font size controls, multi-language support, privacy mode

## Project Structure

```
introspection_tools/
├── index.html          # Main HTML structure and UI layout
├── style.css           # All styles (theme, layout, components)
├── app.js              # Core application logic (state, persistence, rendering)
├── locales/            # Internationalization (i18n) translation files
│   ├── en.js          # English (default)
│   ├── hi.js          # Hindi
│   ├── ta.js          # Tamil
│   ├── ml.js          # Malayalam
│   ├── te.js          # Telugu
│   └── kn.js          # Kannada
└── README.md          # User-facing documentation
```

## Architecture Overview

### Data Model

**Thought Object Structure:**
```javascript
{
  id: Number,              // Timestamp-based unique ID
  content: String,         // User's thought text
  rootCauses: Array,       // Array of strings: Needs, Habits, Environmental conditions,
                          //         Others impositions, Heredity, Divinity, Unknown
                          // Note: Old data may still use rootCause: String (backward compatible)
  classification: String,  // One of: Good, Harmful, Unsure
  score: Number,          // Upvote/downvote counter for recurring thoughts
  timestamp: String,      // ISO 8601 datetime string
  comments: Array         // Optional: Array of comment objects
}
```

**Comment Object Structure:**
```javascript
{
  id: Number,              // Timestamp-based unique ID
  text: String,           // Comment text
  timestamp: String       // ISO 8601 datetime string
}
```

**State Management:**
```javascript
// Global state variables (app.js:29-33)
let thoughts = [];           // Array of thought objects
let editingId = null;       // ID of thought being edited (null = create mode)
let currentFontSize = 100;  // Font size percentage (70-150)
let currentLanguage = 'en'; // Current locale code
```

**Storage Keys:**
```javascript
STORAGE_KEY = 'introspection_thoughts'        // Thought data
'introspection_privacy' = 'true'|'false'     // Privacy mode state
'introspection_sort' = 'newest'|'oldest'|'votes'  // Sort preference
'introspection_fontsize' = Number            // Font size %
'introspection_language' = 'en'|'hi'|'ta'... // Language code
```

### File Responsibilities

#### 1. index.html (UI Structure)
**Key Sections:**
- **Header** (lines 21-53): Title, font controls, privacy toggle, settings button
- **Settings Panel** (lines 56-130): Hidden by default, contains:
  - Language selector
  - Export data (JSON to clipboard)
  - Import data (paste JSON)
  - Danger Zone (delete all data)
- **Main Dashboard** (lines 132-261): Two-column grid
  - **Left Column** (lines 134-231):
    - Thought input form (textarea, root cause dropdown, nature radio buttons)
    - Analytics panel (treemap for root causes, bar chart for nature)
  - **Right Column** (lines 234-260):
    - Search bar
    - Sort dropdown (newest/oldest/recurring)
    - Thoughts list (dynamically rendered)
- **Footer** (lines 263-280): Attribution, privacy disclaimer, backup reminder

**i18n Implementation:**
- Uses `data-i18n` attributes for text content (e.g., `data-i18n="app_title"`)
- Uses `data-i18n-placeholder` for input placeholders
- JavaScript applies translations on language change (app.js:131-145)

#### 2. style.css (Design System)
**CSS Variables (lines 1-33):**
```css
--bg-color: #F8F9FA          /* Light gray background */
--text-main: #101828          /* Dark slate text */
--text-muted: #475467         /* Muted slate */
--primary-color: #E63522      /* Confident red/orange */
--success-text: #027A48       /* Green for "Good" thoughts */
--danger-text: #B42318        /* Red for "Harmful" thoughts */
--surface-color: #FFFFFF      /* White cards */
--surface-border: #EAECF0     /* Subtle borders */
```

**Key Layout Classes:**
- `.main-grid` (lines 117-123): Two-column grid (400px left, 1fr right)
- `.glass-panel` (lines 126-135): Card styling with shadows and borders
- `.thought-item` (lines 422-436): Individual thought entry in list
- `.treemap-container` (lines 560-567): 250px height container for treemap visualization
- `.radio-group` (lines 201-210): Segmented control for nature selection

**Privacy Mode** (lines 96-114):
- `.privacy-mode .thought-content`: Applies blur(6px) filter
- `.revealed` class: Removes blur on click (click-to-reveal)

**Responsive Design** (lines 620-655):
- Breakpoint: 850px
- Mobile: Switches to single column, reorders history panel first

#### 3. app.js (Application Logic)

**Initialization Flow** (lines 36-116):
1. `DOMContentLoaded` event fires
2. Load thoughts from LocalStorage → `loadThoughts()` (lines 227-237)
3. Restore settings (privacy, sort, font size, language)
4. Attach event listeners (form, filters, buttons)
5. Render UI → `renderApp()` (lines 362-379)

**Key Functions:**

| Function | Location | Purpose |
|----------|----------|---------|
| `loadThoughts()` | 228-237 | Parse thoughts from LocalStorage |
| `saveThoughts()` | 241-243 | Write thoughts to LocalStorage + re-render |
| `renderApp()` | 363-379 | Main render coordinator (calls renderList + renderStats) |
| `renderList()` | 402-490 | Renders filtered/sorted thought list |
| `renderStats()` | 546-565 | Renders treemap + bar chart analytics |
| `renderTreemap()` | 569-674 | Binary space partitioning treemap algorithm |
| `renderBarChart()` | 678-717 | Horizontal bar chart with percentages |
| `editThought(id)` | 298-318 | Populates form for editing existing thought |
| `deleteThought(id)` | 721-723 | Removes thought from array |
| `updateScore(id, delta)` | 727-732 | Increments/decrements vote count |
| `togglePrivacy()` | 383-398 | Toggles blur effect on thought content |
| `changeFontSize(delta)` | 211-218 | Adjusts root font size (70-150%) |
| `changeLanguage(lang)` | 124-128 | Switches UI language |
| `openSettings()` | 148-153 | Shows settings panel, hides dashboard |
| `closeSettings()` | 156-161 | Shows dashboard, hides settings panel |
| `copyDataToClipboard()` | 164-170 | Copies JSON to clipboard |
| `importData()` | 173-188 | Parses and validates imported JSON |

**Event Delegation** (lines 494-542):
- Single click listener on `thoughtsList` container
- Uses `dataset.action` attributes to route: edit, upvote, downvote, delete
- Delete requires double-click confirmation (lines 519-541)

**Form Submission Flow** (lines 247-294):
1. Prevent default form submission
2. Extract values (content, rootCause, nature)
3. If `editingId` exists → update existing thought
4. Else → create new thought with `Date.now()` ID
5. Call `saveThoughts()` → triggers re-render
6. Reset form + show temporary success message

**Treemap Algorithm** (lines 569-674):
- **Algorithm:** Recursive binary space partitioning
- **Layout Logic:**
  - Sort entries by count (descending)
  - Split items into two groups with roughly equal weight
  - If container is wider than tall → split horizontally
  - If taller than wide → split vertically
  - Recursively layout each half
- **Color Scheme:** HSL monochromatic (hue 215, lightness 15-50%)
- **Interaction:** Click to filter thoughts list by root cause

**Search & Filter** (lines 406-420):
- Filters by content, rootCause, or classification
- Case-insensitive substring matching
- Updates in real-time on input

**Sort Modes** (lines 414-419):
- `newest`: Descending by ID (timestamp)
- `oldest`: Ascending by ID
- `votes`: Descending by score

#### 4. locales/*.js (Internationalization)

**Structure:**
```javascript
window.translations = window.translations || {};
translations.{locale} = {
  "key": "Translated Value"
};
```

**Key Translation Keys:**
- Form labels: `label_content`, `label_root_cause`, `label_nature`
- Root causes: `option_needs`, `option_habits`, `option_environment`, etc.
- Nature: `nature_good`, `nature_harmful`, `nature_unsure`
- Messages: `msg_saved`, `msg_updated`, `msg_import_success`
- Errors: `err_invalid_format`, `err_invalid_json`

**Application:**
- `applyLanguage(lang)` (lines 131-145) updates all `[data-i18n]` elements
- `t(key)` helper (lines 119-121) retrieves translation for current language

## Key Features Implementation

### 1. Privacy Mode
**Files:** app.js:383-398, style.css:96-114
**How it works:**
- Button toggles `.privacy-mode` class on `<body>`
- CSS applies `filter: blur(6px)` to `.thought-content`
- Click on blurred thought adds `.revealed` class → removes blur
- State persists in `localStorage.introspection_privacy`
- Eye icon changes (open ↔ closed/slashed)

### 2. Recurring Thoughts (Vote System)
**Files:** app.js:727-732, app.js:512-516
**How it works:**
- Each thought has a `score` property (default 0)
- Upvote (+1) / Downvote (-1) buttons modify score
- Sort by "Recurring" shows highest scores first
- Vote controls styled as compact pill (style.css:498-525)

### 3. Analytics Visualizations
**Treemap (Root Cause):**
- Binary space partitioning algorithm (app.js:569-674)
- Larger tiles = more frequent root cause
- Click tile → filters thought list

**Bar Chart (Nature):**
- Horizontal bars with animated width (app.js:678-717)
- Color-coded: Green (Good), Red (Harmful), Amber (Unsure)
- Click bar → filters thought list

### 4. Export/Import
**Export (app.js:164-170):**
- Serializes `thoughts` array to JSON
- Auto-populates textarea when settings panel opens
- Copy to clipboard with navigator.clipboard API

**Import (app.js:173-188):**
- Validates JSON format (must be array)
- Replaces entire `thoughts` array
- Shows alert on success/error

### 5. Font Size Adjustment
**Files:** app.js:211-225
**How it works:**
- A+/A- buttons adjust `currentFontSize` (70-150%)
- Sets `document.documentElement.style.fontSize`
- Persists in `localStorage.introspection_fontsize`

### 6. Multi-language Support
**Files:** app.js:119-145, locales/*.js
**How it works:**
- Translation dictionaries loaded in global `window.translations`
- `changeLanguage(lang)` updates `currentLanguage`
- `applyLanguage(lang)` queries DOM for `[data-i18n]` and `[data-i18n-placeholder]`
- Replaces textContent/placeholder with translated values
- Calls `renderApp()` to re-render dynamic content (charts, list)

### 7. Introspection Modal (Deep Analysis)
**Files:** index.html:301-431, app.js:742-963, style.css:799-1270
**Purpose:** Provides detailed view and editing of individual thoughts with comments

**Features:**
- **Thought Display**: Shows thought content and metadata (created date)
- **Multi-Select Root Causes**: Compact checkbox pills for selecting multiple root causes
- **Nature & Recurrence Inline**: Single-line layout with nature radio buttons and vote controls
- **Comments System**: Add timestamped reflective comments to thoughts
- **Edit & Save**: Modify root causes, nature, and recurrence score

**UI Components:**
- Compact checkbox group (`.checkbox-group-compact`): Inline pills with flexbox wrap
- Inline nature radios (`.radio-card-inline`): Three options in single row
- Compact vote controls (`.vote-btn-inline`): Smaller 28px buttons
- Secondary button style (`.btn-secondary`): Used for "Add Comment" vs primary "Save Changes"

**Keyboard Shortcuts:**
- `Esc` key: Close modal (priority: modal > settings > toggle privacy)

**Data Structure:**
- Comments stored in `thought.comments` array
- Each comment has `id`, `text`, and `timestamp`
- Backward compatible with thoughts that don't have comments

### 8. Multi-Select Root Causes
**Files:** index.html:143-176, app.js:246-305
**How it works:**
- Changed from `<select>` dropdown to checkbox group
- Data model: `rootCauses` array instead of `rootCause` string
- Backward compatibility: Checks for both formats when rendering
- Validation: At least one root cause must be selected
- Analytics: Each thought can contribute to multiple categories in treemap

### 9. Keyboard Shortcuts
**Files:** app.js:856-872
**Escape Key Behavior:**
1. If introspection modal is open → close modal
2. Else if settings panel is open → close settings
3. Otherwise → toggle privacy mode

### 10. Icon System
**Good Nature Icon:** Smiley face (😊) instead of star
**Introspect Icon:** Circular icon with 20px size, subtle gray background (rgba(71, 84, 103, 0.08))
- Hovers to primary orange/red color
- Positioned in top-right with date and action buttons

## Data Flow Diagrams

### Creating a New Thought
```
User fills form → Submit event
  ↓
app.js:247 (form submit handler)
  ↓
Extract values:
  - content (textarea)
  - rootCauses (all checked checkboxes → array)
  - classification (selected radio button)
  ↓
Validate: at least one root cause selected
  ↓
Create thought object: {
  id: Date.now(),
  content,
  rootCauses: [...],
  classification,
  score: 0,
  timestamp: new Date().toISOString()
}
  ↓
thoughts.unshift(newThought)  // Add to beginning
  ↓
saveThoughts() → localStorage.setItem('introspection_thoughts', JSON.stringify(thoughts))
  ↓
renderApp() → renderList() + renderStats()
  ↓
DOM updated with new thought at top of list
```

### Editing an Existing Thought
```
User clicks edit icon (🖊️)
  ↓
editThought(id) called (app.js:298)
  ↓
Populate form fields with thought data
  ↓
Set editingId = id, change button to "Update Thought"
  ↓
User modifies form → Submit
  ↓
app.js:254 (update branch)
  ↓
Find thought by id, replace properties (keep original timestamp)
  ↓
saveThoughts() + renderApp()
  ↓
DOM updated, editingId reset to null
```

### Filtering Thoughts
```
User types in search bar OR clicks treemap/bar chart
  ↓
searchInput.value updated (directly or via onclick handler)
  ↓
renderList() called (app.js:402)
  ↓
Filter thoughts array: content/rootCause/classification includes query
  ↓
Sort filtered array (newest/oldest/votes)
  ↓
Render filtered results to DOM
  ↓
If no results: show "No thoughts found" message
```

### Privacy Mode Toggle
```
User clicks eye icon
  ↓
togglePrivacy() (app.js:383)
  ↓
document.body.classList.toggle('privacy-mode')
  ↓
CSS applies blur(6px) to all .thought-content
  ↓
localStorage.setItem('introspection_privacy', isPrivate)
  ↓
Change eye icon (open ↔ slashed)
  ↓
User clicks blurred thought → .revealed class added → blur removed
```

## UI Component Reference

### Thought Input Form (index.html:137-207)
**Fields:**
1. **Textarea** (#thoughtContent): Multi-line thought description
2. **Select** (#rootCause): Dropdown with 7 root cause options
3. **Radio Group** (name="nature"): 3 segmented buttons (Good/Harmful/Unsure)
4. **Submit Button**: "Log Thought" (changes to "Update Thought" in edit mode)

**Validation:**
- All fields are `required`
- No custom validation logic (relies on HTML5)

### Thought List Item (app.js:463-488)
**Structure:**
```html
<div class="thought-item {classification}">
  <div class="thought-meta">
    <span class="thought-cause-tag">{rootCause}</span>
    <div>{date} Edit🖊️ Delete🗑️</div>
  </div>
  <div class="thought-content">{content}</div>
  <div class="thought-actions">
    <div>{icon} {classification}</div>
    <div class="vote-controls">▲ {score} ▼</div>
  </div>
</div>
```

**Icons:**
- Good: Star (⭐)
- Harmful: Alert circle (⚠️)
- Unsure: Question mark circle (❓)

### Settings Panel (index.html:56-130)
**Sections:**
1. **Language**: Dropdown selector (6 languages)
2. **Export Data**: Readonly textarea + Copy button
3. **Import Data**: Editable textarea + Import button
4. **Danger Zone**:
   - Text input (must type "DELETE")
   - Button disabled until correct text entered
   - Deletes all data permanently

## Styling Conventions

### Color Semantics
- **Primary (Orange/Red):** Call-to-action buttons, brand color
- **Success (Green):** "Good" thoughts, positive actions
- **Danger (Red):** "Harmful" thoughts, destructive actions
- **Muted (Slate):** Secondary text, icons, borders

### Typography
- **Font:** 'Outfit' (Google Fonts) - modern, geometric
- **Heading Sizes:**
  - h1: 1.75rem, weight 700
  - h2/h3: 0.9rem, uppercase, weight 700
- **Body:** 0.95rem for thought content

### Spacing
- Card padding: 1.5rem
- Form group margin: 1.25rem
- Grid gap: 1.5rem
- Input padding: 0.75rem

### Border Radius
- `--radius-sm`: 4px (inputs, buttons)
- `--radius-md`: 8px (search bar, pills)
- `--radius-lg`: 12px (cards, tags)

## Common Development Patterns

### Adding a New Root Cause Option
1. **index.html:** Add `<option>` to #rootCause select (line ~150)
2. **locales/*.js:** Add translation key for new option
3. **No JavaScript changes needed** (dynamic rendering)

### Adding a New Translation Language
1. Create `locales/xx.js` (where xx = language code)
2. Copy structure from `locales/en.js`
3. Translate all values
4. Add `<script src="locales/xx.js">` to index.html
5. Add `<option value="xx">` to language select in index.html
6. Set `window.translations.xx = { ... }` in new file

### Modifying the Thought Data Model
1. Update object creation in form submit handler (app.js:271-278)
2. Modify rendering logic in `renderList()` (app.js:442-489)

## Recent UI Improvements (2026)

### Space-Optimized Introspection Modal
**Goal:** Reduce vertical space while maintaining functionality

**Changes Made:**
1. **Compact Root Cause Checkboxes**
   - Changed from 2-column grid cards to inline flexbox pills
   - Smaller padding (0.35rem vs 0.5rem)
   - Font size reduced to 0.85rem
   - Wraps naturally on smaller screens

2. **Single-Line Nature & Recurrence**
   - Combined two sections into one horizontal row
   - Nature radios displayed inline (flex layout)
   - Vote buttons reduced from 36px to 28px
   - Labels positioned inline instead of above

3. **Reduced Spacing**
   - Section margins: 1.5rem → 1rem
   - Label margins: 0.75rem → 0.5rem
   - Label font: 0.85rem → 0.75rem
   - Comment textarea: 3 rows → 2 rows

4. **Button Hierarchy**
   - Primary button (`.btn-primary`): Red background for "Save Changes"
   - Secondary button (`.btn-secondary`): Gray border for "Add Comment"
   - Clear visual priority for main action

### Icon Updates
**Good Nature Icon:**
- Changed from star SVG to smiley face emoji icon
- Updated in: main form, modal, and thought list rendering
- SVG paths: Circle face + smile curve + two eye dots

**Introspect Button:**
- Increased from 14px to 20px icon size
- Added circular background: rgba(71, 84, 103, 0.08)
- Hover effect: Changes to primary color rgba(230, 53, 34, 0.1)
- Tooltip: "Introspect"
- Positioned top-right with date and action buttons

### CSS Architecture
**Compact Modal Styles:**
```css
.checkbox-group-compact       /* Inline pills wrapper */
.checkbox-item-compact        /* Individual checkbox pill */
.radio-group-inline           /* Horizontal radio container */
.radio-card-inline            /* Individual radio button */
.vote-controls-inline         /* Smaller vote buttons */
.nature-recurrence-row        /* Flexbox row container */
.btn-secondary                /* Secondary action button */
```

**Responsive Behavior:**
- Modal maintains compact layout on mobile
- Nature and recurrence stack on very small screens (handled by flexbox)
3. Update export/import validation if needed (app.js:173-188)
4. Consider migration for existing localStorage data

### Adding a New UI Theme/Dark Mode
1. Duplicate CSS variables in `:root` (style.css:1-33)
2. Create `body.dark-mode` selector with overrides
3. Add toggle button in header (similar to privacy toggle)
4. Implement `toggleDarkMode()` function in app.js
5. Persist in localStorage ('introspection_theme')

## Security & Privacy Considerations

### XSS Prevention
- **HTML Escaping:** `escapeHtml()` function (app.js:736-739)
  - Used when rendering user content: `escapeHtml(thought.content)`
  - Creates temporary div, sets textContent, returns innerHTML
  - Prevents script injection in thought text

### Data Privacy
- **No Network Requests:** Entire app runs offline
- **LocalStorage Only:** Data never leaves browser
- **No Analytics:** No tracking scripts included
- **Export Warning:** Footer warns users to manage backups

### Input Validation
- **HTML5 Validation:** Required attributes on form fields
- **JSON Import:** Try/catch with type checking (app.js:176-187)
- **Delete Confirmation:** Double-click pattern + text confirmation

## Performance Considerations

### Rendering Optimization
- **Event Delegation:** Single listener on thoughtsList instead of per-item
- **No Re-renders on Input:** Search filters list, doesn't re-render charts
- **Localized Updates:** Vote buttons call saveThoughts() which re-renders entire list
  - **Potential Improvement:** Update only score display without full re-render

### Data Limits
- **LocalStorage Quota:** ~5-10MB depending on browser
- **No Pagination:** All thoughts rendered at once
  - **Potential Issue:** Performance degrades with 1000+ thoughts
  - **Suggested Fix:** Virtual scrolling or pagination

### CSS Performance
- **Minimal Reflows:** Uses transforms for animations where possible
- **GPU Acceleration:** filter: blur() is GPU-accelerated
- **No Heavy Shadows:** Subtle box-shadows only

## Browser Compatibility

**Minimum Requirements:**
- ES6 support (let/const, arrow functions, template literals)
- LocalStorage API
- CSS Grid & Flexbox
- Navigator.clipboard API (for export)
- CSS filter: blur() (for privacy mode)

**Tested On:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Debugging Tips

### Common Issues

**1. Thoughts Not Saving:**
- Check browser console for LocalStorage errors
- Verify quota not exceeded (check DevTools → Application → Storage)
- Check incognito mode restrictions

**2. Language Not Switching:**
- Verify translation file is loaded (check `window.translations.{code}`)
- Check `data-i18n` attributes match translation keys
- Ensure `applyLanguage()` and `renderApp()` are called

**3. Charts Not Rendering:**
- Check `thoughts` array is not empty
- Verify counts are calculated correctly in `renderStats()`
- Check for JavaScript errors in console

**4. Privacy Mode Not Working:**
- Verify `.privacy-mode` class is added to `<body>`
- Check CSS filter is applied (DevTools → Elements → Styles)
- Ensure `localStorage.introspection_privacy` is 'true'

### Development Tools

**LocalStorage Inspector:**
```javascript
// In browser console:
localStorage.getItem('introspection_thoughts')
JSON.parse(localStorage.getItem('introspection_thoughts'))
```

**Reset All Data:**
```javascript
localStorage.removeItem('introspection_thoughts')
localStorage.removeItem('introspection_privacy')
localStorage.removeItem('introspection_sort')
localStorage.removeItem('introspection_fontsize')
localStorage.removeItem('introspection_language')
location.reload()
```

**Test Import/Export:**
```javascript
// Export
const data = JSON.stringify(thoughts)
// Import
thoughts = JSON.parse(data)
saveThoughts()
```

## Extension Ideas

### Easy Additions (No Architecture Changes)
1. **Tags/Categories:** Add optional tags field to thought model
2. **Date Range Filter:** Add date pickers to filter by timestamp
3. **Thought Count Badge:** Display total thought count in header
4. **Keyboard Shortcuts:** Add hotkeys for common actions (new thought, search)
5. **Dark Mode:** Add theme toggle with CSS variable overrides

### Medium Complexity
1. **Thought Streaks:** Track consecutive days of logging thoughts
2. **Reminders:** Browser notifications to log thoughts (Notification API)
3. **Rich Text Formatting:** Allow bold/italic in thought content
4. **Thought Connections:** Link related thoughts together
5. **Custom Root Causes:** Allow users to add their own categories

### Advanced Features
1. **Cloud Sync:** Optional server backend for multi-device sync
2. **Offline PWA:** Service worker for full offline capability
3. **Data Visualization:** Add timeline view, trend graphs
4. **Export Formats:** PDF, CSV, Markdown export options
5. **AI Integration:** Sentiment analysis or thought clustering

## Testing Strategy

### Manual Testing Checklist
- [ ] Create thought with all root cause options
- [ ] Create thought with all nature classifications
- [ ] Edit existing thought
- [ ] Delete thought (test double-click confirmation)
- [ ] Upvote/downvote thought
- [ ] Search thoughts (test partial matches)
- [ ] Sort by newest/oldest/recurring
- [ ] Toggle privacy mode + click to reveal
- [ ] Adjust font size (test limits: 70% and 150%)
- [ ] Change language (test all 6 locales)
- [ ] Export data (verify JSON format)
- [ ] Import data (test valid and invalid JSON)
- [ ] Delete all data (test "DELETE" confirmation)
- [ ] Test mobile responsive layout (< 850px)
- [ ] Test with 0, 1, 100+ thoughts
- [ ] Verify LocalStorage persistence (refresh page)

### Automated Testing (Future)
- Unit tests for utility functions (escapeHtml, sorting, filtering)
- Integration tests for form submission flow
- E2E tests for complete user journeys

## File Line Count Reference

| File | Lines | Purpose |
|------|-------|---------|
| index.html | 293 | HTML structure |
| style.css | 705 | All styles |
| app.js | 741 | Application logic |
| locales/en.js | 86 | English translations |
| locales/hi.js | ~86 | Hindi translations |
| locales/ta.js | ~86 | Tamil translations |
| locales/ml.js | ~86 | Malayalam translations |
| locales/te.js | ~86 | Telugu translations |
| locales/kn.js | ~86 | Kannada translations |

**Total LOC:** ~2,300 lines

## Critical Code Locations

| Functionality | File:Line |
|---------------|-----------|
| Data model definition | app.js:271-278 |
| LocalStorage save | app.js:242 |
| LocalStorage load | app.js:229-237 |
| Main render function | app.js:363-379 |
| Form submission | app.js:247-294 |
| Edit thought | app.js:298-318 |
| Delete thought | app.js:721-723 |
| Vote system | app.js:727-732 |
| Search/filter | app.js:406-420 |
| Treemap algorithm | app.js:579-674 |
| Privacy toggle | app.js:383-398 |
| Language change | app.js:124-145 |
| Export data | app.js:164-170 |
| Import data | app.js:173-188 |
| Font size control | app.js:211-225 |
| CSS variables | style.css:1-33 |
| Privacy mode styles | style.css:96-114 |
| Responsive breakpoint | style.css:620-655 |
| i18n text replacement | app.js:135-144 |

## Glossary

- **Root Cause:** The origin category of a thought (Needs, Habits, Environment, etc.)
- **Nature/Classification:** The quality of a thought (Good, Harmful, Unsure)
- **Score:** The vote count indicating how often a thought recurs
- **Privacy Mode:** Feature that blurs thought content for public viewing
- **Treemap:** Binary space partitioning visualization for root cause distribution
- **LocalStorage:** Browser-based key-value storage (5-10MB limit)
- **i18n:** Internationalization - supporting multiple languages
- **Glass Panel:** Card component with subtle shadows and borders

## Vethathiri Maharishi's Framework Context

The app is based on the introspection methodology taught by Vethathiri Maharishi, which categorizes thoughts by their origin:

1. **Needs:** Fundamental physical and psychological requirements
2. **Habits:** Learned behavioral patterns
3. **Environmental conditions:** External circumstances and influences
4. **Others impositions:** Social pressures and expectations
5. **Heredity:** Genetic and ancestral influences
6. **Divinity:** Spiritual or transcendent sources
7. **Unknown:** Origins yet to be identified

The practice involves:
- Observing thoughts as they arise
- Categorizing them by origin
- Classifying them as beneficial (Good), detrimental (Harmful), or unclear (Unsure)
- Tracking recurring patterns (via the vote system)
- Analyzing patterns through the visualization dashboard

The goal is to develop self-awareness and mental clarity through systematic thought examination.

---

**Last Updated:** 2026-01-01
**Codebase Version:** As of commit b02836e
**For Questions:** Review README.md or inspect source code at https://github.com/and/introspect
