import { Light }  from 'three';

export class EnvironmentLight extends Light {
  constructor(map, ...args) {
    super(...args);
    this.map = map;
    this.isEnvironmentLight = true;
  }

  copy(source) {
    super.copy(source);
    this.map = source.map;
  }
}
