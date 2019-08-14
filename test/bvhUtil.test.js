import { partition, nthElement } from 'src/renderer/bvhUtil';

describe('partition', () => {

  const compare = x => x < 5;

  test(
    'reorders the elements in the range [start, end) in such a way that\n' +
    'all elements for which the comparator f returns true\n' +
    'precede the elements for which comparator f returns false', () => {

    const arr = [6, 2, 7, 7, 2, 3, 6, 8, 1, 2, 1, 5, 2];

    const start = 1;
    const end = arr.length - 1;

    // the index to the first element of the section partition
    const indexFalsePartition = partition(arr, compare, start, end);

    for (let i = start; i < end; i++) {
      if (i < indexFalsePartition) {
        expect(compare(arr[i])).toBe(true);
      } else {
        expect(compare(arr[i])).toBe(false);
      }
    }

  });

  test('reorders entire array by default', () => {
    const arr = [5, 1, 2, 3, 8, 1];

    const indexFalsePartition = partition(arr, compare);

    for (let i = 0; i < arr.length; i++) {
      if (i < indexFalsePartition) {
        expect(compare(arr[i])).toBe(true);
      } else {
        expect(compare(arr[i])).toBe(false);
      }
    }
  });
});

describe('nthElement', () => {

  const compare = (a, b) => a <= b;
  const sortCompare = (a, b) => a <= b ? -1 : 1;

  test(
    'partially sorts between [first, last) such that\n' +
    'the element pointed at by nth is changed to whatever element would occur in that position if [first, last) were sorted\n' +
    'and all of the elements before this new nth element are less than or equal to the elements after the new nth element', () => {

    const arr = [6, 2, 5, 7, 2, 3, 6, 8, 1, 2, 1, 5, 2];

    const start = 1;
    const end = arr.length - 1;
    const nth = 5;

    const sortedArr = arr.slice(start, end).sort(sortCompare);

    nthElement(arr, compare, start, end, nth);

    expect(arr[nth]).toBe(sortedArr[nth - start]);

    for (let i = start; i < nth; i++) {
      for (let j = nth; j < end; j++) {
        expect(compare(arr[i], arr[j])).toBe(true);
      }
    }
  });

  test('partially sorts entire array with nth = floor(start + end) / 2 by default', () => {
    const arr = [10, 2, 7, 8, 3, 1, 3];

    const nth = Math.floor(arr.length / 2);

    const sortedArr = arr.slice().sort(sortCompare);

    nthElement(arr, compare);

    expect(arr[nth]).toBe(sortedArr[nth]);

    for (let i = 0; i < nth; i++) {
      for (let j = nth; j < arr.length; j++) {
        expect(compare(arr[i], arr[j])).toBe(true);
      }
    }
  });
});
