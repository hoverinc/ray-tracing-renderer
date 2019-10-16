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
    expect(new EnvironmentLight().map).toBe(undefined);
    expect(new EnvironmentLight(5).map).toBe(5);
  });

  test('creates en instance where "isEnvironmentLight=true"', () => {
    expect(light.isEnvironmentLight).toBe(true);
  });
});
