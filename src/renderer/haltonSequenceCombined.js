import { makeHaltonSequence } from "./haltonSequence";

export function makeHaltonSequenceCombined(dimensions) {
  const sequence = [];
  const combined = [];

  for (let i = 0; i < dimensions; i++) {
    sequence.push(makeHaltonSequence(i));
    combined.push(0);
  }

  return {
    combined,
    next() {
      for (let i = 0; i < dimensions; i++) {
        combined[i] = sequence[i].next();
      }

      return combined;
    },
    restart() {
      for (let i = 0; i < dimensions; i++) {
        sequence[i].restart();
      }
    }
  };
}