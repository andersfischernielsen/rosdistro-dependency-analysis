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
  } else if (typeof xs === 'object') {
    var weights = Object.keys(xs).reduce(function(acc, key) {
      acc[key] = xs[key];
      return acc;
    }, {});

    var ret = [];

    while (Object.keys(weights).length > 0) {
      var key = exports.pick(weights);
      delete weights[key];
      ret.push(key);
    }
    return ret;
  } else {
    throw new TypeError('Must be an Array or an object');
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

const positiveSample = positivesShuffled.slice(0, 50);
const negativeSample = negativesShuffled.slice(0, 50);

fs.writeFileSync('results/positives_sample.yaml', safeDump(positiveSample));
fs.writeFileSync('results/negatives_sample.yaml', safeDump(negativeSample));
