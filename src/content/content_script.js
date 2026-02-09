// content_script.js

// 1. Create the Shadow DOM host
const host = document.createElement('div');
host.id = 'screen-observer-host';
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: 'open' });

// 2. Inject Styles (Merged from styles.css and overlay.css)
const style = document.createElement('style');
style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :host {
        position: fixed;
        bottom: 0px;
        right: 0px;
        top: 0px;
        left: 0px;
        z-index: 2147483647;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        color: #1f1f1f;
        width: 100%;
        height: 100%;
        pointer-events: none; /* CLICK THROUGH */
    }

    /* Pulse Animation for Guardian Persona */
    @keyframes guardianPulse {
        0% { box-shadow: 0 0 0 0 rgba(77, 150, 255, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(77, 150, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(77, 150, 255, 0); }
    }
    
    .guardian-pulse {
        animation: guardianPulse 2s infinite;
        border-radius: 50%; /* Ensure round pulse */
    }

    /* Navigator Glow */
    .gewee-navigator-glow {
        box-shadow: 0 0 20px 8px rgba(77, 150, 255, 0.8) !important;
        transition: box-shadow 0.5s ease;
        z-index: 2000;
        position: relative;
    }

    /* Skill Widgets (Buttons overlaid on page) */
    .gewee-skill-widget {
        pointer-events: auto;
        position: absolute;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-weight: 600;
        transition: transform 0.2s, opacity 0.2s;
        z-index: 1000;
        cursor: pointer;
    }
    .gewee-skill-widget:hover {
        transform: scale(1.05);
    }
    .secretary-btn {
        background: #8B5CF6; /* Purple */
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
    }
    
    /* REMOVED: .top-docked styles (No longer needed) */

    /* Common Reset */
    * { box-sizing: border-box; }

    /* --- Mascot Container --- */
    /* Skill Engine Styles */
    .nav-btn-link {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 6px 10px;
        border-radius: 8px;
        text-align: left;
        cursor: pointer;
        transition: 0.2s;
        font-size: 12px;
    }
    .nav-btn-link:hover {
        background: rgba(255,255,255,0.2);
        transform: translateX(2px);
    }
    
    .skill-btn {
        border-color: #4D96FF !important;
        background: #f0f7ff !important;
    }
    .skill-btn:hover {
        background: #e0efff !important;
    }

    .mascot-wrapper {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 120px;
        height: 120px;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: auto;
        cursor: grab;
        transition: opacity 0.5s ease; /* Smooth fade */
    }
    
    .mascot-wrapper.ghost-mode {
        opacity: 0.5;
        filter: grayscale(80%); /* Extra ghost vibe */
    }
    
    .mascot-wrapper.ghost-mode:hover {
        opacity: 1; /* Reveal on hover */
        filter: none;
    }
        transition: transform 0.2s;
        /* No margin needed for absolute positioning */
    }
    
    .mascot-wrapper:active {
        cursor: grabbing;
    }
    
    .mascot-wrapper:hover #gemini-head path {
        filter: brightness(1.1);
    }
    
    /* Apply events only to the visual shapes */
    svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
        pointer-events: none; /* Pass through SVG canvas */
        position: relative;
        z-index: 100; /* FRONT of bubble */
    }

    path, ellipse {
        pointer-events: none; /* Wrapper handles events now */
    }

    /* Grabbing state */
    .mascot-wrapper.dragging {
        cursor: grabbing;
    }

    /* Click Animation */
    @keyframes click-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(0.9); }
        100% { transform: scale(1); }
    }
    .click-pulse #full-mascot {
        animation: click-pulse 0.15s ease-out;
    }

    /* Bubbles - Polished & Responsive */
    .bubble {
        position: absolute;
        top: 50%; /* Center vertically relative to mascot */
        right: 100%; /* Left of mascot */
        bottom: auto; /* Reset */
        margin-right: -10px; /* Slight overlap with wrapper space */
        transform: translateY(-50%); 
        
        /* Glassmorphism */
        background: rgba(30, 30, 30, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        
        /* Layout & Text */
        padding: 14px 18px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15); /* Softer, deeper shadow */
        font-size: 13px;
        line-height: 1.5;
        color: #fff;
        
        /* Responsive Width */
        width: clamp(280px, 40vw, 450px);
        white-space: normal;
        word-wrap: break-word;
        
        opacity: 0;
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        z-index: 90; /* Behind Star */
    }
    .bubble.show { opacity: 1; transform: translateY(-50%) translateX(-10px); }
    
    /* Loading Animation */
    @keyframes loading-dots {
      0% { content: '.'; }
      33% { content: '..'; }
      66% { content: '...'; }
    }
    
    .loading-dots::after {
      content: '.';
      animation: loading-dots 1.5s steps(1, end) infinite;
      display: inline-block;
      width: 1em; /* Prevent layout shift */
      text-align: left;
    }

    /* Arrow pointing RIGHT (to mascot) */
    .bubble::after { 
        content: '';
        position: absolute;
        top: 50%;
        right: -10px; /* Stick to right edge */
        left: auto;
        margin-top: -6px;
        border-width: 6px;
        border-style: solid;
        border-color: transparent transparent transparent rgba(30, 30, 30, 0.85);
        transform: translateY(-50%); /* Verify alignment */
    }

    /* Mobile Responsiveness ($width < 600px) */
    @media (max-width: 600px) {
        .bubble {
            /* Reposition to avoid covering mascot in vertical view */
            width: clamp(250px, 95vw, 400px); /* WIDER: Uses 95% of screen width */
            position: fixed; /* Escape the wrapper context */
            top: auto;
            bottom: 140px; /* Above 120px mascot */
            right: 20px;
            left: auto;
            margin-right: 0;
            transform: translateY(0);
        }
        .bubble.show { transform: translateY(0); }
        
        /* Move Arrow to Bottom Right */
        .bubble::after {
            top: 100%; /* Bottom */
            right: 20px;
            left: auto;
            margin-top: 0;
            border-color: rgba(30, 30, 30, 0.85) transparent transparent transparent; /* Point Down */
            transform: none;
        }
    }

    /* --- Status Panel (Floating Drawer) --- */
    .status-panel {
        position: absolute;
        bottom: 140px; /* Initial position above mascot (120px + 20px gap) */
        right: 20px;
        width: 320px; /* Wider than host */
        
        min-height: 200px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
        
        /* TRANSITION LOGIC */
        opacity: 0; 
        transform: translateX(50px);
        transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        pointer-events: none;
        
        /* Floating Glass Style */
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 10px;
        margin-bottom: 20px; /* Space above mascot */
    }

    .status-panel.visible {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px; /* Reduced padding slightly for pill shape */
        /* Rainbow Bar Style */
        background: linear-gradient(90deg, #4285F4 0%, #EA4335 30%, #FBBC05 60%, #34A853 100%);
        border-radius: 20px; /* Rounded pill look */
        color: white;
        margin: 6px; /* Add margin so it looks like a floating bar */
        box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }
    .brand-text {
        display: flex;
        align-items: center;
        gap: 8px; 
        
        font-weight: 800;
        font-size: 16px;
        letter-spacing: 0.5px;
        
        /* White Text on Rainbow BG */
        color: white;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
    }

    /* Thinking Animation */
    #header-loader {
        display: none;
        margin-left: 2px;
        font-weight: 800;
    }
    #header-loader.active {
        display: inline-block;
    }
    #header-loader::after {
        content: '.';
        animation: dots 1.5s steps(3, end) infinite;
    }
    @keyframes dots {
        0%, 20% { content: '.'; }
        40% { content: '..'; }
        60%, 100% { content: '...'; }
    }

    h3 {
        margin: 0;

        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #666;
        font-weight: 700;
    }

    /* Trash Button */
    /* Trash Button */
    #clear-history-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        opacity: 0.9;
        transition: 0.2s;
        margin-left: 4px;
    }
    #clear-history-btn:hover {
        background: rgba(255, 255, 255, 0.4);
        opacity: 1;
        transform: scale(1.1);
    }



    /* History List */
    #history-list {
        flex: 1;
        overflow-y: auto;
        padding: 0 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        
        /* Scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgba(0,0,0,0.2) transparent;
    }

    #history-list::-webkit-scrollbar { width: 6px; }
    #history-list::-webkit-scrollbar-thumb {
        background-color: rgba(0,0,0,0.2);
        border-radius: 10px;
    }

    /* History Card */
    .history-card {
        background: rgba(255, 255, 255, 0.95); /* More opaque */
        border-radius: 10px;
        padding: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05); /* Stronger shadow */
        border: 1px solid rgba(0,0,0,0.05);
        font-size: 13px;
        position: relative;
        transition: transform 0.2s;
    }
    .history-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
    }
    
    /* Gradient Stripe */
    .history-card::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 4px;
        background: linear-gradient(180deg, #4D96FF, #FF6B6B);
        border-top-left-radius: 10px;
        border-bottom-left-radius: 10px;
    }

    .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .history-time {
        font-size: 11px;
        color: #888;
        font-weight: 500;
    }

    /* Nav Button (Jump) */
    .nav-btn {
        border: none;
        background: #4D96FF; /* Primary Blue */
        color: #fff;
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        margin-left: auto;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(77, 150, 255, 0.3);
        white-space: nowrap; /* Prevent text wrapping */
        flex-shrink: 0;      /* Prevent deformation */
    }
    .nav-btn:hover {
        background: #2D76FF;
        transform: translateY(-1px);
    }

    .history-content {
        line-height: 1.5;
        color: #333;
        font-weight: 400;
    }

    /* Deep Dive Details */
    details {
        margin-top: 10px;
        font-size: 12px;
        color: #555;
        background: rgba(0,0,0,0.02);
        border-radius: 8px;
        padding: 8px;
        border: 1px solid rgba(0,0,0,0.05);
    }
    summary { 
        cursor: pointer; 
        opacity: 1; 
        font-weight: 600; 
        color: #4D96FF; 
        margin-bottom: 4px;
        list-style: none; /* Hide default arrow */
    }
    summary::-webkit-details-marker {
        display: none;
    }
    summary::after {
        content: " ▼";
        font-size: 10px;
    }
    details[open] summary::after {
        content: " ▲";
    }

    /* Processing Animation */
    .mascot-wrapper.processing svg {
        animation: pulse-scale 0.5s ease-in-out;
    }

    @keyframes pulse-scale {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }

    /* Header Actions */
    .header-actions {
        display: flex;
        gap: 8px;
    }
    
    #open-dashboard-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        opacity: 0.9;
        transition: 0.2s;
        color: white; /* Ensure icon is visible if it's text, though emoji usually ignore this */
    }
    #open-dashboard-btn:hover { 
        background: rgba(255, 255, 255, 0.4);
        opacity: 1; 
        transform: scale(1.1); 
    }

    /* Save Button with Color Picker */
    .save-group {
        position: relative; /* Anchor for absolute dots */
        display: flex;
        align-items: center;
    }
    
    .save-trigger {
        font-size: 10px;
        color: #888;
        cursor: pointer;
        border: 1px solid #eee;
        padding: 2px 8px; /* Slightly wider */
        border-radius: 12px;
        background: #fff;
        transition: 0.2s;
        user-select: none; /* Prevent text selection cursor */
    }
    .save-trigger:hover {
        background: #f0f0f0;
        color: #333;
    }
    
    /* Prevent selection on buttons */
    button, .nav-btn, .color-dot, .gemini-btn, .header-actions button {
        user-select: none;
    }
    
    /* Panel text selection allowed, but not cursor flickering on layout elements */
    .status-panel {
        /* ... existing styles ... */
    }

    /* Stop drag propagation from panel */
    .status-panel, .bubble {
        cursor: default;
    }
    
    .save-dots {
        display: none;
        position: absolute;
        right: 100%; /* Show to left of button */
        top: 50%;
        transform: translateY(-50%);
        gap: 6px;
        margin-right: 2px; /* Closer to button */
        background: rgba(255, 255, 255, 0.9);
        padding: 4px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .save-group:hover .save-dots {
        display: flex;
        animation: fadeInDots 0.2s ease;
    }
    
    @keyframes fadeInDots { from { opacity: 0; transform: translate(10px, -50%); } to { opacity: 1; transform: translate(0, -50%); } }

    .color-dot {
        width: 14px; height: 14px;
        border-radius: 50%;
        cursor: pointer;
        border: 1px solid rgba(0,0,0,0.1);
        transition: 0.2s;
    }
    .color-dot:hover { transform: scale(1.3); }

    /* --- Dispatcher Modal --- */
    #dispatcher-modal {
        position: absolute;
        bottom: 140px; /* Above mascot */
        right: 20px;
        width: 260px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(16px);
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        border: 1px solid rgba(255,255,255,0.5);
        display: flex;
        flex-direction: column;
        gap: 12px;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: 2147483646;
    }
    
    #dispatcher-modal.visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
    }

    #dispatcher-title {
        font-size: 12px;
        font-weight: 700;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-align: center;
        margin-bottom: 4px;
    }

    .mode-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    .mode-btn {
        background: #fff;
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        transition: 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    
    .mode-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.08);
        border-color: #4D96FF;
    }

    .mode-icon { font-size: 20px; display: flex; align-items: center; justify-content: center; }
    .mode-icon img { width: 24px; height: 24px; object-fit: contain; }
    .mode-label { font-size: 11px; font-weight: 600; color: #444; }

    /* Mascot Gaze Animations */
    .mascot-wrapper.looking-up { 
        /* Reduced movement to keep star stable */
        transform: rotate(-5deg) translateY(-1px); 
    }
    .mascot-wrapper.looking-left { transform: rotate(10deg) translateX(-2px); }

    /* Ask Gemini Button on Card */
    .ask-gemini-btn {
        background: linear-gradient(135deg, #4D96FF, #6BCB77);
        border: none;
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        margin-left: 6px;
        box-shadow: 0 2px 5px rgba(77, 150, 255, 0.3);
        transition: 0.2s;
        white-space: nowrap; /* Prevent wrapping */
        flex-shrink: 0;      /* Prevent shrinking */
    }
    .ask-gemini-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(77, 150, 255, 0.4);
    }
    }

