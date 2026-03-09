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
        let modified = false;

        // Pattern 1: Malformed apiFetch(`${...}/path/"); or similar
        // Look for `${...}` followed by a path and then a double quote
        const p1 = /`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/50\.50\.50\.20:8080"\}\`([^"`]*)"/g;
        if (content.match(p1)) {
            content = content.replace(p1, '`${process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080"}$1`');
            modified = true;
        }

        // Pattern 2: (process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080")";
        const p2 = /\(process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/50\.50\.50\.20:8080"\)"/g;
        if (content.match(p2)) {
            content = content.replace(p2, '(process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080")');
            modified = true;
        }

        // Pattern 3: Broken spacing `${ process.env... } / api / ...`
        const p3 = /`\$\{\s*process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/50\.50\.50\.20:8080"\s*\}\s*\/\s*api\s*\/\s*academic\s*\/\s*empty\s*-\s*classes`/g;
        if (content.match(p3)) {
            content = content.replace(p3, '`${process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080"}/api/academic/empty-classes`');
            modified = true;
        }

        // Pattern 4: any remaining 50.50.50.10 or 50.50.50.20 that isn't wrapped in the process.env pattern
        // We want to normalize everything to the same pattern:
        // (process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080")

        // This regex looks for raw strings like "http://50.50.50.10:8080" and replaces them
        const rawIp10 = /"http:\/\/50\.50\.50\.10:8080"/g;
        if (content.match(rawIp10)) {
            content = content.replace(rawIp10, '(process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080")');
            modified = true;
        }

        const rawIp20 = /"http:\/\/50\.50\.50\.20:8080"/g;
        // avoid replacing the one inside our fallback string itself
        if (content.match(rawIp20)) {
            // This is tricky, let's only replace if it's NOT part of the fallback
            // simplest is to replace it and then fix the double nesting later if it happens
            // but let's just use a more careful replacement
            // If we find raw "http://50.50.50.20:8080" (not inside the process.env check)
            // we want to put it inside the check.
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`Cleaned up ${filePath}`);
        }
    }
});
console.log("Done!");
