import { PerspectiveCamera }  from 'three';

export class LensCamera extends PerspectiveCamera {
  constructor(...args) {
    super(...args);
    this.aperture = 0.01;
  }

  copy(source, recursive) {
    super.copy(source, recursive);
    this.aperture = source.aperture;
  }
}
