const fs = require('fs');
const vm = require('vm');
const path = require('path');

const files = [
    'src/background/config.js',
    'src/background/agent_logic.js',
    'src/background/background.js',
    'src/content/content_script.js',
    'src/dashboard/notebook.js'
];

console.log("Starting Expanded Syntax Check...");

files.forEach(file => {
    try {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const code = fs.readFileSync(filePath, 'utf8');

            // 1. Check for Merge Conflicts
            if (code.includes('<<<<<<<') || code.includes('=======')) {
                console.error(`❌ [FAIL] ${file} - MERGE CONFLICT MARKERS FOUND`);
                return;
            }

            new vm.Script(code);
            console.log(`✅ [PASS] ${file}`);
        } else {
            console.log(`⚠️ [MISSING] ${file}`);
        }
    } catch (e) {
        console.error(`❌ [FAIL] ${file}`);
        console.error(e.message);
    }
});
