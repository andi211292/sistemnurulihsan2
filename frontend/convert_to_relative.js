const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(srcDir, function (filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Pattern 1: Convert `${process.env.NEXT_PUBLIC_API_URL || "..."}/api/...` to `/api/...`
        // We handle templates like `${...}/api/path` -> `/api/path`
        content = content.replace(/(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "[^"]+"\}\/api\/[^`]+`)/g, (match) => {
            return match.replace(/`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "[^"]+"\}/, '`');
        });

        // Pattern 2: Convert "http://50.50.50.20:8080/api/..." literal to "/api/..."
        content = content.replace(/"http:\/\/50\.50\.50\.20:8080\/api\/([^"]*)"/g, '"/api/$1"');

        // Pattern 3: Fixed login page specific case if it's not a template
        content = content.replace(/"http:\/\/50\.50\.50\.10:8080\/api\/([^"]*)"/g, '"/api/$1"');

        // Pattern 4: Update the static API_URL definition in page components (like absensi/page.tsx line 6)
        content = content.replace(/const API_URL = \(process\.env\.NEXT_PUBLIC_API_URL \|\| "[^"]+"\);/g, 'const API_URL = "";');

        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log(`Converted to relative URL: ${filePath}`);
        }
    }
});
console.log("URL Conversion Done!");
