# Gewee 🧬
**The AI-Powered Browser Companion**

> Built for the Google Chrome Built-in AI Challenge 2025.
> Powered by **Gemini 1.5 Flash**.

Gewee is not just another chatbot. It's an **intelligent, context-aware sidekick** that lives in your browser. It observes your browsing session (when you allow it), understands the context, and proactively offers help—whether it's deep diving into research, drafting replies, or fact-checking content.

![Banner](assets/promo_banner.png)

## 🌟 Key Features

### 1. 🧠 Context-Aware Mascot
Gewee sits quietly in the corner of your screen. Using **Gemini 1.5**, it analyzes the page content and your actions to determine its "Persona":
- **🛡️ Guardian**: Detects forms and sensitive inputs, offering to mask your data.
- **✨ Muse**: Detects creative fields (social media, blogs) and offers drafting assistance.
- **🎓 Tutor**: Detects educational content and offers to simplify or quiz you.

### 2. 🔐 Privacy First (BYOK)
We believe in privacy and security. Gewee uses a **Bring Your Own Key** architecture.
- Your Gemini API Key is stored **locally** in your browser (`chrome.storage.local`).
- It is **never** sent to our servers.
- You can remove it instantly with a single click in the Dashboard.

### 3. 🚀 Smart Dashboard
Ideally integrated into your browser flow, the Dashboard is your command center:
- **Notebook**: Auto-saves your insights and Gemini's responses.
- **Deep Linking**: Seamlessly jump back to the exact tab where an idea was generated.
- **Settings**: Manage your API Key and Trigger Modes (`Active` vs `Chill`).

## 🛠️ Installation & Setup

1. **Download source code**
   Clone this repo or download the ZIP.

2. **Load into Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right).
   - Click **"Load unpacked"**.
   - Select the folder containing `manifest.json`.

3. **Add Your Brain 🧠**
   - Click the **Gewee Extension Icon** or the mascot.
   - You will be prompted: *"I need a brain!"*
   - Click the alert bubble to open the **Dashboard**.
   - Paste your **Gemini API Key** in the Settings card.
   - Click **Save**.

## 💻 Tech Stack
- **Frontend**: Vanilla JS (Lightweight, High Performance), HTML5, CSS3.
- **AI Model**: Google Gemini 1.5 Flash (via API).
- **Architecture**: Chrome Extension MV3 (Service Worker, Content Scripts, Shadow DOM).

## 🏆 Hackathon Notes
- **Manifest V3**: Fully compliant.
- **Permissions**: Uses `activeTab` and `scripting` strictly for requested analysis.
- **Safety**: Includes safety filter handling and network error resilience.

---
*Crafted with ❤️ for the future of browsing.*
