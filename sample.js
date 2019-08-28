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
const positives = js_yaml_1.safeLoad(fs_1.default.readFileSync('results/positives.yaml').toString());
const negatives = js_yaml_1.safeLoad(fs_1.default.readFileSync('results/negatives.yaml').toString());
const positivesShuffled = shuffle(positives);
const negativesShuffled = shuffle(negatives);
const sampleSize = +process.argv[2];
console.info(`Sampling with size: ${sampleSize}`);
const positiveSample = positivesShuffled.slice(0, sampleSize);
const negativeSample = negativesShuffled.slice(0, sampleSize);
const positiveURLs = positiveSample.map((i) => i.html_url);
const negativeURLs = negativeSample.map((i) => i.html_url);
fs_1.default.writeFileSync('results/positives_sample.yaml', js_yaml_1.safeDump(positiveSample));
fs_1.default.writeFileSync('results/negatives_sample.yaml', js_yaml_1.safeDump(negativeSample));
const positivesMapped = positiveURLs.map((p) => {
    return { url: 'P' };
});
const negativesMapped = negativeURLs.map((n) => {
    return { url: 'N' };
});
const combinedURLs = positivesMapped.concat(negativesMapped);
const asDict = shuffle(combinedURLs);
fs_1.default.writeFileSync('results/sample_urls.json', JSON.stringify(asDict));
//# sourceMappingURL=Sample.js.map