`;
shadow.appendChild(style);

// 3. HTML Structure
const htmlContent = `
    <div class="mascot-wrapper">
        <div class="bubble" id="speech-bubble">Zzz...</div>
        <svg id="mascot-svg" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="gemini-vibrant" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FF6B6B" />
                    <stop offset="30%" style="stop-color:#FFD93D" />
                    <stop offset="60%" style="stop-color:#6BCB77" />
                    <stop offset="100%" style="stop-color:#4D96FF" />
                </linearGradient>
            </defs>
            <ellipse id="mascot-shadow" cx="100" cy="220" rx="30" ry="8" fill="rgba(0,0,0,0.1)">
                <animate attributeName="rx" values="30;22;30" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.1;0.04;0.1" dur="3s" repeatCount="indefinite" />
            </ellipse>
            <g id="full-mascot">
                <g id="gemini-head" transform="translate(0, 45)">
                    <animateTransform attributeName="transform" type="translate" values="50 15; 50 10; 50 15" dur="3s" repeatCount="indefinite" additive="sum"/>
                    <path d="M50 0 L65 35 L100 50 L65 65 L50 100 L35 65 L0 50 L35 35 Z" fill="url(#gemini-vibrant)" />
                </g>
            </g>
        </svg>
    </div>

    <div class="status-panel" id="status-panel">
        <div class="panel-header">
            <div class="brand-text">Gewee<span id="header-loader"></span></div>
            <div class="header-actions">
                <button id="open-dashboard-btn" title="Open Dashboard">✨</button>
                <button id="clear-history-btn" title="Clear History">🗑️</button>
            </div>
        </div>
        <!-- status-text removed -->
        <div id="history-list">
            <!-- History Cards Injected Here -->
        </div>
    </div>
    </div>
    
    <div id="dispatcher-modal">
        <div id="dispatcher-title">Ask Gemini</div>
        <div class="mode-grid">
            <button class="mode-btn" data-mode="research">
                <span class="mode-icon"><img src="${chrome.runtime.getURL('assets/media/DeepResearch.png')}" alt="Research"></span>
                <span class="mode-label">Deep Research</span>
            </button>
            <button class="mode-btn" data-mode="factcheck">
                <span class="mode-icon"><img src="${chrome.runtime.getURL('assets/media/FactCheck.png')}" alt="Fact Check"></span>
                <span class="mode-label">Fact Check</span>
            </button>
            <button class="mode-btn" data-mode="visualize">
                <span class="mode-icon"><img src="${chrome.runtime.getURL('assets/media/Visualize.png')}" alt="Visualize"></span>
                <span class="mode-label">Visualize</span>
            </button>
            <button class="mode-btn" data-mode="creative">
                <span class="mode-icon"><img src="${chrome.runtime.getURL('assets/media/Creative.png')}" alt="Creative"></span>
                <span class="mode-label">Creative</span>
            </button>
        </div>
    </div>

