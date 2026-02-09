const CONFIG = {
    // Official Tier 1 Pay-As-You-Go Key (High Rate Limits)
    // Official Tier 1 Pay-As-You-Go Key (High Rate Limits)
    GEMINI_API_KEY: '', // User must provide key in Dashboard

    // Legacy Pool (Unused now that we have Tier 1)
    // GEMINI_API_KEYS: [...], 

    MODEL_NAME: 'gemini-3-flash-preview',
    // Base URL for dynamic construction
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',

    // Ghost Site Blacklist (No Capture)
    BLACKLIST_DOMAINS: [
        'gemini.google.com',
        'chatgpt.com',
        'claude.ai',
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
    ]
};
