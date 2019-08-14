import { DirectionalLight }  from 'three';

export class SoftDirectionalLight extends DirectionalLight {
  constructor(...args) {
    super(...args);
    this.softness = 0.0;
  }

  copy(source) {
    super.copy(source);
    this.softness = source.softness;
  }
}
