// Stratified Sampling
// http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/Stratified_Sampling.html
// It is computationally unfeasible to compute stratified sampling for large dimensions (>2)
// Instead, we can compute stratified sampling for lower dimensional patterns that sum to the high dimension
// e.g. instead of sampling a 6D domain, we sample a 2D + 2D + 2D domain.
// This reaps most of the benifits of stratification while still remaining computable in a reasonable amount of time

import { makeStratifiedRandom } from "./stratifiedRandom";

export function makeStratifiedRandomCombined(strataCount, listOfDimensions) {
  const strataObjs = [];

  for (const dim of listOfDimensions) {
    strataObjs.push(makeStratifiedRandom(strataCount, dim));
  }

  const combined = [];

  function next() {
    let i = 0;

    for (const strata of strataObjs) {
      const nums = strata.next();

      for (const num of nums) {
        combined[i++] = num;
      }
    }

    return combined;
  }

  function restart() {
    for (const strata of strataObjs) {
      strata.restart();
    }
  }

  return Object.freeze({
    next,
    restart,
    strataCount
  });
}
