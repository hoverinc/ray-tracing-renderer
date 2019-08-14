import { equirectangularToSpherical } from 'src/renderer/envMapCreation';

describe('equirectangularToSpherical', () => {
  let oddWidth, oddHeight, evenWidth, evenHeight;
  beforeEach(() => {
    oddWidth = 11;
    evenWidth = 10;
    oddHeight = 11;
    evenHeight = 10;
  });
  test('converts center of map to theta = PI and phi = PI/2', () => {
    let coords = equirectangularToSpherical(oddWidth / 2, oddHeight / 2, oddWidth, oddHeight);
    expect(coords.theta).toBeCloseTo(Math.PI);
    expect(coords.phi).toBeCloseTo(Math.PI / 2);
    coords = equirectangularToSpherical(evenWidth / 2, evenHeight / 2, evenWidth, evenHeight);
    expect(coords.theta).toBeCloseTo(Math.PI);
    expect(coords.phi).toBeCloseTo(Math.PI / 2);
  });
  test('converts lower left corner of map to theta = 0 and phi = 0', () => {
    let coords = equirectangularToSpherical(0, 0, oddWidth, oddHeight);
    expect(coords.theta).toBeCloseTo(0);
    expect(coords.phi).toBeCloseTo(0);
    coords = equirectangularToSpherical(0, 0, evenWidth, evenHeight);
    expect(coords.theta).toBeCloseTo(0);
    expect(coords.phi).toBeCloseTo(0);
  });
});
