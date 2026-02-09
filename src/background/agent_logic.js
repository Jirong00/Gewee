// agent_logic.js

/**
 * Privacy Guard: Basic regex-based PII redaction/detection.
 * Returns true if safe, false if sensitive info detected.
 */
function privacyGuard(text) {
    // Basic patterns for credit cards and potential passwords
    // Note: This is a heuristic and not a guarantee.
    const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/;
    const passwordRegex = /password\s*[:=]\s*\S+/i;

    if (creditCardRegex.test(text) || passwordRegex.test(text)) {
        console.warn('Privacy Guard: Sensitive information detected. Skipping analysis.');
        return false;
    }
    return true;
}

/**
 * Helper: Get API Key from Storage (with defined Config fallback just in case)
 */
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['geminiApiKey'], (result) => {
            // Priority: Storage > Config (Empty string in Config means forced manual)
            resolve(result.geminiApiKey || (typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : null));
        });
    });
}

/**
 * Gemini API Client
 */
async function callGemini(imageBase64, promptText) {
    // Tier 1 Key Usage - No Rotation Needed
    const selectedKey = await getApiKey();

    if (!selectedKey || selectedKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('Gemini API Key not set.');
        return {
            activity_analysis: "I need a brain! Please set your API Key in the Dashboard.",
            suggested_action: "SETUP_KEY",
            target_coordinates: { x: 50, y: 50 },
            is_stuck: true
        };
    }

    // Dynamic URL Construction (Ported from background.js)
    let baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    let model = 'gemini-3-flash-preview'; // Default safe fallback

    if (typeof CONFIG !== 'undefined') {
        baseUrl = CONFIG.BASE_URL || baseUrl;
        model = CONFIG.MODEL_NAME || model;
    }

    // User Override (Storage)
    const settings = await chrome.storage.local.get(['customModel', 'customEndpoint', 'customBaseUrl']);

    if (settings.customModel) {
        model = settings.customModel;
    }
    if (settings.customBaseUrl) {
        baseUrl = settings.customBaseUrl.replace(/\/$/, "");
    }

    // FORCE OVERRIDE
    let url;
    if (settings.customEndpoint) {
        url = settings.customEndpoint;
    } else {
        url = `${baseUrl}/${model}:generateContent`;
    }

    // Smart Append Key
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}key=${selectedKey}`;

    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = imageBase64.split(',')[1];

    const requestBody = {
        contents: [{
            parts: [
                { text: promptText },
                { inline_data: { mime_type: 'image/jpeg', data: cleanBase64 } }
            ]
        }],
        generationConfig: {
            response_mime_type: "application/json"
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429) {
                console.warn('API Rate Limit (429) Response Body:', errorText);
            } else if (response.status === 503) {
                console.warn('API Model Overloaded (503).');
            } else {
                console.error('API Error Response Body:', errorText);
            }
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        if (!data || !data.candidates || !data.candidates[0]) {
            console.warn('Gemini returned no candidates. Possible Safety Block.', data);

            // Check for safety feedback
            if (data.promptFeedback) {
                return {
                    activity_analysis: "I covered my eyes. (Safety Filter) 🫣",
                    error_log: "Safety Filter Triggered: " + JSON.stringify(data.promptFeedback),
                    suggested_action: "Show something else",
                    target_coordinates: { x: 50, y: 50 },
                    is_stuck: true
                };
            }
            throw new Error('API returned 200 but no candidates.');
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
            throw new Error('API response missing content parts.');
        }

        // Token Usage Logging
        if (data.usageMetadata) {
            console.log(`[Token Usage] Input: ${data.usageMetadata.promptTokenCount}, Output: ${data.usageMetadata.candidatesTokenCount}, Total: ${data.usageMetadata.totalTokenCount}`);
        }

        const textResponse = candidate.content.parts[0].text;
        return JSON.parse(textResponse);

    } catch (error) {
        let errorMsg = error.message;
        let isRefusal = false;

        // Discrete Error Handling
        if (errorMsg.includes('429') || errorMsg.includes('503')) {
            const reason = errorMsg.includes('503') ? "Model Overloaded" : "Rate Limit Hit";
            const waitMatch = errorMsg.match(/retry in ([\d\.]+)s/);
            const waitTime = waitMatch ? Math.ceil(parseFloat(waitMatch[1])) : 30;

            errorMsg = `${reason}. Retry in ${waitTime}s.`;
            isRefusal = true;
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
            errorMsg = "Network Error (Check Connection)";
            isRefusal = true;
        } else {
            console.error('Gemini API Call Failed:', error);
        }

        return {
            activity_analysis: isRefusal ? "Zzz... 😴" : "I'm confused...",
            error_log: errorMsg,
            suggested_action: "Wait",
            target_coordinates: { x: 50, y: 50 },
            is_stuck: true
        };
    }
}

async function listAvailableModels() {
    console.log("Attempting to list available models...");
    const key = (CONFIG.GEMINI_API_KEYS && CONFIG.GEMINI_API_KEYS[0]) || CONFIG.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("--- AVAILABLE GEMINI MODELS ---");
        if (data.models) {
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("No models found or error listing:", data);
        }
        console.log("-------------------------------");
    } catch (e) {
        console.error("Failed to list models:", e);
    }
}

function mockGeminiResponse() {
    return {
        activity_analysis: "User is viewing a blank page or the API key is missing.",
        suggested_action: "Check API Key",
        target_coordinates: { x: 50, y: 50 },
        is_stuck: false
    };
}

/**
 * Agent State Machine
 */
class AgentStateMachine {
    constructor(uiCallback) {
        this.state = 'IDLE'; // IDLE, OBSERVE, REASON, ACT
        this.uiCallback = uiCallback;
        this.lastAnalysis = ""; // For deduplication
    }

    async transition(newState, payload) {
        console.log(`State Transition: ${this.state} -> ${newState}`);
        this.state = newState;

        switch (this.state) {
            case 'OBSERVE':
                await this.handleObserve(payload);
                break;
            case 'REASON':
                await this.handleReason(payload);
                break;
            case 'ACT':
                this.handleAct(payload);
                break;
            case 'IDLE':
                break;
        }
    }

    async handleObserve(screenshotUrl) {
        // 1. Privacy Check (on OCR text if we had it, or just blind trust for now)
        // In a real app, we might run local OCR first. 
        // For this hackathon, we'll assume visual inspection by Gemini is the "Reasoning" phase,
        // but we can check metadata or URL if available.

        this.uiCallback('status', 'Observing screen...');

        // Move to Reason
        await this.transition('REASON', screenshotUrl);
    }

    async handleReason(screenshotUrl) {
        this.uiCallback('status', 'Reasoning (Gemini)...');
        this.uiCallback('processing', true); // Trigger animation

        // 1. Capture Hybrid Context (Visual + DOM)
        const domContext = this.extractDomContext();
        const contextBundle = {
            url: window.location.href,
            title: document.title,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            domTree: domContext
        };

        const prompt = `
      **System Directive: High-Efficiency Browser Agent (Gemini 3)**
      You are **Gewee**, a 'Direct Value' browser companion. 
      **Output Constraint**: keep 'short_desc' under 150 characters. NO FLUFF.
      If you have nothing specific to add, return "Standby" in 'short_desc'.

      **Mode Logic:**
      
      1. **TUTOR (Technical Sites: Wikipedia, StackOverflow, HuggingFace)**
         - **Goal**: Explain complexity.
         - **Action**: Identify the FIRST complex term or code block users might struggle with.
         - **Output**: Return 'technical_term' (string) to highlight it.
         - **Persona**: **TUTOR** (Green).

      2. **NAVIGATOR (GitHub, Docs)**
         - **Goal**: Shortcut friction.
         - **Action**: Offer "Quick Shortcuts" (e.g. "Go to PRs", "View Search", "Read Guide").
         - **Output**: Return 'shortcuts' array in 'active_skill.args'.
         - **Persona**: **TUTOR** (Green).

      3. **GUARDIAN (Login, Payments, Sensitive)**
         - **Goal**: Security ONLY.
         - **Action**: Mask inputs or warn of phishing. DO NOT offer generic summaries.
         - **Persona**: **GUARDIAN** (Blue).

      4. **MUSE (Social, Email, Writing)**
         - **Goal**: Assist creativity.
         - **Action**: Draft content.
         - **Persona**: **MUSE** (Purple).

      **Output Schema (JSON Only):**
      {
        "persona": "MUSE" | "TUTOR" | "GUARDIAN" | "COMPANION",
        "short_desc": "string (Max 150 chars. E.g. 'Defined Recursive DFS' or 'Standby')",
        "technical_term": "string (The exact text to highlight for Tutor mode, or null)",
        "active_skill": {
            "name": "SECRETARY" | "NAVIGATOR" | "VAULT_GUARD" | "NONE",
            "args": {
                // NAVIGATOR:
                "shortcuts": [ {"label": "string", "selector": "css_selector" or "url"} ],
                
                // SECRETARY:
                "draft_text": "string",
                "target_id": "string",
                
                // VAULT_GUARD:
                "field_type": "email" | "password"
            }
        },
        "target_coordinates": { "x": int, "y": int }
      }

      **Input Context:**
      ${JSON.stringify(contextBundle).substring(0, 15000)}
    `;

        try {
            const result = await callGemini(screenshotUrl, prompt);
            this.uiCallback('processing', false);
            await this.transition('ACT', result);
        } catch (error) {
            console.error("Agent Logic Error:", error);
            this.uiCallback('processing', false);
            this.uiCallback('status', 'Error: ' + error.message);
        }
    }

    // Helper: Extract Interactive DOM Tree with Coordinates
    extractDomContext() {
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'DETAILS', 'SUMMARY'];
        const informativeTags = ['H1', 'H2', 'H3', 'P', 'SPAN', 'DIV', 'PRE', 'CODE']; // Added PRE/CODE
        const ignoreTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH']; // Performance Filter

        const tree = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
            acceptNode: (node) => {
                if (ignoreTags.includes(node.tagName)) return NodeFilter.FILTER_REJECT;

                const rect = node.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return NodeFilter.FILTER_REJECT; // Hidden

                // Filter relevant elements
                if (interactiveTags.includes(node.tagName)) return NodeFilter.FILTER_ACCEPT;

                // Zero-Reflow Check: Use textContent (raw text) instead of innerText (styled text)
                if (informativeTags.includes(node.tagName) && node.textContent.trim().length > 0) return NodeFilter.FILTER_ACCEPT;

                return NodeFilter.FILTER_SKIP;
            }
        });


        while (walker.nextNode()) {
            const node = walker.currentNode;
            const rect = node.getBoundingClientRect();

            // Normalize Coordinates
            const xPercent = Math.round((rect.left + rect.width / 2) / window.innerWidth * 100);
            const yPercent = Math.round((rect.top + rect.height / 2) / window.innerHeight * 100);

            tree.push({
                tag: node.tagName,
                id: node.id || '',
                text: (node.textContent || node.value || '').substring(0, 50).trim().replace(/\s+/g, ' '), // Normalize whitespace
                rect: {
                    x: xPercent,
                    y: yPercent,
                    w: Math.round(rect.width),
                    h: Math.round(rect.height)
                },
                attributes: {
                    disabled: node.disabled ? true : undefined,
                    href: node.href ? 'link' : undefined,
                    type: node.type || undefined
                }
            });

            // Limit tree size for performance
            if (tree.length > 100) break;
        }
        return tree;
    }

    handleAct(result) {
        this.uiCallback('status', 'Acting...');

        // Deduplication using highlight
        if (result.highlight === this.lastAnalysis) {
            console.log('Skipping duplicate analysis');
        } else {
            this.lastAnalysis = result.highlight;
            this.uiCallback('result', result);
        }

        // Go back to IDLE
        setTimeout(() => {
            this.transition('IDLE');
        }, 5000); // 5s read time
    }
}