`;

const container = document.createElement('div');
container.style.width = '100%';
container.style.height = '100%';
container.style.display = 'flex';
container.style.flexDirection = 'column';
container.style.pointerEvents = 'none'; // Ensure clicks pass through empty space
container.innerHTML = htmlContent;
shadow.appendChild(container);

// 4. Element References
// Element References
const statusPanel = shadow.getElementById('status-panel');
const headerLoader = shadow.getElementById('header-loader'); // New loader ref
const historyList = shadow.getElementById('history-list');
const clearBtn = shadow.getElementById('clear-history-btn');
const speechBubble = shadow.getElementById('speech-bubble');
const mascotHead = shadow.getElementById('gemini-head');
const mascotSvg = shadow.getElementById('mascot-svg');
const mascotWrapper = shadow.querySelector('.mascot-wrapper');
const dispatcherModal = shadow.getElementById('dispatcher-modal');
const modeBtns = shadow.querySelectorAll('.mode-btn');
let currentActiveCardData = null;

// --- Dispatcher Logic ---
// --- Dispatcher Logic (Event Delegation) ---
// dispatcherModal.style.pointerEvents = "auto"; // REMOVED: Caused "Ghost Click" issue. CSS handles this via .visible class.

dispatcherModal.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;

    e.stopPropagation(); // Stop bubbling
    console.log("Gewee: Dispatcher Button Clicked via Delegation!");

    const mode = btn.dataset.mode;

    // Visual Feedback
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => btn.style.transform = 'scale(1)', 100);

    // Responsive Fallback Data
    let activeData = currentActiveCardData;
    if (!activeData) {
        console.warn("Gewee Dispatcher: No active card data. Constructing fallback.");
        activeData = {
            tabTitle: document.title,
            text: "User requested analysis on current page.",
            detail: window.location.href, // Use URL as context
            generatedPrompts: window.latestGeminiAnalysis || {} // Try global cache
        };
    }

    if (activeData) {
        // FEEDBACK: Localized & Dynamic
        const userLang = chrome.i18n.getUILanguage();
        const msg = chrome.i18n.getMessage("mascot_architecting", [mode.toUpperCase(), userLang]);
        const finalMsg = msg || `Architecting your ${mode} plan in ${userLang}... 🧠`;

        // Show loading state immediately
        showBubble(`${finalMsg}<span class="loading-dots"></span>`);

        console.log(`Gewee: Sending TRIGGER_DISPATCH for [${mode}]`);

        // EXECUTE IMMEDIATELY
        chrome.runtime.sendMessage({
            type: 'TRIGGER_DISPATCH',
            payload: {
                mode: mode,
                data: activeData
            }
        });
    }

    // Close after delay
    setTimeout(() => {
        closeDispatcher();
    }, 1500);
});

function openDispatcher(cardData) {
    currentActiveCardData = cardData;
    dispatcherModal.classList.add('visible');
    mascotWrapper.classList.add('looking-up'); // Look at modal

    // Dynamic Skill Injection
    const modeGrid = dispatcherModal.querySelector('.mode-grid');
    // Clear existing static buttons if we have dynamic skills or persona specific logic
    // Actually, let's just prepend.

    // Remove old skill buttons if any
    const oldSkills = modeGrid.querySelectorAll('.skill-btn');
    oldSkills.forEach(btn => btn.remove());

    // 1. Vault Guard (Guardian Mode Explicit)
    if (cardData.persona === 'GUARDIAN') {
        const btn = document.createElement('button');
        btn.className = 'mode-btn skill-btn';
        btn.dataset.mode = 'SKILL';
        btn.dataset.skill = 'VAULT_GUARD';
        btn.innerHTML = `
            <span class="mode-icon" style="font-size: 20px;">🛡️</span>
            <span class="mode-label">Mask My Info</span>
        `;
        modeGrid.prepend(btn);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSkillAction('VAULT_GUARD', {});
            closeDispatcher();
        });
    }

    // 2. Gemini Returned Skills
    if (cardData.skills && cardData.skills.length > 0) {
        cardData.skills.forEach(skill => {
            // Avoid duplicate Vault Guard if already added by persona check
            if (skill.name === 'VAULT_GUARD' && cardData.persona === 'GUARDIAN') return;

            const btn = document.createElement('button');
            btn.className = 'mode-btn skill-btn';
            btn.dataset.mode = 'SKILL'; // Generic mode handler
            btn.dataset.skill = skill.name;
            btn.dataset.skillData = JSON.stringify(skill.data || {});

            // Map icons/names
            let iconStr = '⚡';
            let labelStr = skill.name;

            if (skill.name === 'NAVIGATOR') { iconStr = '🧭'; labelStr = 'Jump Links'; }
            if (skill.name === 'VAULT_GUARD') { iconStr = '🛡️'; labelStr = 'Mask Info'; }
            if (skill.name === 'SECRETARY') { iconStr = '✍️'; labelStr = 'Draft Reply'; }

            btn.innerHTML = `
                <span class="mode-icon" style="font-size: 20px;">${iconStr}</span>
                <span class="mode-label">${labelStr}</span>
            `;

            // Prepend to grid (after Vault Guard if present)
            modeGrid.prepend(btn);

            // Attach specific listener (since generic listener expects data-mode)
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleSkillAction(skill.name, skill.data);
                closeDispatcher();
            });
        });
    }
}

function closeDispatcher() {
    dispatcherModal.classList.remove('visible');
    mascotWrapper.classList.remove('looking-up');
    currentActiveCardData = null;
}

// --- Skill Engine Logic ---

function handleSkillAction(skillName, skillData) {
    console.log(`Gewee: Executing Skill [${skillName}]`, skillData);

    if (skillName === 'NAVIGATOR') {
        const points = skillData.jump_points || [];
        const singleTarget = skillData.target_section;

        // Mode A: Multiple Points (Table of Contents)
        if (points.length > 0) {
            let linksHtml = '<div style="display:flex; flex-direction:column; gap:8px;">';
            points.forEach((pt, idx) => {
                linksHtml += `<button class="nav-btn-link" data-selector="${pt.selector}">${idx + 1}. ${pt.reason}</button>`;
            });
            linksHtml += '</div>';

            showBubble(`<strong>📍 Navigation:</strong><br>${linksHtml}`);
            setTimeout(() => {
                speechBubble.querySelectorAll('.nav-btn-link').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        scrollToElement(e.target.dataset.selector);
                    });
                });
            }, 100);
        }
        // Mode B: Single Section (Text Match)
        else if (singleTarget) {
            showBubble(`Jump to: "${singleTarget}" 🧭`);
            scrollToText(singleTarget);
        }
        else {
            showBubble("No navigation targets found.");
        }

    } else if (skillName === 'VAULT_GUARD') {
        maskIdentity();
    } else if (skillName === 'SECRETARY') {
        // Secretary usually triggered via focus, but can be manual
        showBubble("Secretary is watching your inputs... 👀");
    }
}

function scrollToElement(selector) {
    try {
        const el = document.querySelector(selector);
        highlightElement(el);
    } catch (e) {
        showBubble("Invalid selector.");
    }
}

function scrollToText(text) {
    // Robust Text Search (Headers first)
    // XPath: Case-insensitive search in H1-H6
    const xpath = `//*[self::h1 or self::h2 or self::h3 or self::h4][contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`;
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const el = result.singleNodeValue;

    if (el) {
        highlightElement(el);
    } else {
        // Fallback: Paragraphs
        const pXpath = `//p[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`;
        const pResult = document.evaluate(pXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const pEl = pResult.singleNodeValue;

        if (pEl) highlightElement(pEl);
        else showBubble(`Couldn't find section: "${text}"`);
    }
}

function highlightElement(el) {
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Apply Glow Class
    el.classList.add('gewee-navigator-glow');

    // Remove after 3s
    setTimeout(() => {
        el.classList.remove('gewee-navigator-glow');
    }, 3000);
}

function maskIdentity() {
    // Basic Mock Implementation
    const inputs = document.querySelectorAll('input[type="email"], input[type="text"]');
    let filled = false;
    inputs.forEach(input => {
        if (input.value === "" && !input.hidden) {
            // New Format: gewee_alias_XXX@user.com
            input.value = `gewee_alias_${Math.floor(Math.random() * 1000)}@user.com`;
            input.style.backgroundColor = "#e8f0fe";
            // Trigger input event for frameworks
            input.dispatchEvent(new Event('input', { bubbles: true }));
            filled = true;
        }
    });

    if (filled) {
        showBubble("Identity Masked 🛡️");
    } else {
        showBubble("No empty fields found to mask.");
    }
}

