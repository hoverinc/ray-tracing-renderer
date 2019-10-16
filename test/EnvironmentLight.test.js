import { EnvironmentLight } from 'src/EnvironmentLight';
import * as THREE from 'three';

describe('constructor', () => {
  let light;
  beforeEach(() => {
    light = new EnvironmentLight();
  });

  test('extends from the "Light" object', () => {
    expect(light instanceof THREE.Light).toBe(true);
  });

  test('initializes "map" with the parameter provided', () => {
    expect(light.map).toBe(undefined);
    expect(new EnvironmentLight(5).map).toBe(5);
  });

  test('initializes "color" and "intensity" of the base class', () => {
    const lightWithParams = new EnvironmentLight(null, 0x555555, 0.5);
    expect(lightWithParams.color.getHex()).toBe(0x555555);
    expect(lightWithParams.intensity).toBe(0.5);
  });

  test('creates an instance where "isEnvironmentLight == true"', () => {
    expect(light.isEnvironmentLight).toBe(true);
  });
});
