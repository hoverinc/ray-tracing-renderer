import { Light }  from 'three';

export class EnvironmentLight extends Light {
  constructor(map, ...args) {
    super(...args);
    this.map = map;
  }

  copy(source) {
    super.copy(source);
    this.map = source.map;
  }
}