// Secretary: Input Watcher w/ Floating Action
let secretaryDebounce = null;

document.addEventListener('focusin', (e) => {
    const target = e.target;

    // 1. Semantic Intent Detection
    // Check if element is an input/textarea or contenteditable
    const isEditable = target.isContentEditable ||
        target.tagName === 'TEXTAREA' ||
        (target.tagName === 'INPUT' && target.type === 'text');

    if (!isEditable) return;

    // Security Exclusions
    if (target.type === 'password' || target.type === 'email' || target.type === 'hidden') return;

    // Autocomplete Sensitive Check (login, card, etc.)
    const autocomplete = (target.getAttribute('autocomplete') || '').toLowerCase();
    if (autocomplete.includes('password') || autocomplete.includes('cc-') || autocomplete.includes('card')) return;

    if (target.dataset.geweeIgnore) return;

    // Debounce Logic
    if (secretaryDebounce) clearTimeout(secretaryDebounce);
    secretaryDebounce = setTimeout(() => {
        showSecretayButton(target);
    }, 300);
});

let secretaryBtn = null;
let secretaryTarget = null; // Track current target for position updates

function showSecretayButton(targetInput) {
    if (secretaryBtn) removeSecretaryButton();

    secretaryTarget = targetInput;
    secretaryBtn = document.createElement('button');
    secretaryBtn.id = 'gewee-secretary-btn'; // ID for testing/styling
    secretaryBtn.textContent = "Draft Response ✍️";

    Object.assign(secretaryBtn.style, {
        position: 'absolute',
        zIndex: 2147483647,
        background: '#4D96FF',
        color: 'white',
        border: 'none',
        borderRadius: '20px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        opacity: 0,
        transition: 'opacity 0.2s, top 0.1s, left 0.1s', // Smooth movement
        pointerEvents: 'auto'
    });

    document.body.appendChild(secretaryBtn);
    updateSecretaryPosition(); // Initial Position

    // Fade In
    requestAnimationFrame(() => secretaryBtn.style.opacity = 1);

    // Event Listeners
    secretaryBtn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent blur
        e.stopPropagation();
        draftResponse(targetInput);
        removeSecretaryButton();
    });

    // 2. Dynamic Spatial Positioning Listeners
    // Optimized: Use requestAnimationFrame for 60fps performance
    let ticking = false;
    const onScrollChange = () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateSecretaryPosition();
                ticking = false;
            });
            ticking = true;
        }
    };

    window.addEventListener('scroll', onScrollChange, { passive: true });
    window.addEventListener('resize', onScrollChange, { passive: true });

    // Cleanup on Blur (Delayed to allow click)
    targetInput.addEventListener('blur', () => {
        setTimeout(() => {
            // Check if focus moved to button (not possible due to preventDefault, but for safety)
            removeSecretaryButton();
        }, 200);
    }, { once: true });
}

function updateSecretaryPosition() {
    if (!secretaryBtn || !secretaryTarget) return;

    const rect = secretaryTarget.getBoundingClientRect();

    // Check if element is still visible (not scrolled off screen)
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
        secretaryBtn.style.display = 'none'; // Hide if offscreen
        return;
    } else {
        secretaryBtn.style.display = 'block';
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Logic: Inner Top-Right with 5px padding
    // If rect is small, might need to go outside. For now, inside is requested.
    // "Inner Top-Right" -> Top = rect.top, Right = rect.right.

    // Calculate Top-Right Coordinate
    // top: rect.top + scrollY + 5px
    // right: (window width - rect.right) + 5px? No, left = rect.right + scrollX - btnWidth - 5px

    // Let's use Right alignment logic relative to document
    // left = (rect.right + scrollX) - (secretaryBtn.offsetWidth || 120) - 10;

    // Wait, "Inner Top-Right" means INSIDE the box?
    // "Inject the 'Draft Response' button at the Inner Top-Right of the input with a 5px padding."
    // Yes, inside the input area.

    const btnWidth = secretaryBtn.offsetWidth || 110;
    const btnHeight = secretaryBtn.offsetHeight || 32;

    // Standard: Inner Top-Right (aligned to right edge of input)
    // "rect.right - 80px" as requested, or just align nicely.
    // Let's stick to the visual request: "Inner Top-Right"
    let topPos = rect.top + scrollY + 6;
    let leftPos = (rect.right + scrollX) - btnWidth - 8;

    // COLLISION CHECK: Is top too tight? (Labels or Viewport edge)
    // If input is very close to top of screen (< 50px)
    if (rect.top < 50) {
        // Move to Inner Bottom-Right
        topPos = (rect.bottom + scrollY) - btnHeight - 6;
    }

    // SAFETY: If input height is tiny (< 40px), Bottom-Right forces overlap with text?
    // If small input + top collision -> Move OUTSIDE Right?
    if (rect.height < 40 && rect.top < 50) {
        leftPos = rect.right + scrollX + 5; // Outside right
        topPos = rect.top + scrollY; // Match top
    }

    secretaryBtn.style.top = `${topPos}px`;
    secretaryBtn.style.left = `${leftPos}px`;

    // Label Collision Check (Contextual Awareness)
    if (secretaryTarget.id) {
        const label = document.querySelector(`label[for="${secretaryTarget.id}"]`);
        if (label) {
            const labelRect = label.getBoundingClientRect();
            // Check for overlap
            // If Button Top is "above" Label Bottom (meaning inside or above label)
            // And Button Left is "inside" Label Left/Right

            // Actually, we moved it to "Inner Top-Right".
            // If label is floating (Material Design) it might be INSIDE.
            // If label is standard (Bootstrap), it is ABOVE.

            // Logic: If label is VISIBLE and overlapping, push button down.
            const overlapX = (leftPos < labelRect.right) && ((leftPos + btnWidth) > labelRect.left);
            const overlapY = (topPos < labelRect.bottom) && ((topPos + btnHeight) > labelRect.top);

            if (overlapX && overlapY) {
                // Collision! Push down to avoid covering label
                topPos += 25;
                secretaryBtn.style.top = `${topPos}px`;
            }
        }
    }
}

function removeSecretaryButton() {
    if (secretaryBtn) {
        secretaryBtn.remove();
        secretaryBtn = null;
        secretaryTarget = null;
        window.removeEventListener('scroll', updateSecretaryPosition);
        window.removeEventListener('resize', updateSecretaryPosition);
    }
}

function draftResponse(targetInput) {
    if (!secretaryBtn) return;

    // 1. Loading State
    const originalText = secretaryBtn.textContent;
    secretaryBtn.textContent = "Writing... ✍️";
    secretaryBtn.style.cursor = "wait";

    // 2. Context Extraction (Same as before)
    let contextText = "";
    let gatheredLength = 0;
    let parent = targetInput.parentElement;
    while (parent && gatheredLength < 500 && parent !== document.body) {
        if (parent.innerText) {
            contextText = parent.innerText + "\n" + contextText;
            gatheredLength = contextText.length;
        }
        parent = parent.parentElement;
        if (gatheredLength > 1000) break;
    }
    contextText = contextText.substring(0, 800);

    // 3. Send Message to Background
    chrome.runtime.sendMessage({
        type: 'GENERATE_DRAFT',
        payload: { context: contextText }
    }, (response) => {
        // Handle Response
        if (secretaryBtn) {
            secretaryBtn.textContent = originalText;
            secretaryBtn.style.cursor = "pointer";
        }

        if (response && response.text) {
            injectText(targetInput, response.text);
            showBubble("Draft Inserted! ✨");
        } else {
            showBubble("Failed to generate draft. ⚠️");
        }

        // Remove button after success
        removeSecretaryButton();
    });
}

function injectText(target, text) {
    target.focus();

    // Method 1: execCommand (Best for ContentEditable & preserving undo stack)
    const success = document.execCommand('insertText', false, text);

    // Method 2: Value Setter (For standard inputs if execCommand fails)
    if (!success) {
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const val = target.value || "";

        target.value = val.substring(0, start) + text + val.substring(end);

        // Restore cursor
        target.selectionStart = target.selectionEnd = start + text.length;

        // Method 3: Event Triggering (For React/Angular)
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
    }
}


