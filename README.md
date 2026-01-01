# Introspection - Thought Analysis Tool

A privacy-focused, minimalist web application for practicing the introspection framework taught by Vethathiri Maharishi. This tool provides a structured space to systematically examine your thoughts, trace them to their root causes, and cultivate mental clarity through guided self-reflection.

## ✨ Key Features

### 🧠 Thought Tracking
- **Log Thoughts**: Capture what's on your mind instantly.
- **Root Cause Analysis**: Categorize thoughts by origin (e.g., Habits, Needs, Environment, Heredity).
- **Nature Classification**: Classify thoughts as **Good**, **Harmful**, or **Unsure**.
- **Recurring Thoughts**: Upvote/Downvote thoughts to track how often they recur.

### 📊 Interactive Analytics
- **Treemap Visualization**: Visualize your mental landscape. The "Root Cause" section uses a dynamic **Treemap** where larger tiles represent more frequent underlying causes.
- **Nature Distribution**: See the balance of your thoughts (Positive vs. Negative) at a glance.
- **Interactive Filtering**: Click any bar or tile in the analytics section to instantly filter your thought history.

### 🛡️ Privacy & Focus
- **Local Storage**: All data lives **100% in your browser**. No data is ever sent to a server.
- **Privacy Toggle (Eye Icon)**: Instantly blur all thought content for privacy when in public spaces.
- **Click-to-Reveal**: In privacy mode, click any blurred thought to temporarily reveal it.

### 🌐 Internationalization (i18n)
- **Multi-language Support**: Fully localized in **English, Hindi, Tamil, Malayalam, Telugu, and Kannada**.
- **Instant Switching**: Change languages instantly from the settings panel without reloading.

### 💾 Data Management
- **Export & Backup**: Export your entire thought history as a JSON code to back it up or transfer it.
- **Import/Restore**: Easily restore your data by pasting your backup code.
- **Privacy First**: The "Export backups regularly" feature ensures you stay in control of your data since there is no cloud storage.

### ♿ Accessibility & Customization
- **Font Size Controls**: Adjust the text size (A+/A-) for comfortable reading.
- **Persistent Settings**: The app remembers your language, privacy mode, sort preference, and font size settings.
- **Minimal Aesthetic**: A "Databricks-inspired" clean design with a curated Slate scale color palette.

## 🚀 Getting Started

You can use the application directly in your browser:

👉 **[Launch App](https://and.github.io/introspect)**

### Running Locally
No installation required. This is a standalone client-side application.

1.  **Download** or Clone the repository.
2.  **Open** `index.html` in any modern web browser.
3.  **Start Logging**: Your data will be saved automatically to your browser's Local Storage.

## 🛠️ Tech Stack

- **HTML5**: Semantic structure.
- **CSS3**: Vanilla CSS with CSS Variables for theming and Flexbox/Grid for layout. No external frameworks.
- **JavaScript (ES6+)**: Vanilla JS for logic, state management, and DOM manipulation.

## 📂 Project Structure

```
introspection_tools/
├── index.html      # Main application structure
├── style.css       # All styles (Theme, Layout, Components)
└── app.js          # Application logic (State, Persistence, Rendering)
```

## 🎨 Design System

- **Font**: 'Outfit' (Google Fonts) for a modern, clean look.
- **Colors**:
    - **Primary**: Confident Red/Orange (`#E63522`)
    - **Text**: Dark Slate (`#101828`) & Muted Slate (`#475467`)
    - **Nature**: Green (Good), Red (Harmful), Amber (Unsure)
- **Visuals**: Glass-morphism cards, subtle shadows, and single-color SVG icons.

---
*Created for the "Analysis of Thought" project.*
