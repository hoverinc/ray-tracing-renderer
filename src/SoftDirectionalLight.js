import { DirectionalLight }  from 'three';

export class SoftDirectionalLight extends DirectionalLight {
  constructor(color, intensity, softness = 0) {
    super(color, intensity);
    this.softness = softness;
  }

  copy(source) {
    super.copy(source);
    this.softness = source.softness;
  }
}