// Close on outside click (if clicking purely on host background)
host.addEventListener('mousedown', (e) => {
    // Check composed path to see if the click originated from our UI elements
    const path = e.composedPath();
    const clickedInsideUI = path.some(el =>
        el === mascotWrapper || el === statusPanel || el === dispatcherModal
    );

    // Only close if we clicked the host (background) AND not one of our components
    if (e.target === host && !clickedInsideUI) {
        closeDispatcher();
    }
});

// GLOBAL LISTENER: Close dispatcher when clicking entirely outside the extension (on the web page)
document.addEventListener('mousedown', (e) => {
    // Check if the click target is the host or contained within it
    if (host && (e.target === host || host.contains(e.target))) {
        return; // Click is inside the extension, let other listeners handle it
    }

    // Check if modal is visible
    if (dispatcherModal && dispatcherModal.classList.contains('visible')) {
        closeDispatcher();
    }
});

// --- Drag & Drop Implementation (Refactored for Full Screen Host) ---
let isDragging = false;
let dragParams = { startX: 0, startY: 0, initialRight: 0, initialBottom: 0, hasStarted: false };

mascotWrapper.addEventListener('mousedown', (e) => {
    // DO NOT preventDefault() here, it breaks click/dblclick flow!
    if (e.button !== 0) return;

    isDragging = false;
    dragParams.hasStarted = false;
    dragParams.startX = e.clientX;
    dragParams.startY = e.clientY;

    // Get current computed position
    const style = window.getComputedStyle(mascotWrapper);
    dragParams.initialRight = parseFloat(style.right);
    dragParams.initialBottom = parseFloat(style.bottom);

    // Attach windows listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
});

function onMouseMove(e) {
    if (!dragParams.hasStarted) {
        // Threshold check
        const moveX = Math.abs(e.clientX - dragParams.startX);
        const moveY = Math.abs(e.clientY - dragParams.startY);

        if (moveX > 5 || moveY > 5) {
            dragParams.hasStarted = true;
            isDragging = true;
            mascotWrapper.classList.add('dragging');
        } else {
            return;
        }
    }

    if (!isDragging) return;

    e.preventDefault(); // Stop selection while dragging

    const deltaX = e.clientX - dragParams.startX;
    const deltaY = e.clientY - dragParams.startY;

    // Logic: moving mouse LEFT (negative deltaX) should INCREASE 'right' value
    // Logic: moving mouse UP (negative deltaY) should INCREASE 'bottom' value
    const newRight = dragParams.initialRight - deltaX;
    const newBottom = dragParams.initialBottom - deltaY;

    mascotWrapper.style.right = `${newRight}px`;
    mascotWrapper.style.bottom = `${newBottom}px`;

    // Panel Logic? 
    // Since Host is full screen, the Panel needs to be positioned relative to Mascot too?
    // Actually, Panel is currently inside Host. 
    // We should probably rely on CSS anchoring or update panel position if it's absolute.
    // CSS .status-panel defaults to absolute bottom: 140px right: 20px.
    // If we move mascot, we should move panel too OR let panel be child of wrapper?
    // Current HTML: wrapper and panel are siblings.
    // Simple fix: update Panel positions to match mascot's movements?
    // Or simpler: Just update Panel to follow? 
    // Let's create a visual tether.

    statusPanel.style.right = `${newRight}px`;
    statusPanel.style.bottom = `${newBottom + 120 + 20}px`; // 120px mascot + 20px gap

    // Also update Dispatcher Modal position if forcing it
    dispatcherModal.style.right = `${newRight}px`;
    dispatcherModal.style.bottom = `${newBottom + 120 + 20}px`;
}

function onMouseUp(e) {
    isDragging = false;
    dragParams.hasStarted = false;
    mascotWrapper.classList.remove('dragging');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}

// 5. Logic Integration
const agent = new AgentStateMachine(updateUI);

// Initial Position Check
// updatePanelPosition(); // Removed: logic handled by CSS and Drag updates

// --- Event Listeners ---

// Single Click: Toggle Status Panel
// Unified Click Handler (Single vs Double)
let clickTimer = null;
let ignoreNextClick = false; // Flag to prevent click after drag (if needed)

mascotWrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    if (clickTimer) {
        // --- DOUBLE CLICK DETECTED ---
        clearTimeout(clickTimer);
        clickTimer = null;
        console.log("Gewee: Double Click (Reasoning)");

        // Double Click Logic
        // Check for Secure Login Context
        const isLogin = /login|signin|auth|sso|secure/i.test(window.location.href);

        if (isLogin) {
            showBubble("🔒 Secure Audit Triggered...");
            triggerAnalysis('SECURITY_AUDIT');
        } else {
            showBubble("Analysing screen... 🧠");
            triggerAnalysis('STANDARD');
        }

        // Visual Pulse
        const fullMascot = shadow.getElementById('full-mascot');
        if (fullMascot) {
            fullMascot.classList.remove('click-pulse');
            void fullMascot.offsetWidth;
            fullMascot.classList.add('click-pulse');
        }
    } else {
        // --- START SINGLE CLICK TIMER ---
        clickTimer = setTimeout(() => {
            clickTimer = null;
            // --- SINGLE CLICK EXECUTED ---
            console.log("Gewee: Single Click (Toggle)");

            // API Key Check
            chrome.storage.local.get(['geminiApiKey'], (result) => {
                const apiKey = result.geminiApiKey;
                // Also check config if needed, but storage is primary
                if (!apiKey) {
                    showBubble("⚠️ I need a brain! Click here to set API Key.");
                    // Open Settings immediately or let user click bubble?
                    // User said: "if no api saved, ask for api"
                    // Let's open the dashboard settings view to help them
                    setTimeout(() => {
                        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD', payload: { view: 'settings' } });
                    }, 1500);
                } else {
                    toggleStatusPanel();
                }
            });
        }, 220); // 220ms delay (Standard for distinguishing)
    }
});
// Removed separate 'dblclick' listener to avoid race conditions

function toggleStatusPanel() {
    statusPanel.classList.toggle('visible');
    // Force close dispatcher if panel is toggled (open or close) just to be clean, 
    // or specifically when closing.
    if (!statusPanel.classList.contains('visible')) {
        closeDispatcher();
    }
}

function triggerAnalysis(context = 'STANDARD') {
    const msg = context === 'SECURITY_AUDIT' ? "Running Security Audit..." : "Analyzing now...! 🔎";
    showBubble(msg);
    statusPanel.classList.add('visible');

    // Check runtime connection
    if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
            type: 'TRIGGER_REASONING',
            payload: { context }
        });
    } else {
        showBubble("Error: Component Disconnected");
    }
}

// Clear History
clearBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' });
    historyList.innerHTML = ''; // Optimistic clear
});

// History Navigation (Delegation)
historyList.addEventListener('click', (e) => {
    // Ask Gemini Dispatcher
    if (e.target.classList.contains('ask-gemini-btn')) {
        const card = e.target.closest('.history-card');
        const text = decodeURIComponent(card.dataset.rawText || "");
        const detail = decodeURIComponent(card.dataset.rawDetail || "");
        const timestamp = card.querySelector('.history-time').innerText;

        openDispatcher({ text, detail, timestamp });
        return;
    }

    // Nav
    if (e.target.classList.contains('nav-btn')) {
        const destTabId = parseInt(e.target.dataset.tabId);
        chrome.runtime.sendMessage({
            type: 'NAVIGATION_REQUEST',
            payload: { tabId: destTabId }
        });
    }
});

// --- State & History Management ---

let savedNoteTexts = new Set(); // Cache for "Already" check

// Load Saved Notes to populate cache
function loadSavedCache() {
    chrome.storage.local.get('notebook', (data) => {
        const notebook = data.notebook || [];
        savedNoteTexts = new Set(notebook.map(n => n.text.trim()));
    });
}
loadSavedCache();

// Listen for storage changes to update cache
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.notebook) {
        const notebook = changes.notebook.newValue || [];
        savedNoteTexts = new Set(notebook.map(n => n.text.trim()));
        // Optional: Re-render UI to update "Already" buttons?
        // Might be expensive to re-render all. 
        // Let's just update visible buttons?
        // For now, simpler: Just cache it for next render or interaction.
    }
});

// Load History on Init
loadHistory();

