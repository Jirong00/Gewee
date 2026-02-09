/**
 * Notebook Module
 * Handles CRUD operations for saving insights to chrome.storage.local
 */
const Notebook = {
    // Save a note
    async save(note) {
        try {
            const data = await chrome.storage.local.get('notebook');
            const notebook = data.notebook || [];

            // Deduplicate by timestamp or content
            if (notebook.some(n => n.timestamp === note.timestamp)) {
                console.log("Note already saved.");
                return false;
            }

            // Provide a unique ID if not present
            note.id = note.id || Date.now().toString();
            note.savedAt = new Date().toLocaleString();

            notebook.push(note);
            await chrome.storage.local.set({ notebook });
            console.log("Note saved:", note);
            return true;
        } catch (e) {
            console.error("Notebook Save Error:", e);
            return false;
        }
    },

    // Get all notes
    async getAll() {
        try {
            const data = await chrome.storage.local.get('notebook');
            return data.notebook || [];
        } catch (e) {
            console.error("Notebook Get Error:", e);
            return [];
        }
    },

    // Delete a note
    async delete(id) {
        try {
            const data = await chrome.storage.local.get('notebook');
            let notebook = data.notebook || [];
            notebook = notebook.filter(n => n.id !== id && n.id !== parseInt(id)); // rigorous ID check
            await chrome.storage.local.set({ notebook });
            return true;
        } catch (e) {
            console.error("Notebook Delete Error:", e);
            return false;
        }
    },

    // Update a note
    async update(id, updates) {
        try {
            const data = await chrome.storage.local.get('notebook');
            let notebook = data.notebook || [];
            const index = notebook.findIndex(n => n.id === id || n.id === parseInt(id));
            if (index !== -1) {
                notebook[index] = { ...notebook[index], ...updates };
                await chrome.storage.local.set({ notebook });
                return true;
            }
            return false;
        } catch (e) {
            console.error("Notebook Update Error:", e);
            return false;
        }
    },

    // Clear all
    async clear() {
        await chrome.storage.local.remove('notebook');
    }
};

// Export for usage if in module system (but here we just inject it)
if (typeof window !== 'undefined') {
    window.Notebook = Notebook;
} else {
    // Service Worker Context (self)
    self.Notebook = Notebook;
}
