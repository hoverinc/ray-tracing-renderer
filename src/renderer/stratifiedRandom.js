// Stratified Sampling
// http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/Stratified_Sampling.html
// Repeatedly generating random numbers between [0, 1) has the effect of producing numbers that are coincidentally clustered together,
// instead of being evenly spaced across the domain.
// This produces low quality results for the path tracer since clustered numbers send too many rays in similar directions.

// We can reduce the amount of clustering of random numbers by using stratified sampling.
// This is done by partitioning [0, 1) into smaller subsets and randomly sampling from each subsets instead.

import { shuffle } from "./util";

export function makeStratifiedRandom(strataCount, dimensions) {
  const strata = [];
  const l = strataCount ** dimensions;
  for (let i = 0; i < l; i++) {
    strata[i] = i;
  }

  let index = strata.length;

  const sample = [];

  function restart() {
    index = 0;
    shuffle(strata);
  }

  function next() {
    if (index >= strata.length) {
      restart();
    }
    let stratum = strata[index++];

    for (let i = 0; i < dimensions; i++) {
      sample[i] = stratum % strataCount + Math.random();
      stratum = Math.floor(stratum / strataCount);
    }

    return sample;
  }

  return Object.freeze({
    next,
    restart,
    sample,
    strataCount
  });
}
