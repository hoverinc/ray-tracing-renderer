/*
Halton Sampler
http://www.pbr-book.org/3ed-2018/Sampling_and_Reconstruction/The_Halton_Sampler.html

This method of sampling is an alternative to Stratified sampling.
It converges faster than stratified sampling, but provides less ray-coherence when used on the GPU.

In the current state of the renderer, stratified sampling performs better in practice,
but Halton sampling will be useful once we move to denoising.
*/

import { shuffle } from './util';

// precomputed prime numbers used as the base for each dimension of the Halton sequence
const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509];

export function makeHaltonSequence(dimensionIndex) {
  if (dimensionIndex >= primes.length) {
    throw 'Halton sequence dimension bigger than max supported dimension';
  }

  const base = primes[dimensionIndex];
  const invBase = 1 / base;
  const permutation = [];

  for (let i = 0; i < base; i++) {
    permutation.push(i);
  }

  shuffle(permutation);

  let index = 1;

  return {
    next() {
      let reversedDigits = 0;
      let invBaseN = 1;
      let i = index;

      while (i) {
        const next = Math.floor(i / base);
        const digit = i - next * base;
        reversedDigits = reversedDigits * base + permutation[digit];
        invBaseN *= invBase;
        i = next;
      }

      index++;

      return invBaseN * (reversedDigits + invBase * permutation[0] / (1 - invBase));
    },
    restart() {
      index = 1;
    }
  };
}