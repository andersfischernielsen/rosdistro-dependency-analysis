"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = require("js-yaml");
const shuffle = function (xs) {
    if (Array.isArray(xs)) {
        var res = xs.slice();
        for (var i = res.length - 1; i >= 0; i--) {
            var n = Math.floor(Math.random() * i);
            var t = res[i];
            res[i] = res[n];
            res[n] = t;
        }
        return res;
    }
    else {
        throw new TypeError('Input parameter must be an Array.');
    }
};
const previousSample = fs_1.default.existsSync('results/sample_urls.json')
    ? JSON.parse(fs_1.default.readFileSync('results/sample_urls.json').toString())
    : undefined;
const previousURLs = previousSample.map((o) => Object.keys(o)[0]);
const positives = js_yaml_1.safeLoad(fs_1.default.readFileSync('results/positives.yaml').toString());
const negatives = js_yaml_1.safeLoad(fs_1.default.readFileSync('results/negatives.yaml').toString());
const positivesWithoutPrevious = positives.filter((i) => !previousURLs.some((p) => p === i.html_url));
const negativesWithoutPrevious = negatives.filter((i) => !previousURLs.some((p) => p === i.html_url));
const positivesShuffled = shuffle(positivesWithoutPrevious);
const negativesShuffled = shuffle(negativesWithoutPrevious);
const sampleSize = +process.argv[2];
console.info(`Sampling with size: ${sampleSize}`);
const positiveSample = positivesShuffled.slice(0, sampleSize);
const negativeSample = negativesShuffled.slice(0, sampleSize);
const positiveURLs = positiveSample.map((i) => i.html_url);
const negativeURLs = negativeSample.map((i) => i.html_url);
fs_1.default.writeFileSync('results/positives_sample.yaml', js_yaml_1.safeDump(positiveSample));
fs_1.default.writeFileSync('results/negatives_sample.yaml', js_yaml_1.safeDump(negativeSample));
const positivesMapped = positiveURLs.map((p) => {
    const u = {};
    u[p] = 'P';
    return u;
});
const negativesMapped = negativeURLs.map((n) => {
    const u = {};
    u[n] = 'N';
    return u;
});
const combinedURLs = positivesMapped.concat(negativesMapped);
const shuffled = shuffle(combinedURLs);
const asMap = Object.assign({}, ...shuffled);
fs_1.default.writeFileSync('results/sample_urls.json', JSON.stringify(asMap));
//# sourceMappingURL=Sample.js.map