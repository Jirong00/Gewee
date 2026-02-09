// background.js
try {
  // Import dependencies (Relative to src/background/)
  importScripts('config.js', 'agent_logic.js', '../dashboard/notebook.js');
  console.log("Background scripts imported successfully.");
} catch (e) {
  console.error("Failed to import scripts:", e);
}


// Configuration
const ALARM_NAME = "screen_capture_alarm";
const CAPTURE_INTERVAL_MINUTES = 0.33; // 20 seconds (Balanced for Preview Model)

// Smart Idle: Store the last screenshot to detect changes
let lastScreenshot = null;
let isInternalNavigation = false; // Flag to prevent self-triggering analysis

// function to capture the visible tab
async function captureTab(force = false, context = 'STANDARD') {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Check if we can capture this tab (e.g. not chrome:// URLs)
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    // Check for Ghost Site Blacklist
    if (typeof CONFIG !== 'undefined' && CONFIG.BLACKLIST_DOMAINS) {
      const urlObj = new URL(tab.url);
      if (CONFIG.BLACKLIST_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
        console.log(`[Ghost Mode] Ignoring blacklisted domain: ${urlObj.hostname}`);
        return;
      }
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 50 });

    // Smart Idle: Check if screen changed (unless forced)
    if (!force && dataUrl === lastScreenshot) {
      console.log("Smart Idle: Screen hasn't changed. Skipping AI analysis to save quota.");
      return;
    }
    lastScreenshot = dataUrl;

    // --- Cache Logic (V3) ---
    const cacheKey = `analysis_v5_1_${tab.url}_${context}`;

    // Check Cache (Use Local for persistence per Mission)
    chrome.storage.local.get(cacheKey, (result) => {
      const cached = result[cacheKey];
      if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1 Hour TTL
        console.log(`Using Cached Analysis for [${context}]:`, tab.url);

        // Broadcast Screenshot Update (UI needs this first to update thumbnail)
        chrome.tabs.sendMessage(tab.id, {
          type: 'SCREENSHOT_CAPTURED',
          payload: { image: dataUrl, timestamp: Date.now(), tabId: tab.id, tabTitle: tab.title, context: context }
        }).catch(() => { });

        // Broadcast Cached Analysis
        chrome.tabs.sendMessage(tab.id, {
          type: 'ANALYSIS_COMPLETE',
          payload: cached.data
        }).catch(() => { });
        return;
      }

      // SILENT LOAD CHECK: If Security Context & Not Forced (Page Load), SKIP Analysis
      if (context === 'SECURITY_AUDIT' && !force) {
        console.log("Security Context Detected: Skipping auto-analysis (Silent Load).");
        return;
      }

      // No Cache -> Proceed to Broadcast Capture & Analyze
      chrome.tabs.sendMessage(tab.id, {
        type: 'SCREENSHOT_CAPTURED',
        payload: {
          image: dataUrl,
          timestamp: Date.now(),
          tabId: tab.id,
          tabTitle: tab.title,
          context: context // Pass context
        }
      }).catch(err => {
        // Content script might not be ready
      });

      console.log(`Screenshot captured and broadcasted [${context}]. Analyzing...`);

      // Trigger Gemini Analysis
      callGeminiFlash(dataUrl, tab.title, context).then(analysis => {
        if (analysis) {
          console.log("Gemini Analysis Complete:", analysis);

          // Save to Cache (Local)
          const cacheData = {};
          cacheData[cacheKey] = { timestamp: Date.now(), data: analysis };
          chrome.storage.local.set(cacheData);

          chrome.tabs.sendMessage(tab.id, {
            type: 'ANALYSIS_COMPLETE',
            payload: analysis
          }).catch(() => { });
        }
      });
    });

  } catch (error) {
    console.error('Error capturing tab:', error);
  }
}

// SETUP ALARM REMOVED: Relying on Event Listeners (onUpdated, onActivated) for zero-spam efficiency.

