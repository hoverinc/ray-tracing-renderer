export function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const x = arr[i];
    arr[i] = arr[j];
    arr[j] = x;
  }
  return arr;
}

export function numberArraysEqual(a, b, eps = 1e-4) {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > eps) {
      return false;
    }
  }

  return true;
}