// Listen for Background Messages (Status Updates & History)
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ANALYSIS_COMPLETE') {
        const data = message.payload;
        // The history update now comes via HISTORY_UPDATED or we can wait for it.
        // Actually, updateUI shows the bubble/status text immediately.
        updateUI('result', data);
    }
    else if (message.type === 'HISTORY_UPDATED') {
        // Source of Truth update from Background
        const newHistory = message.payload || [];
        // Helper: Diffing logic or just simple re-render for now (optimized later if needed)
        // Since we don't have React, simple append check is easiest.
        // Or duplicate check.
        // Simplest: Clear and Re-render if small list.
        if (newHistory.length === 0) {
            historyList.innerHTML = '';
        } else {
            // For simplicity, just appending new items if count changed.
            // But to be robust against "shifts", let's just re-render all for now (max 50 items).
            // Ideally we diff.
            historyList.innerHTML = '';
            newHistory.forEach(item => renderHistoryCard(item));
            scrollToBottom();
        }
    }
    else if (message.type === 'SCREENSHOT_CAPTURED') {
        // Login Guard Check
        const passwordField = document.querySelector('input[type="password"]');
        const isLoginPage = passwordField || /login|signin|auth/i.test(window.location.href);

        if (isLoginPage) {
            // FORCE GUARDIAN MODE
            updateMascotPersona({
                persona: 'GUARDIAN',
                icon: '🛡️',
                reason: 'Login Detected'
            }, false);

            showBubble("Login Page Detected. Shield Active. 🛡️");
            statusText.textContent = "Secure Mode Active";

            // Abort standard analysis to protect data, 
            // unless we want to run a specific SECURITY_AUDIT here automatically?
            // User said "On login pages... pulse Blue". 
            // We've done that.
            return;
        }

        // Normal flow
        agent.transition('OBSERVE', message.payload.image);
    }
});

// Implementation of loadHistory via Message
async function loadHistory() {
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
        if (response && response.history) {
            const history = response.history;
            historyList.innerHTML = '';
            history.forEach(item => renderHistoryCard(item));
            if (history.length > 0) {
                // statusPanel.classList.add('visible'); // User request: Hidden by default
            }
            scrollToBottom();
        }
    } catch (e) {
        // Extension context invalid or background not ready
        console.warn("Could not load history:", e);
    }
}

function renderHistoryCard(item) {
    const card = document.createElement('div');
    card.className = 'history-card';

    // Store raw data for robust saving
    card.dataset.rawText = encodeURIComponent(item.text || "");

    card.dataset.rawDetail = encodeURIComponent(item.detail || "");
    // Store tabTitle if available (Fix for missing title in context)
    if (item.tabTitle) {
        card.dataset.tabTitle = encodeURIComponent(item.tabTitle);
    }

    const hasDetail = item.detail && item.detail !== item.text;

    // simple Markdown format
    const formatMarkdown = (text) => text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n- (.*)/g, '<br>• $1')
        .replace(/\n/g, '<br>');

    let contentHtml = `<div class="history-content">${item.text}</div>`;
    if (hasDetail) {
        contentHtml += `
            <details>
                <summary>Deep Dive</summary>
                <div class="history-detail">${formatMarkdown(item.detail)}</div>
            </details>
        `;
    }

    const navButtonHtml = item.tabId ?
        `<button class="nav-btn" data-tab-id="${item.tabId}">JUMP ↗</button>` : '';

    // Ask Gemini Button (Localized)
    // Note: Can use chrome.i18n.getMessage or hardcode icon if simplistic
    // For now, keeping English 'Ask Gemini' but wrapping in span if we add i18n later?
    // Actually, user wants it functioning.
    const askGeminiBtn = `<button class="ask-gemini-btn">✨ Ask Gemini</button>`;

    // Save UI
    const isSaved = savedNoteTexts.has(item.text.trim());
    const saveLabel = isSaved ? "Saved!" : "Save";
    const saveClass = isSaved ? "save-trigger saved" : "save-trigger";

    const saveHtml = `
        <div class="save-group">
            <span class="${saveClass}">${saveLabel}</span>
            <div class="save-dots">
                <div class="color-dot" style="background:#FF6B6B" data-color="red" data-id="${item.timestamp}"></div>
                <div class="color-dot" style="background:#4D96FF" data-color="blue" data-id="${item.timestamp}"></div>
                <div class="color-dot" style="background:#6BCB77" data-color="green" data-id="${item.timestamp}"></div>
                <div class="color-dot" style="background:#FFD93D" data-color="yellow" data-id="${item.timestamp}"></div>
            </div>
        </div>
    `;

    card.innerHTML = `
        <div class="history-header">
            <span class="history-time">${item.timestamp}</span>
            <div style="display:flex; gap:8px; align-items:center;">
                ${askGeminiBtn}
                ${saveHtml}
                ${navButtonHtml}
            </div>
        </div>
        ${contentHtml}
    `;

    historyList.appendChild(card);
}

// References needed for new elements? 
// No, delegation works best for dynamic list
historyList.addEventListener('click', (e) => {
    // Ask Gemini Dispatcher
    if (e.target.classList.contains('ask-gemini-btn')) {
        const card = e.target.closest('.history-card');
        const text = decodeURIComponent(card.dataset.rawText || "");

        // Debug
        if (!text) console.warn("Ask Gemini: No text found in history card dataset");

        const detail = decodeURIComponent(card.dataset.rawDetail || "");
        const tabTitle = decodeURIComponent(card.dataset.tabTitle || ""); // Retrieve Title
        const timestamp = card.querySelector('.history-time').innerText;

        // Open Modal
        openDispatcher({ text, detail, tabTitle, timestamp });
        return;
    }

    // Nav
    if (e.target.classList.contains('nav-btn')) {
        const destTabId = parseInt(e.target.dataset.tabId);
        chrome.runtime.sendMessage({
            type: 'NAVIGATION_REQUEST',
            payload: { tabId: destTabId }
        });
    }
    // Save (Color Dot)
    if (e.target.classList.contains('color-dot')) {
        const color = e.target.dataset.color;
        saveCard(e.target.closest('.history-card'), color);

        // Visual Feedback
        e.target.style.transform = 'scale(1.5)';
        setTimeout(() => e.target.style.transform = 'scale(1)', 200);

        // Update Label
        const trigger = e.target.closest('.save-group').querySelector('.save-trigger');
        if (trigger) trigger.innerText = "Saved!";
    }

    // Save (Default / Trigger Text)
    if (e.target.classList.contains('save-trigger')) {
        saveCard(e.target.closest('.history-card'), 'grey');

        // Visual Feedback
        e.target.innerText = "Saved!";
    }
});

function saveCard(card, color) {
    const text = decodeURIComponent(card.dataset.rawText || "");
    const detailText = decodeURIComponent(card.dataset.rawDetail || "");
    const timestamp = card.querySelector('.history-time').innerText;

    const note = {
        id: Date.now().toString(),
        text: text,
        highlight: text.substring(0, 50),
        detail: detailText,
        url: window.location.href,
        timestamp: timestamp,
        color: color
    };

    chrome.runtime.sendMessage({ type: 'SAVE_NOTE', payload: note });
}

// Open Dashboard
const openDashBtn = shadow.getElementById('open-dashboard-btn');
if (openDashBtn) {
    openDashBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Ensure clean event handling
        console.log("Gewee: Dashboard button clicked!");
        showBubble("Opening Dashboard... ✨"); // Visual feedback for user/debugging
        try {
            chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' }, (response) => {
                if (chrome.runtime.lastError) console.warn("Msg Error:", chrome.runtime.lastError);
            });
        } catch (e) {
            console.warn("Context invalid:", e);
        }
    });
} else {
    // Debug: Element not found
    setTimeout(() => {
        if (typeof showBubble === 'function') showBubble("Debug: Dash Btn Missing ⚠️");
    }, 2000);
}


// Helper for scrolling
function scrollToBottom() {
    if (historyList) {
        setTimeout(() => {
            historyList.scrollTop = historyList.scrollHeight;
        }, 50);
    }
}

