// dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    // Notebook instance (Notebook var injected via script tag or globally available if module)
    // Using global Notebook from notebook.js

    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const navSubItems = document.querySelectorAll('.nav-subitem');
    const views = document.querySelectorAll('.view');
    let currentFilter = 'all';

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.view) {
                switchView(item.dataset.view);
            }
        });
    });

    // Helper: Switch View
    function switchView(viewId) {
        // Update Nav
        navItems.forEach(n => {
            if (n.dataset.view === viewId) n.classList.add('active');
            else n.classList.remove('active');
        });

        // Update Views
        views.forEach(v => {
            v.classList.remove('active');
            if (v.id === `view-${viewId}`) v.classList.add('active');
        });
    }

    // Hash Routing (Deep Linking)
    function checkHash() {
        const hash = window.location.hash.substring(1); // Remove #
        if (hash === 'settings') {
            switchView('settings');
            // Check if we need to show guidance (only if key is missing)
            chrome.storage.local.get(['geminiApiKey'], (data) => {
                if (!data.geminiApiKey) {
                    showGuidance();
                }
            });
        } else {
            // Default
            switchView('notebook');
        }
    }

    // Init Logic
    window.addEventListener('hashchange', checkHash);
    checkHash(); // Check on load

    // Guidance Animation Logic
    function showGuidance() {
        const keyCard = document.querySelector('.setting-card'); // First card is Key
        const keyInput = document.getElementById('api-key-input');

        if (keyCard && keyInput) {
            // 1. Highlight Card
            keyCard.classList.add('highlight-pulse');

            // 2. Add Pointer (if not exists)
            if (!keyCard.querySelector('.guidance-pointer')) {
                const pointer = document.createElement('div');
                pointer.className = 'guidance-pointer';
                pointer.innerText = '👈'; // or '👇' depending on layout
                // Since input is inside, let's position relative to input group?
                // Actually the card is position:relative.
                // Let's put it on the right pointing left.
                keyCard.appendChild(pointer);
            }

            // 3. Remove on interaction
            keyInput.addEventListener('focus', () => {
                keyCard.classList.remove('highlight-pulse');
                const ptr = keyCard.querySelector('.guidance-pointer');
                if (ptr) ptr.remove();
            }, { once: true });
        }
    }

    // Sub-item filtering
    navSubItems.forEach(item => {
        item.addEventListener('click', () => {
            // UI Update
            navSubItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Logic
            currentFilter = item.dataset.filter;
            loadNotes();
        });
    });

    // --- Notebook Logic ---
    const notesGrid = document.getElementById('notes-grid');
    const searchInput = document.getElementById('search-notes');
    let allNotes = [];

    async function loadNotes() {
        allNotes = await Notebook.getAll();
        renderNotes(allNotes);
    }

    function renderNotes(notes) {
        notesGrid.innerHTML = '';

        // Filter
        let filtered = notes;
        if (currentFilter !== 'all') {
            filtered = notes.filter(n => n.color === currentFilter);
        }

        if (filtered.length === 0) {
            notesGrid.innerHTML = '<div class="empty-state">No notes found for this filter.</div>';
            return;
        }

        filtered.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card color-${note.color || 'grey'}`;

            // Deep Dive / Gemini Link
            const deepDiveBtn = note.text ?
                `<button class="gemini-btn" data-text="${encodeURIComponent(note.text + " " + (note.detail || ""))}" data-timestamp="${note.savedAt || note.timestamp}">
                    ✨ Ask Gemini
                </button>` : '';

            // Detail Block
            const detailHtml = note.detail ? `
                <details class="note-detail-block">
                    <summary>Show Deep Dive</summary>
                    <div class="detail-content">${formatMarkdown(note.detail)}</div>
                </details>
            ` : '';

            card.innerHTML = `
                <div class="note-header">
                    <span class="note-date">${note.savedAt || note.timestamp}</span>
                    <div class="card-actions">
                        <div class="card-colors">
                            <div class="cc-dot red" data-color="red" data-id="${note.id}" title="Important"></div>
                            <div class="cc-dot blue" data-color="blue" data-id="${note.id}" title="Info"></div>
                            <div class="cc-dot green" data-color="green" data-id="${note.id}" title="Code"></div>
                            <div class="cc-dot yellow" data-color="yellow" data-id="${note.id}" title="Idea"></div>
                            <div class="cc-dot grey" data-color="grey" data-id="${note.id}" title="Inbox"></div>
                        </div>
                        <button class="icon-btn delete" data-id="${note.id}" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="note-content">
                    ${formatMarkdown(note.text || note.highlight)}
                </div>
                ${detailHtml}
                 <div class="note-footer">
                    ${note.url ? `<a href="${note.url}" target="_blank" class="source-link">🔗 Source</a>` : ''}
                    ${deepDiveBtn}
                </div>
            `;
            notesGrid.appendChild(card);
        });

        // Attach Listeners
        document.querySelectorAll('.icon-btn.delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await Notebook.delete(id);
                loadNotes();
            });
        });

        document.querySelectorAll('.cc-dot').forEach(dot => {
            dot.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const color = e.target.dataset.color;
                await Notebook.update(id, { color });
                loadNotes(); // Re-render to show new border color
            });
        });

        // Gemini Integration
        document.querySelectorAll('.gemini-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = decodeURIComponent(e.target.dataset.text);
                const timestamp = e.target.dataset.timestamp;
                // Open Dispatcher Modal instead of direct send
                openDispatcherModal({
                    text: text,
                    detail: "", // Dashboard notes merge logic is simpler for now
                    timestamp: timestamp
                });
            });
        });
    }

    // --- Dispatcher Modal Logic ---
    const dispatchModal = document.getElementById('dispatcher-modal');
    // We need to re-select inside modal because identifiers might be reused or unique
    const dispatchModeBtns = dispatchModal.querySelectorAll('.mode-btn');
    let pendingGeminiData = null;

    function openDispatcherModal(data) {
        pendingGeminiData = data;
        dispatchModal.classList.add('active');
    }

    function closeDispatcherModal() {
        dispatchModal.classList.remove('active');
        pendingGeminiData = null;
    }

    // Close on background click
    dispatchModal.addEventListener('click', (e) => {
        if (e.target === dispatchModal) closeDispatcherModal();
    });

    dispatchModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            if (pendingGeminiData) {
                // Show Loading
                const content = dispatchModal.querySelector('.dispatcher-content');
                content.classList.add('loading');

                // Update text based on mode (Simple English for now, can be i18n'd later)
                const loaderText = content.querySelector('.loader-text');
                if (loaderText) loaderText.textContent = `Architecting ${mode} plan...`;

                // EXECUTE IMMEDIATELY (Fix for Popup Blocker)
                chrome.runtime.sendMessage({
                    type: 'TRIGGER_DISPATCH',
                    payload: {
                        mode: mode,
                        data: pendingGeminiData
                    }
                });

                // Close after a delay (enough for the user to see "Architecting..." and tab to open)
                // The background script will open a new tab, so this page might lose focus.
                setTimeout(() => {
                    closeDispatcherModal();
                    // Reset Loading State
                    setTimeout(() => content.classList.remove('loading'), 300);
                }, 2000);
            } else {
                closeDispatcherModal();
            }
        });
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allNotes.filter(n =>
            (n.text && n.text.toLowerCase().includes(query)) ||
            (n.highlight && n.highlight.toLowerCase().includes(query))
        );
        renderNotes(filtered);
    });

    // Helper
    const formatMarkdown = (text) => text
        ? text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\n/g, '<br>')
            .substring(0, 300) + (text.length > 300 ? '...' : '')
        : '';

    // --- Group Renaming ---
    const groupLabels = {
        red: "Important",
        blue: "Info",
        green: "Code",
        yellow: "Idea",
        grey: "Inbox"
    };

    function loadGroupNames() {
        chrome.storage.local.get('groupNames', (data) => {
            const savedNames = data.groupNames || {};
            // Merge defaults
            Object.keys(groupLabels).forEach(key => {
                const name = savedNames[key] || groupLabels[key];
                const labelEl = document.querySelector(`.label[data-key="${key}"]`);
                if (labelEl) labelEl.textContent = name;
            });
        });
    }
    loadGroupNames();

    // --- Modal Logic ---
    const modal = document.getElementById('rename-modal');
    const renameInput = document.getElementById('rename-input');
    const saveBtn = document.getElementById('rename-save');
    const cancelBtn = document.getElementById('rename-cancel');
    let editingKey = null;

    function openModal(key, currentName) {
        editingKey = key;
        renameInput.value = currentName;
        modal.classList.add('active');
        renameInput.focus();
    }

    function closeModal() {
        modal.classList.remove('active');
        editingKey = null;
    }

    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', () => {
        if (!editingKey) return;

        const newName = renameInput.value.trim();
        if (newName !== "") {
            // Save
            chrome.storage.local.get('groupNames', (data) => {
                const names = data.groupNames || {};
                names[editingKey] = newName;
                chrome.storage.local.set({ groupNames: names });

                // Update UI
                const labelEl = document.querySelector(`.label[data-key="${editingKey}"]`);
                if (labelEl) labelEl.textContent = newName;

                closeModal();
            });
        }
    });

    // Allow Enter key to save
    renameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Update Edit Buttons to use Modal
    document.querySelectorAll('.edit-group-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent filter click
            const key = e.target.dataset.key;
            const labelEl = document.querySelector(`.label[data-key="${key}"]`);
            openModal(key, labelEl.textContent);
        });
    });

    const modeBtns = document.querySelectorAll('.mode-btn');
    const loginGuard = document.getElementById('login-guard');
    const clearBtn = document.getElementById('clear-memory-btn');
    const themeDots = document.querySelectorAll('.theme-dot');

    // API Key Logic
    const keyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const removeKeyBtn = document.getElementById('remove-key-btn');
    const keyStatus = document.getElementById('key-status');

    // Load Settings
    chrome.storage.local.get(['settings', 'triggerMode', 'geminiApiKey'], (data) => {
        const settings = data.settings || { loginGuard: true, theme: 'blue' };
        const mode = data.triggerMode || 'DEFAULT';

        // Load Key (Masked)
        if (data.geminiApiKey) {
            keyInput.value = data.geminiApiKey; // Or "••••••••"
        }

        // Mode
        updateModeUI(mode);

        // Guard
        loginGuard.checked = settings.loginGuard;

        // Theme
        applyTheme(settings.theme);
    });

    // Mode Toggle
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            // Save to Root for Background/Content Script Access
            chrome.storage.local.set({ triggerMode: mode });

            // Save to legacy settings object for other prefs
            saveSetting('mode', mode); // Optional/Legacy

            // Broadcast Change
            chrome.runtime.sendMessage({
                type: 'MODE_CHANGED',
                payload: mode
            });

            // Direct Content Script Broadcast (to all tabs)
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'MODE_CHANGED',
                        payload: mode
                    }).catch(() => { });
                });
            });

            updateModeUI(mode);
        });
    });

    function updateModeUI(mode) {
        modeBtns.forEach(b => b.classList.remove('active'));
        document.querySelector(`.mode-btn[data-mode="${mode}"]`)?.classList.add('active');
    }

    // Login Guard
    loginGuard.addEventListener('change', (e) => {
        saveSetting('loginGuard', e.target.checked);
    });

    // Theme Logic
    themeDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.dataset.theme;
            saveSetting('theme', theme);
            applyTheme(theme);
        });
    });

    // Save API Key
    saveKeyBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();
        if (key) {
            chrome.storage.local.set({ geminiApiKey: key }, () => {
                keyStatus.textContent = "Key saved securely!";
                keyStatus.style.color = "#4CAF50";
                setTimeout(() => keyStatus.textContent = "", 3000);
            });
        }
    });

    // Remove API Key
    removeKeyBtn.addEventListener('click', () => {
        chrome.storage.local.remove('geminiApiKey', () => {
            keyInput.value = "";
            keyStatus.textContent = "Key removed. Extension disabled.";
            keyStatus.style.color = "#FF6B6B";
            setTimeout(() => keyStatus.textContent = "", 3000);
        });
    });

    function applyTheme(theme) {
        // Just saving for now, actual CSS variable injection needs to happen in content_script
        // But we can preview it here?
        // TODO: Broadcast theme change to content scripts
        chrome.storage.local.set({ theme });
    }

    function saveSetting(key, value) {
        chrome.storage.local.get(['settings'], (data) => {
            const settings = data.settings || {};
            settings[key] = value;
            chrome.storage.local.set({ settings });
        });
    }

    // Clear Memory
    clearBtn.addEventListener('click', async () => {
        if (confirm("Are you sure? This will wipe all history and notes.")) {
            await Notebook.clear();
            await chrome.storage.session.remove('observerHistory');
            chrome.storage.local.remove('settings');
            loadNotes();
            alert("Memory cleared.");
        }
    });

    // Init
    loadNotes();
});
