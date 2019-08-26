import fs from 'fs';
import { safeLoad, safeDump } from 'js-yaml';

const shuffle = function(xs: any[]) {
  if (Array.isArray(xs)) {
    var res = xs.slice();
    for (var i = res.length - 1; i >= 0; i--) {
      var n = Math.floor(Math.random() * i);
      var t = res[i];
      res[i] = res[n];
      res[n] = t;
    }
    return res;
  } else {
    throw new TypeError('Input parameter must be an Array.');
  }
};

const positives = safeLoad(
  fs.readFileSync('results/positives.yaml').toString(),
);
const negatives = safeLoad(
  fs.readFileSync('results/negatives.yaml').toString(),
);

const positivesShuffled = shuffle(positives);
const negativesShuffled = shuffle(negatives);

const sampleSize = +process.argv[2];
console.info(`Sampling with size: ${sampleSize}`);
const positiveSample = positivesShuffled.slice(0, sampleSize);
const negativeSample = negativesShuffled.slice(0, sampleSize);

const positiveURLs = positiveSample.map((i) => i.html_url);
const negativeURLs = negativeSample.map((i) => i.html_url);

fs.writeFileSync('results/positives_sample.yaml', safeDump(positiveSample));
fs.writeFileSync('results/negatives_sample.yaml', safeDump(negativeSample));

const positivesMapped = positiveURLs.map((p) => {
  return { url: 'P' };
});
const negativesMapped = negativeURLs.map((n) => {
  return { url: 'N' };
});

const combinedURLs = positivesMapped.concat(negativesMapped);
const asDict = shuffle(combinedURLs);

fs.writeFileSync('results/sample_urls.json', JSON.stringify(asDict));