// UI Updater (Called by AgentStateMachine)
function updateUI(type, data) {
    if (type === 'status') {
        // Only show loader if status implies active work
        if (data.includes('Reasoning') || data.includes('Analyzing') || data.includes('...')) {
            if (headerLoader) headerLoader.classList.add('active');
        }
        showBubble(data);
    }
    else if (type === 'processing') {
        triggerProcessingAnimation();
        if (headerLoader) headerLoader.classList.add('active');
    }
    else if (type === 'result') {
        const highlight = data.highlight || data.activity_analysis;
        if (headerLoader) headerLoader.classList.remove('active'); // Stop loader

        // MISSING KEY HANDLER
        if (data.suggested_action === 'SETUP_KEY') {
            showBubble("🧠 I need a brain! Click here to set API Key.");

            // Make it clickable
            const bubble = shadow.getElementById('speech-bubble');
            if (bubble) {
                bubble.style.cursor = 'pointer';
                bubble.style.pointerEvents = 'auto'; // CRITICAL: Enable clicks
                bubble.style.border = '2px solid #FF6B6B'; // Red alert border

                // Remove potential old listeners by cloning (nuclear option) or just overwriting onclick
                // Overwriting onclick is safe for simple elements
                bubble.onclick = (e) => {
                    e.stopPropagation(); // Stop bubbling
                    console.log("Gewee: Bubble clicked for Setup");
                    chrome.runtime.sendMessage({
                        type: 'OPEN_DASHBOARD',
                        payload: { view: 'settings' }
                    });
                    showBubble("Opening Settings... ⚙️");
                };
            }
        } else {
            showBubble(highlight);
            // Reset
            const bubble = shadow.getElementById('speech-bubble');
            if (bubble) {
                bubble.style.cursor = 'default';
                bubble.style.pointerEvents = 'auto'; // Default is usually auto for bubble text selection or hover
                bubble.style.border = 'none';
                bubble.onclick = null;
            }
        }

        // CRITICAL FIX: Send result to Background for storage & broadcast
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({
                type: 'ANALYSIS_COMPLETE',
                payload: data
            });
        }

        if (data.target_coordinates) {
            lookAt(data.target_coordinates.x, data.target_coordinates.y);
        }

        // Hide only if idle for a long time?
        // User requested floating UI, probably wants it to stay until dismissed or idle.
        // Let's keep it visible if it has content.
    }
}

function showBubble(htmlContent) {
    if (!htmlContent || htmlContent === 'undefined') return; // 🛡️ GUARD: Prevent "undefined"

    speechBubble.innerHTML = htmlContent;
    speechBubble.classList.add('show');
    // Extend timeout if it's long text? 
    // For now, keep simple. Logic to clear uses strict compare, which might fail with HTML, but safe enough.
    const currentContent = speechBubble.innerHTML;
    setTimeout(() => {
        if (speechBubble.innerHTML === currentContent) {
            speechBubble.classList.remove('show');
        }
    }, 4000);
}

// ⚡ DOUBLE CLICK TO WAKE
if (mascotWrapper) {
    mascotWrapper.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        console.log("Gewee: Wake Up triggered!");

        // Visual Wake Up immediately
        mascotWrapper.style.filter = "none";
        mascotWrapper.style.opacity = "1";
        mascotWrapper.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.1)' },
            { transform: 'scale(1)' }
        ], { duration: 300 });

        showBubble("I'm awake! ⚡ Ready to help.");

        // Trigger Fresh Analysis
        chrome.runtime.sendMessage({
            type: 'TRIGGER_ANALYSIS', // Map to correct backend handler if needed, or TRIGGER_REASONING
            payload: { context: 'User manually woke up agent.' }
        });
    });
}
// END WAKE UP logic

// Update Status Text with Animation
// Header Loader State
if (headerLoader) {
    headerLoader.classList.remove('active'); // Start hidden
}

function triggerProcessingAnimation() {
    // Add a class for CSS animation instead of setting inline styles that break SMIL
    mascotWrapper.classList.add('processing');
    setTimeout(() => {
        mascotWrapper.classList.remove('processing');
    }, 1000);
}

// --- Adaptive Triage Handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // --- Analysis / History Updates ---
    if (message.type === 'ANALYSIS_COMPLETE') {
        const data = message.payload;
        console.log("Analysis Received:", data);

        // 1. Update Bubble (Short Desc)
        let isStandby = false;
        if (data.short_desc) {
            // Standby Check
            if (data.short_desc.includes("Standby")) {
                showBubble("Scanning... All clear. 🟢");
                // 👻 Ghost Mode: Fade to 50%
                // Logic moved to updateMascotPersona to avoid override
                isStandby = true;
            } else {
                showBubble(data.short_desc);
                // 🌟 Wake Up logic handled in updateMascotPersona
            }
        }

        // ...

        // 4. Trigger Persona Shift (Visuals)
        if (data.persona) {
            updateMascotPersona({ persona: data.persona, icon: '✨', reason: 'Gemini Analysis' }, false, isStandby);
        }

        // 2. Skill Dispatcher (Gemini 3)
        if (data.active_skill && data.active_skill.name !== 'NONE') {
            handleSkillAction(data.active_skill, data.target_coordinates);
        }

        // 3. Technical Term Highlighting (Tutor Mode)
        if (data.technical_term) {
            scrollToText(data.technical_term, true); // true = add 'Explain This' button
        }

        // 4. Deep Dive Panel (Restored)
        // ... (Rest of logic)
    }
    // ...
});

// --- SKILL ENGINE ---
function handleSkillAction(skill, coords) {
    console.log(`[Skill Engine] Activating ${skill.name}`, skill.args);

    // Remove previous skill widgets if any
    const existingWidgets = shadow.querySelectorAll('.gewee-skill-widget');
    existingWidgets.forEach(w => w.remove());

    switch (skill.name) {
        case 'SECRETARY':
            handleSecretary(skill.args, coords);
            break;
        case 'NAVIGATOR':
            handleNavigator(skill.args);
            break;
        case 'VAULT_GUARD':
            handleVaultGuard(skill.args);
            break;
        default:
            console.log("Unknown skill:", skill.name);
    }
}

// ... handleSecretary ...

function handleNavigator(args) {
    // ⚠️ User Feedback: "I don't need buttons, I want to learn."
    // Suppressing Quick Links UI.
    // Instead, if we have a target section, just scroll to it (Tutor Lite).

    const { target_section, jump_points } = args;

    // 2. Original Logic (Target Section)
    if (!target_section && !jump_points) return;

    // Using unified logic derived from previous implementation:
    if (jump_points && jump_points.length > 0) {
        // ... (Table of Contents logic) ...
        let linksHtml = '<div style="display:flex; flex-direction:column; gap:8px;">';
        jump_points.forEach((pt, idx) => {
            linksHtml += `<button class="nav-btn-link" data-selector="${pt.selector}">${idx + 1}. ${pt.reason}</button>`;
        });
        linksHtml += '</div>';
        showBubble(`<strong>📍 Navigation:</strong><br>${linksHtml}`);

        // Add listeners
        setTimeout(() => {
            const btns = shadow.querySelectorAll('.nav-btn-link');
            btns.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const sel = e.target.dataset.selector;
                    const el = document.querySelector(sel);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                };
            });
        }, 100);

    } else if (target_section) {
        scrollToText(target_section, false);
    }
}

// Updated ScrollToText with "Explain This" feature
function scrollToText(text, addExplainBtn = false) {
    // Robust Text Search (Headers first)
    const xpath = `//*[self::h1 or self::h2 or self::h3 or self::h4 or self::p or self::span or self::code][contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${text.toLowerCase()}')]`;
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const el = result.singleNodeValue;

    if (el) {
        highlightElement(el, addExplainBtn);
    } else {
        if (!addExplainBtn) showBubble(`Couldn't find section: "${text}"`);
    }
}