// Phase 9: On-Demand Triggers

// 1. Reason on Page Load
// 1. Reason on Page Load or Tab Switch
// 1. Reason on Page Load or Tab Switch
// Debounce Timer
let captureTimer = null;

function scheduleCapture(delayMs) {
  if (captureTimer) clearTimeout(captureTimer);
  console.log(`Scheduling capture in ${delayMs}ms...`);
  captureTimer = setTimeout(() => {
    captureTab();
    captureTimer = null;
  }, delayMs);
}

// 1. Reason on Page Load or Tab Switch
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    console.log("Tab Updated (Complete).");
    // Trigger ONCE on load
    // Check Trigger Mode
    chrome.storage.local.get('triggerMode', (data) => {
      const mode = data.triggerMode || 'DEFAULT';
      console.log(`Tab Updated. Trigger Mode: ${mode}`);

      if (mode === 'CHILL') {
        return; // Manual only
      }

      // Default & Active trigger on load
      scheduleCapture(3000);
    });
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (isInternalNavigation) {
    isInternalNavigation = false;
    return;
  }
  console.log("Tab Activated.");
  // Optional: Trigger on tab switch if you consider that a "First Load" of that view
  // But user said "first load trigger", usually implies page load.
  // We'll keep it but ensure it doesn't loop via alarms.
  chrome.storage.local.get('triggerMode', (data) => {
    const mode = data.triggerMode || 'DEFAULT';
    if (mode === 'CHILL') return;

    lastScreenshot = null;
    scheduleCapture(3000);
  });
});

// 2. Manual Trigger via Message
// 2. Manual Trigger & History Persistence
// --- Gemini Intelligence Engine ---
// --- Skill Engine Registry ---
const SKILL_REGISTRY = {
  "NAVIGATOR": {
    trigger: "TUTOR",
    description: "Identifies key sections for navigation.",
    action: "JUMP_TO_ELEMENT"
  },
  "VAULT_GUARD": {
    trigger: "GUARDIAN",
    description: "Protects identity and masks inputs.",
    action: "MASK_INFO"
  },
  "SECRETARY": {
    trigger: "ACTIONER", // New persona trait or just universal?
    description: "Drafts responses and fills forms.",
    action: "DRAFT_RESPONSE"
  }
};

const ARCHITECT_SYSTEM_INSTRUCTION = `
      **System Directive: High-Efficiency Browser Agent (Gemini 3)**
      You are **Gewee**, a 'Direct Value' browser companion. 
      **Output Constraint**: keep 'short_desc' under 150 characters. NO FLUFF.
      If you have nothing specific to add, return "Standby" in 'short_desc'.

      **Mode Logic:**
      
      1. **TUTOR (Technical Sites, Documentation, Research Papers, GitHub)**
         - **Goal**: Explain complexity & Guide learning.
         - **Action**: Identify the FIRST complex term or code block users might struggle with.
         - **Output**: Return 'technical_term' (string) to highlight it.
         - **Persona**: **TUTOR** (Blue).

      2. **GUARDIAN (Login, Payments, Sensitive)**
         - **Goal**: Security ONLY.
         - **Action**: Mask inputs or warn of phishing. DO NOT offer generic summaries.
         - **Persona**: **GUARDIAN** (Red).
         
      3. **MUSE (Social, Email, Writing)**
         - **Goal**: Assist creativity.
         - **Action**: Draft content.
         - **Persona**: **MUSE** (Purple).

      **Output Schema (JSON Only):**
      {
        "persona": "MUSE" | "TUTOR" | "GUARDIAN" | "COMPANION",
        "short_desc": "string (Max 150 chars. E.g. 'Defined Recursive DFS' or 'Standby')",
        "technical_term": "string (The exact text to highlight for Tutor mode, or null)",
        "deep_dive": ["string (Optional: 3 key insights if relevant)"],
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
      }`;

