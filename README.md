# Gewee: The Mission-Oriented AI Browser Agent 🚀

**Gewee** is a context-aware Chrome Extension powered by **Gemini 3 Flash**. It transforms the browser from a passive window into an active collaborator that observes, reasons, and acts on your behalf.

## 🧠 Core Agentic Pillars

### 1. Adaptive Persona System
Gewee autonomously shifts its "mission" based on the website you are visiting:
- **🎓 Tutor Mode:** Active on technical documentation (Wikipedia, Hugging Face). Highlighting complex terms and providing instant "Explain This" layers.
- **✨ Muse Mode:** Active on creative platforms (LinkedIn, Facebook). Drafting contextually perfect social posts and replies.
- **🛡️ Guardian Mode:** Hard-locked on login pages. Focuses on data masking and identifying "Dark Pattern" manipulative UI.

### 2. Spatially Aware UI
- **Non-Destructive Drafting:** Our "Secretary" tool uses a collision-detection algorithm to ensure draft buttons never overlap website labels.
- **Zero-Reflow Intelligence:** Optimized DOM extraction using `textContent` ensures 60fps performance even on heavy pages.

### 3. Efficiency & Privacy
- **Token-Pruning:** Implements a strict character limit and "Standby Mode" to minimize API costs and cognitive noise.
- **Domain Blacklisting:** Automatically enters "Ghost Mode" on sensitive sites to ensure user privacy and avoid AI inception loops.

## 🛠️ Tech Stack
- **AI:** Gemini 3 Flash (Contextual Reasoning & Semantic Extraction)
- **Frontend:** JavaScript (ES6+), Shadow DOM (UI Isolation)
- **Architecture:** Chrome Extension Manifest V3

## 🚀 Getting Started
1. Clone the repo.
2. Add your Gemini API Key to `config.js`.
3. Load the folder as an "Unpacked Extension" in Chrome.
4. Visit any technical documentation to see the **Tutor Mode** in action!
