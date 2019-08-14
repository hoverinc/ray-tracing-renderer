// Stratified Sampling
// http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/Stratified_Sampling.html
// Repeatedly generating random numbers between [0, 1) has the effect of producing numbers that are coincidentally clustered together,
// instead of being evenly spaced across the domain.
// This produces low quality results for the path tracer since clustered numbers send too many rays in similar directions.

// We can reduce the amount of clustering of random numbers by using stratified sampling.
// This is done by partitioning [0, 1) into smaller subsets and randomly sampling from each subsets instead.

import { shuffle } from "./util";

export function makeStratifiedRandom(strataCount, dimensions) {
  const samples = [];
  const l = strataCount ** dimensions;
  for (let i = 0; i < l; i++) {
    samples[i] = i;
  }

  let index = samples.length;

  const randomNums = [];

  function reset() {
    index = 0;
    shuffle(samples);
  }

  function next() {
    if (index >= samples.length) {
      reset();
    }
    let sample = samples[index++];

    for (let i = 0; i < dimensions; i++) {
      randomNums[i] = (sample % strataCount) / strataCount;
      sample = Math.floor(sample / strataCount);
    }

    return randomNums;
  }

  return Object.freeze({
    reset,
    next,
    strataCount
  });
}