// ... (Rest of file) ...

// End of Architect Instruction

async function callGeminiFlash(imageBase64, tabTitle, context = 'STANDARD') {
  // Ensure KEY is defined (referenced from config.js)
  // CONFIG is loaded via importScripts('config.js')
  const API_KEY = await getApiKey();

  // Dynamic URL Construction
  let baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  let model = 'gemini-3-flash-preview';

  if (typeof CONFIG !== 'undefined') {
    baseUrl = CONFIG.BASE_URL || baseUrl;
    model = CONFIG.MODEL_NAME || model;
  }

  // User Override
  const settings = await chrome.storage.local.get(['customModel']);
  if (settings.customModel) {
    model = settings.customModel;
  }

  const API_URL = `${baseUrl}/${model}:generateContent`;

  if (!API_KEY || API_KEY === 'INSERT_KEY_HERE') {
    console.warn("Gemini API Key missing. Skipping analysis.");
    return null;
  }

  try {
    // Strip header if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, "");

    // Modify Instruction based on Context via Prompt Injection (Meta-Prompting)
    let specificInstruction = `Analyze this webpage screenshot. Title: ${tabTitle}. `;
    if (context === 'SECURITY_AUDIT') {
      specificInstruction += " FOCUS STRICTLY ON SECURITY. Identify login forms, SSL indicators, and potential phishing signs. ";
    }

    const fullPrompt = `${specificInstruction} ${ARCHITECT_SYSTEM_INSTRUCTION}`;

    // Fix: Append API Key to URL (Smart Check)
    const separator = API_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${API_URL}${separator}key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: fullPrompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();

    // Check for candidates
    if (!data.candidates || data.candidates.length === 0) {
      if (data.promptFeedback) {
        console.warn("Gemini Safety Block Triggered:", data.promptFeedback);
        return null; // Handle gracefully
      }
      if (data.error) {
        console.error("Gemini API Error:", data.error.message);
        return null;
      }
      console.warn("Gemini returned no candidates (Unknown Reason):", data);
      return null;
    }

    const text = data.candidates[0].content?.parts?.[0]?.text;
    if (!text) {
      console.warn("Gemini response contained no text.");
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("Gemini response was not valid JSON:", text);
      return null; // Or handle partial text
    }

  } catch (e) {
    console.error("Gemini API Error:", e);
    return null;
  }
}

