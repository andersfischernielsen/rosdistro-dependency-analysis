const fs = require('fs');
const urls = JSON.parse(fs.readFileSync("bug-urls.json"))
const mapped = JSON.parse(fs.readFileSync("sample_urls.json"))

for (let i = 0; i < urls.bugs.length; i++) {
    const current = urls.bugs[i];
    console.log(`${mapped[current]}`);
}