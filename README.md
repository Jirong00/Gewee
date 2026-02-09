# Gewee: The Mission-Oriented AI Browser Agent 🚀

**Gewee** is a context-aware Chrome Extension powered by **Gemini 3 Flash**. It transforms the browser from a passive window into an active collaborator that observes, reasons, and acts on your behalf.

## 🧠 Core Agentic Pillars

### 1. Adaptive Persona System
Gewee autonomously shifts its "mission" based on the website you are visiting:
- **🎓 Tutor Mode:** Active on technical documentation (Wikipedia, Hugging Face). Highlights complex terms and provides instant "Explain This" layers.
- **✨ Muse Mode:** Active on creative platforms (LinkedIn, Facebook). Drafts contextually perfect social posts and replies.
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
1. **Clone the repo:** `git clone https://github.com/Jirong00/Gewee.git`
2. **Load the extension:** Navigate to `chrome://extensions/`, enable "Developer Mode", and select "Load unpacked" for the project folder.
3. **Configure API:** Right-click the Gewee icon > Options to securely save your Gemini 3 API key.
4. **Visit technical docs:** See **Tutor Mode** highlight terms and offer instant explanations on sites like Wikipedia.
5. **Verify Secretary Mode:** Navigate to LinkedIn/YouTube. Click a comment box to see the context-aware "Draft Response" button appear.
6. **Verify Guardian Mode:** Visit the GitHub Sign-in page. Observe the mascot pulsing **Blue**, signaling active security and masking logic.
7. **Test Efficiency:** Open a blank tab. The mascot will fade to 50% opacity (**Standby Mode**), proving no tokens are being wasted.
8. **Explore the Notebook:** Open the extension dashboard to review your saved insights and technical term captures.

## 📖 Project Vision
Gewee was designed to solve the "Passive Assistant" problem. Instead of a sidebar you have to talk to, Gewee lives in the DOM, proactively sensing what you need before you ask. By combining Gemini 3’s reasoning with a spatially-aware UI, we’ve built an agent that doesn't just talk about the web—it helps you operate it.

---
Built for the **Gemini 3 Hackathon 2026**.
