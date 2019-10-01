const fs = require('fs');
const process = require('process');
const yaml = require('js-yaml');

const pos = new Set(yaml.safeLoad(fs.readFileSync('results/positives.yaml')).map(i => i.html_url))
const neg = new Set(yaml.safeLoad(fs.readFileSync('results/negatives.yaml')).map(i => i.html_url))
const toCheck = fs.readFileSync(process.argv[2]).toString().split(/\r?\n/);
for (let i = 0; i < toCheck.length - 1; i++) {
    console.log(toCheck[i])
    if (pos.has(toCheck[i])) console.log("Y")
    else if (neg.has(toCheck[i])) console.log("N")
}