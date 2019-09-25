// Reorders the elements in the range [first, last) in such a way that
// all elements for which the comparator c returns true
// precede the elements for which comparator c returns false.
export function partition(array, compare, left = 0, right = array.length) {
  while (left !== right) {
    while (compare(array[left])) {
      left++;
      if (left === right) {
        return left;
      }
    }
    do {
      right--;
      if (left === right) {
        return left;
      }
    } while (!compare(array[right]));

    swap(array, left, right);
    left++;
  }

  return left;
}

// nth_element is a partial sorting algorithm that rearranges elements in [first, last) such that:
// The element pointed at by nth is changed to whatever element would occur in that position if [first, last) were sorted.
// All of the elements before this new nth element compare to true with elements after the nth element
export function nthElement(array, compare, left = 0, right = array.length, k = Math.floor((left + right) / 2)) {
  for (let i = left; i <= k; i++) {
    let minIndex = i;
    let minValue = array[i];
    for (let j = i + 1; j < right; j++) {
      if (!compare(minValue, array[j])) {
        minIndex = j;
        minValue = array[j];
        swap(array, i, minIndex);
      }
    }
  }
}

function swap(array, a, b) {
  const x = array[b];
  array[b] = array[a];
  array[a] = x;
}
