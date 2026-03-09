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

        // Fix `${...}/path/"); to `${...}/path/`);
        content = content.replace(/(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/50\.50\.50\.20:8080"\}\/[^"`]*)"(\s*)\)/g, '$1`$2)');

        // Fix `${...}/path/"); in apiFetch
        content = content.replace(/(`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/50\.50\.50\.20:8080"\}\/[^"`]*)"(\s*),/g, '$1`$2,');

        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log(`Final fix for ${filePath}`);
        }
    }
});
console.log("Done!");
