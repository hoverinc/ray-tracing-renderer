import { Light }  from 'three';

export class EnvironmentLight extends Light {
  constructor(map, rotate180 = false, ...args) {
    super(...args);
    this.map = map;
    this.rotate180 = rotate180;
  }

  copy(source) {
    super.copy(source);
    this.map = source.map;
    this.rotate180 = source.rotate180;
  }
}
