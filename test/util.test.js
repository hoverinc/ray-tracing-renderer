import { clamp, shuffle } from 'src/renderer/util';

describe('clamp', () => {

  test('returns a number between [min, max]', () => {
    expect(clamp(10, 0, 5)).toBe(5);
    expect(clamp(-10, 0, 5)).toBe(0);
    expect(clamp(3, 0, 5)).toBe(3);
  });

  test('is able to use infinity as bounds', () => {
    expect(clamp(Infinity, 0, 5)).toBe(5);
    expect(clamp(-Infinity, 0, 5)).toBe(0);
    expect(clamp(100, -Infinity, Infinity)).toBe(100);
  });
});

describe('shuffle', () => {
  let arr;

  beforeEach(() => {
    arr = [1, 2, 3, 4, 5];
  });

  test('shuffles array without adding or removing elements', () => {
    const shuffledArr = [...arr];
    shuffle(shuffledArr);
    expect(shuffledArr).toHaveLength(arr.length);
    expect(shuffledArr).toEqual(expect.arrayContaining(arr));
    expect(arr).toEqual(expect.arrayContaining(shuffledArr));
  });

  test('shuffles array in-place', () => {
    const shuffledArr = shuffle(arr);
    expect(shuffledArr).toBe(arr);
  });
});
