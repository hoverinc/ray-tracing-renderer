import { DirectionalLight }  from 'three';

export class SoftDirectionalLight extends DirectionalLight {
  constructor(light, intensity, softness = 0) {
    super(light, intensity);
    this.softness = softness;
  }

  copy(source) {
    super.copy(source);
    this.softness = source.softness;
  }
}