async function callGeminiText(prompt) {
  const API_KEY = await getApiKey();

  // Dynamic URL Construction (The "Root" Fix)
  // Default to v1beta/gemini-3-flash-preview if CONFIG is missing
  let baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  let model = 'gemini-3-flash-preview';

  if (typeof CONFIG !== 'undefined') {
    baseUrl = CONFIG.BASE_URL || baseUrl;
    model = CONFIG.MODEL_NAME || model;
  }

  // User Override
  const settings = await chrome.storage.local.get(['customModel']);
  if (settings.customModel) {
    model = settings.customModel;
  }

  const API_URL = `${baseUrl}/${model}:generateContent`;

  if (!API_KEY || API_KEY === 'INSERT_KEY_HERE') {
    console.warn("Gemini API Key missing.");
    return "Error: API Key missing. Please set it in Dashboard.";
  }

  // Append Key
  const url = `${API_URL}?key=${API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || "Error: No response from Gemini.";

  } catch (e) {
    console.warn("Gemini Text API Error:", e);
    // Return friendly error instead of crashing
    return "Network error. Please check your connection.";
  }
}

// --- Intent-Based Prompt Synthesis (The "Brain") ---

function constructMissionPrompt(mode, data, userLang) {
  // 1. Sanitize Data
  // 1. Sanitize Data
  const title = data.tabTitle || chrome.i18n.getMessage("label_current_page") || 'Current Page';

  // Format Details only if they exist
  let text = (data.text || '');
  if (data.detail && data.detail.trim().length > 0) {
    const detailsLabel = chrome.i18n.getMessage("label_details") || "Details";
    text += `\n${detailsLabel}: ${data.detail}`;
  }

  // 2. Fetch Localized Template
  // Keys: prompt_research, prompt_factcheck, prompt_visualize, prompt_creative
  const messageKey = `prompt_${mode}`;

  // 3. Get I18n Message
  // Note: getMessage placeholders are positional $1, $2
  let prompt = chrome.i18n.getMessage(messageKey, [title, text]);

  // Fallback if template missing (e.g. invalid mode)
  if (!prompt) {
    console.warn(`Template for mode [${mode}] not found. Using Research fallback.`);
    prompt = chrome.i18n.getMessage("prompt_research", [title, text]);
  }

  // ULTIMATE FALLBACK (If i18n fails completely)
  if (!prompt) {
    console.error("CRITICAL: i18n.getMessage returned null for fallback too. Using hardcoded string.");
    prompt = `Act as a research assistant. Analyze this content: ${title} - ${text}`;
  }

  return prompt;
}


function openGeminiAndPrompt(prompt) {
  chrome.tabs.create({ url: 'https://gemini.google.com/app' }, (tab) => {
    const listener = (tabId, changeInfo, tabInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (text) => {
            // Robust Polling Helper
            const waitForElement = (selector, timeout = 15000) => {
              return new Promise((resolve) => {
                const el = document.querySelector(selector);
                if (el) return resolve(el);

                const observer = new MutationObserver(mutations => {
                  const el = document.querySelector(selector);
                  if (el) {
                    resolve(el);
                    observer.disconnect();
                  }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
              });
            };

            (async () => {
              // Selectors: Rich textarea often has role="textbox" or contenteditable="true"
              // Gemini update frequency means we should try multiple
              const selectors = [
                'div[contenteditable="true"]',
                '[role="textbox"]',
                '.ql-editor',
                'textarea'
              ];

              let editor = null;
              for (const sel of selectors) {
                editor = await waitForElement(sel, 5000); // 5s per selector
                if (editor) break;
              }

              if (editor) {
                // Remove previous debug visuals
                editor.style.boxShadow = "none";
                editor.style.transition = "none";

                // 1. Always Copy to Clipboard (Reliable Backup)
                navigator.clipboard.writeText(text).then(() => {
                  chrome.runtime.sendMessage({ type: 'DEBUG_LOG', msg: 'Copied to clipboard.' });
                }).catch(err => {
                  chrome.runtime.sendMessage({ type: 'DEBUG_LOG', msg: 'Clipboard write failed: ' + err });
                });

                // 2. Try Modern Injection (React/Angular Friendly)
                editor.focus();

                // Clear existing content if needed (optional, simplistic approach)
                // document.execCommand('selectAll', false, null); 

                // Simulate proper input event for framework bindings
                const dt = new DataTransfer();
                dt.setData("text/plain", text);

                const inputEvent = new InputEvent('input', {
                  bubbles: true,
                  cancelable: true,
                  inputType: 'insertText',
                  data: text,
                  dataTransfer: dt
                });

                editor.innerHTML = ""; // Hard clear visual
                editor.textContent = text; // Value set
                editor.dispatchEvent(inputEvent); // Trigger framework

                // Fallback: execCommand is still useful for some contenteditables
                if (!editor.value && editor.innerText !== text) {
                  document.execCommand('insertText', false, text);
                }

                // 3. Verify & Fallback UI
                setTimeout(() => {
                  const currentVal = editor.value || editor.innerText || "";
                  if (!currentVal.includes(text.substring(0, 10))) {
                    // Injection Failed. Show "Press Ctrl+V" Tooltip.
                    chrome.runtime.sendMessage({ type: 'DEBUG_LOG', msg: 'Injection failed. Showing Tooltip.' });

                    // Create Tooltip
                    const tooltip = document.createElement('div');
                    tooltip.textContent = "✨ Click here & Press Ctrl+V";
                    Object.assign(tooltip.style, {
                      position: 'absolute',
                      background: '#1a73e8',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      zIndex: '9999',
                      fontSize: '14px',
                      pointerEvents: 'none',
                      animation: 'fadeIn 0.3s ease-out'
                    });

                    // Ensure parent is positioned (usually Gemini editor wrapper is)
                    // Or append to body and use rect? Body is safer.
                    const rect = editor.getBoundingClientRect();
                    tooltip.style.left = rect.left + 'px';
                    tooltip.style.top = (rect.top - 50) + 'px'; // Above the box

                    document.body.appendChild(tooltip);

                    // Remove after 5s
                    setTimeout(() => tooltip.remove(), 5000);
                  }
                }, 200);

              } else {
                chrome.runtime.sendMessage({ type: 'DEBUG_LOG', msg: 'Gemini Editor NOT found after timeout.' });
              }
            })();
          },
          args: [prompt]
        });
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'TRIGGER_REASONING') {
    const context = message.payload?.context || 'STANDARD';
    console.log(`Manual Trigger received [${context}], capturing...`);
    captureTab(true, context);
  }
  else if (message.type === 'DEBUG_LOG') {
    console.log("[Content Script Log]:", message.msg);
  }
  else if (message.type === 'ANALYSIS_COMPLETE') {
    // Persist history even if Side Panel is closed
    const data = message.payload;
    // Support new 'highlight' field, 'short_desc' (Architect), or legacy 'activity_analysis'
    const text = data.error_log ? data.error_log : (data.short_desc || data.highlight || data.activity_analysis);
    const timestamp = new Date().toLocaleTimeString();

    // Check for null/undefined text to prevent crash
    if (!text || typeof text !== 'string') {
      console.warn("Analysis complete but text content is missing.", data);
      return;
    }

    // Check if it's just a Zzz message (don't save)
    if (text.includes("Zzz...")) return;

    // Use deep_dive summary or text as detail
    let detail = data.detailed_analysis || text;
    if (data.deep_dive && Array.isArray(data.deep_dive)) {
      detail = data.deep_dive.join('\n- ');
    }

    // Store tabId with history item to filter later
    const tabId = sender.tab ? sender.tab.id : null;
    const item = { text, detail, timestamp, tabId };

    // USE LOCAL STORAGE PER MISSION
    chrome.storage.local.get('observerHistory', (result) => {
      const history = result.observerHistory || [];
      history.push(item);
      if (history.length > 50) history.shift();
      chrome.storage.local.set({ observerHistory: history }, () => {
        // Broadcast update
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: 'HISTORY_UPDATED', payload: history }).catch(() => { });
          });
        });
      });
    });
  }
  else if (message.type === 'NAVIGATION_REQUEST') {
    if (message.payload.tabId) {
      isInternalNavigation = true; // Set flag to ignore next onActivated
      chrome.tabs.update(message.payload.tabId, { active: true });
      chrome.tabs.get(message.payload.tabId, (tab) => {
        if (tab && tab.windowId) {
          chrome.windows.update(tab.windowId, { focused: true });
        }
      });
      // Safety reset of flag after 2s in case event doesnt fire or whatever
      setTimeout(() => { isInternalNavigation = false; }, 2000);
    }
  }
  else if (message.type === 'GET_HISTORY') {
    chrome.storage.local.get('observerHistory', (result) => {
      sendResponse({ history: result.observerHistory || [] });
    });
    return true; // Keep channel open for async response
  }
  else if (message.type === 'CLEAR_HISTORY') {
    chrome.storage.local.remove('observerHistory');
    // Broadcast to all tabs that history is cleared
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'HISTORY_UPDATED', payload: [] }).catch(() => { });
      });
    });
  }
  else if (message.type === 'OPEN_DASHBOARD') {
    const view = message.payload?.view ? `#${message.payload.view}` : ''; // Support #settings
    const dashboardUrl = chrome.runtime.getURL('src/dashboard/dashboard.html');

    chrome.tabs.query({}, (tabs) => {
      const existingTab = tabs.find(t => t.url && t.url.includes('src/dashboard/dashboard.html'));

      if (existingTab) {
        // Tab exists, switch to it
        chrome.tabs.update(existingTab.id, { active: true, url: dashboardUrl + view }); // Update URL to trigger hash change
        chrome.windows.update(existingTab.windowId, { focused: true });
      } else {
        // Create new with hash
        chrome.tabs.create({ url: 'src/dashboard/dashboard.html' + view });
      }
      sendResponse({ status: 'ok' }); // Close channel
    });
    return true; // Async wait
  }
  else if (message.type === 'SAVE_NOTE') {
    if (self.Notebook) {
      self.Notebook.save(message.payload);
    } else {
      // Fallback if import failed
      chrome.storage.local.get('notebook', (data) => {
        const nb = data.notebook || [];
        nb.push(message.payload);
        chrome.storage.local.set({ notebook: nb });
      });
    }
  }
  else if (message.type === 'TRIGGER_DISPATCH') {
    const { mode, data } = message.payload;
    const userLang = chrome.i18n.getUILanguage();

    // 1. Check for Super Prompt (Generated by Gemini)
    let prompt = "";
    if (data.generatedPrompts && data.generatedPrompts[mode]) {
      console.log(`Using Super Prompt for [${mode}]`);
      prompt = data.generatedPrompts[mode];
    } else {
      // 2. Fallback to Local Template
      console.log(`Using Local Template for [${mode}]`);
      prompt = constructMissionPrompt(mode, data, userLang);
    }

    console.log(`Dispatching [${mode}] to Gemini in [${userLang}]...`);
    openGeminiAndPrompt(prompt);
    sendResponse({ status: 'ok' }); // Close channel cleanly
  }

  else if (message.type === 'DEEP_DIVE') {
    // Legacy support or direct call
    openGeminiAndPrompt(message.payload.prompt);
    sendResponse({ status: 'ok' }); // Close channel
  }
  else if (message.type === 'GENERATE_DRAFT') {
    // 1. Construct System Instruction
    const systemInstruction = `Instruction: The user is focused on a text input field.
    Scrape Context: Analyze the nearest headers and the 500 characters preceding the cursor.
    Determine Intent: Is the user searching, replying to a thread, or filling a form?
    Drafting: Generate ONLY the text that goes inside the box.
    Adaptive Tone: If on LinkedIn, use 'Professional'. If on Discord/Facebook, use 'Conversational'. If on a Search bar, use 'Concise & Semantic'.`;
    const fullPrompt = `${systemInstruction}\n\nUser Context:\n${message.payload.context}`;

    // 2. Call Gemini
    callGeminiText(fullPrompt).then(reply => {
      sendResponse({ text: reply.trim() });
    });
    return true; // Async wait
  }

  return true; // Keep channel open for any async responses
});

// 3. Reactive Mode Switching (Instant Update)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.triggerMode) {
    const newMode = changes.triggerMode.newValue;
    console.log(`[Reactive Switch] Trigger Mode changed to: ${newMode}`);

    if (newMode === 'ACTIVE' || newMode === 'DEFAULT') {
      // User turned it ON -> Trigger immediately to show it's working
      // (Debounce slightly to avoid rapid toggling issues)
      scheduleCapture(500);
    } else if (newMode === 'CHILL') {
      // User turned it OFF -> Clear any pending capture
      if (captureTimer) {
        clearTimeout(captureTimer);
        captureTimer = null;
        console.log("[Reactive Switch] Chill Mode: Pending capture cancelled.");
      }
    }
  }
});