function highlightElement(el, addExplainBtn) {
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('gewee-navigator-glow');

    // Add "Explain This" Button
    if (addExplainBtn) {
        const rect = el.getBoundingClientRect();
        const btn = document.createElement('div');
        btn.className = 'gewee-skill-widget explain-btn';
        btn.innerText = '❓ Explain This';
        Object.assign(btn.style, {
            position: 'absolute', // Absolute to document?
            // "absolute" in body relies on page scroll. Fixed is safer for viewport.
            position: 'fixed',
            top: `${rect.top - 30}px`,
            left: `${rect.left}px`,
            zIndex: 2147483647,
            background: '#10B981', // Emerald Green
            color: 'white',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.3s ease'
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            // Trigger Explain Analysis
            showBubble("Analysing concept... 🧠");
            chrome.runtime.sendMessage({
                type: 'TRIGGER_REASONING', // or specific type
                payload: { context: `EXPLAIN_TERM: ${el.innerText}` }
            });
            btn.remove();
        };

        // Handle Scroll (Sticky) - Simple removal on scroll or recalculate?
        // Let's just remove it after 10s or when clicked. 
        // Keeping it fixed at initial pos is buggy if user scrolls.
        // Better to append to body and not update pos, or use a short timeout.
        document.body.appendChild(btn);

        setTimeout(() => {
            el.classList.remove('gewee-navigator-glow');
            if (btn.parentNode) btn.remove();
        }, 8000);
    } else {
        setTimeout(() => {
            el.classList.remove('gewee-navigator-glow');
        }, 3000);
    }
}

// 🛡️ VAULT GUARD 2.0 (Focus-Responsive)
// Only shows the mask button when user interacts with a password field
function handleVaultGuard(args) {
    if (window.hasAttachedVaultGuard) return; // Prevent duplicate listeners
    window.hasAttachedVaultGuard = true;

    showBubble("Guardian active & watching inputs... 🛡️");

    let activeShield = null;

    const attachShield = (el) => {
        if (activeShield) activeShield.remove();

        const rect = el.getBoundingClientRect();
        activeShield = document.createElement('div');
        activeShield.className = 'gewee-skill-widget vault-shield';
        activeShield.innerText = '🛡️ Mask';

        Object.assign(activeShield.style, {
            position: 'fixed',
            top: `${rect.top + (rect.height / 2) - 12}px`,
            left: `${rect.right - 60}px`,
            zIndex: 2147483647,
            background: '#2D76FF',
            color: 'white',
            fontSize: '10px',
            padding: '4px 8px',
            borderRadius: '12px',
            cursor: 'pointer',
            opacity: '0.9',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        });

        activeShield.onmousedown = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const randomUser = `user_${Math.floor(Math.random() * 1000)}@gewee-mail.com`;
            el.value = randomUser;
            activeShield.innerText = '✨ Masked';
            activeShield.style.background = '#00C853';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        shadow.appendChild(activeShield);
    };

    document.addEventListener('focusin', (e) => {
        const el = e.target;
        if (el.tagName === 'INPUT' && (el.type === 'password' || el.name.toLowerCase().includes('password'))) {
            attachShield(el);
        }
    });

    document.addEventListener('focusout', (e) => {
        setTimeout(() => { if (activeShield) activeShield.remove(); }, 200);
    });
}

// 🖱️ TEXT SELECTION LISTENER (Explain This)
document.addEventListener('mouseup', (e) => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length < 100 && !shadow.contains(e.target)) {
        const existing = shadow.querySelectorAll('.explain-btn');
        existing.forEach(b => b.remove());

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const btn = document.createElement('div');
        btn.className = 'gewee-skill-widget explain-btn';
        btn.innerHTML = '❓ Explain';

        Object.assign(btn.style, {
            position: 'fixed',
            top: `${rect.top - 35}px`,
            left: `${rect.left + (rect.width / 2) - 30}px`,
            zIndex: 2147483647,
            background: '#1f1f1f',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.2s ease'
        });

        btn.onmousedown = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            showBubble(`Analysing: "${text}"... 🧠`);
            chrome.runtime.sendMessage({
                type: 'TRIGGER_REASONING',
                payload: { context: `Explain this term or concept simply: "${text}"` }
            });
            btn.remove();
        };

        shadow.appendChild(btn);
        setTimeout(() => { if (btn.isConnected) btn.remove(); }, 4000);
    }
});

// 🖱️ RIGHT CLICK -> MODE SWITCH
if (mascotWrapper) {
    mascotWrapper.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const modes = ['COMPANION', 'TUTOR', 'GUARDIAN', 'MUSE'];
        let current = mascotWrapper.dataset.mode || 'COMPANION';
        let idx = modes.indexOf(current);
        let nextMode = modes[(idx + 1) % modes.length];

        mascotWrapper.dataset.mode = nextMode;
        updateMascotPersona({ persona: nextMode }, false, false);
        showBubble(`Switched to <strong>${nextMode}</strong> Mode`);
    });
}

function updateMascotPersona(triage, isCached, isStandby = false) {
    // 1. Normalize Persona (Fixing ReferenceError)
    const rawPersona = triage.persona || 'COMPANION';
    const persona = rawPersona.toUpperCase();

    // 🛡️ Guardian Priority Override
    const passwordField = document.querySelector('input[type="password"]');
    const isLogin = passwordField || /login|signin|auth|sso|secure/i.test(window.location.href);

    // 🌟 VISIBILITY FIX: Always reset opacity before applying standby logic
    mascotWrapper.style.opacity = "1";

    if (isStandby) {
        mascotWrapper.style.filter = "grayscale(100%)";
        mascotWrapper.style.opacity = "0.5";
        return;
    }

    // 🎨 COLOR PALETTE V5.2 - Bleach & Dye (Aggressive)
    // grayscale(1) kills original yellow. sepia(1) adds generic brown base (~45deg).
    if (persona === 'GUARDIAN') {
        // RED (Target 0deg). Base 45deg -> Rotate -45deg.
        mascotWrapper.style.filter = "grayscale(100%) sepia(100%) hue-rotate(-50deg) saturate(600%) brightness(0.9)";
    } else if (persona === 'MUSE') {
        // PURPLE (Target 280deg). Base 45deg -> Rotate +235deg.
        mascotWrapper.style.filter = "grayscale(100%) sepia(100%) hue-rotate(235deg) saturate(500%) brightness(0.9)";
    } else if (persona === 'TUTOR') {
        // BLUE (Target 210deg). Base 45deg -> Rotate +165deg.
        mascotWrapper.style.filter = "grayscale(100%) sepia(100%) hue-rotate(170deg) saturate(500%) brightness(1.1)";
    } else if (persona === 'NAVIGATOR') {
        // GREEN (Target 100deg). Base 45deg -> Rotate +55deg.
        mascotWrapper.style.filter = "grayscale(100%) sepia(100%) hue-rotate(60deg) saturate(400%)";
    } else {
        // Default (Original Yellow/Gold)
        mascotWrapper.style.filter = "none";
    }
}

function showErrorState(msg) {
    console.warn("Gewee Error State:", msg);
    showBubble(`⚠️ ${msg || "Connection Failed"}`);
    // Sad / Error Visuals
    mascotWrapper.style.filter = "grayscale(100%) brightness(0.8) sepia(1) hue-rotate(-50deg) saturate(5)"; // Red/Sad Look

    // Shake Animation
    mascotWrapper.animate([
        { transform: 'translate(0, 0)' },
        { transform: 'translate(-5px, 0)' },
        { transform: 'translate(5px, 0)' },
        { transform: 'translate(0, 0)' }
    ], { duration: 300, iterations: 2 });
}
// MISSING FUNCTION RESTORED
function showBubble(text) {
    const bubble = shadow.getElementById('speech-bubble');
    if (bubble) {
        bubble.innerHTML = text; // Allow HTML for buttons/formatting
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0) scale(1)';

        // Auto-hide after 5s if it's not an important alert
        // But for "Need Key", we might want it persistent?
        // updateUI logic handles persistence by type.

        // Reset animation class for attention pop
        bubble.classList.remove('pop');
        void bubble.offsetWidth; // trigger reflow
        bubble.classList.add('pop');
    }
}


// ... Existing lookAt function ...
function lookAt(x, y) {
    const xPercent = x / 100;
    const yPercent = y / 100;
    // Limit range to avoid 'moving away' too much
    const maxOffset = 10; // Reduced from 20
    const offsetX = (xPercent - 0.5) * 2 * maxOffset;
    const offsetY = (yPercent - 0.5) * 2 * maxOffset;

    const headPath = mascotHead.querySelector('path');
    if (headPath) {
        // headPath.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }
}

// Active Mode Logic
let activeModeListenersAttached = false;
let inputDebounceTimer = null;
let mutationDebounceTimer = null;

function setupActiveModeListeners() {
    if (activeModeListenersAttached) return;

    console.log("Gewee: Attaching Active Mode Listeners...");

    // User Input Listener (Debounced)
    document.addEventListener('input', (e) => {
        if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
        inputDebounceTimer = setTimeout(() => {
            console.log("Gewee Active: Input detected. Triggering analysis...");
            triggerAnalysis('ACTIVE_INPUT');
        }, 3000); // Wait 3s after typing stops
    }, true);

    // Mutation Observer (Debounced)
    const observer = new MutationObserver((mutations) => {
        if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
        mutationDebounceTimer = setTimeout(() => {
            console.log("Gewee Active: DOM Change detected. Triggering analysis...");
            triggerAnalysis('ACTIVE_MUTATION');
        }, 5000); // Less aggressive than input
    });

    observer.observe(document.body, { childList: true, subtree: true });

    activeModeListenersAttached = true;
}

// Initial Mode Check
chrome.storage.local.get('triggerMode', (data) => {
    if (data.triggerMode === 'ACTIVE') {
        setupActiveModeListeners();
    }
});

// React to Settings Change
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'MODE_CHANGED') {
        const newMode = message.payload;
        console.log(`Gewee: Mode changed to ${newMode}`);
        if (newMode === 'ACTIVE') {
            setupActiveModeListeners();
        }
    }
});
