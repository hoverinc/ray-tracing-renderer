import * as constants from './constants';
import { LensCamera } from './LensCamera';
import { SoftDirectionalLight } from './SoftDirectionalLight';
import { EnvironmentLight } from './EnvironmentLight';
import { RayTracingMaterial } from './RayTracingMaterial';
import { RayTracingRenderer } from './RayTracingRenderer';

/* global THREE */
if (THREE) {
  THREE.LensCamera = LensCamera;
  THREE.SoftDirectionalLight = SoftDirectionalLight;
  THREE.EnvironmentLight = EnvironmentLight;
  THREE.RayTracingMaterial = RayTracingMaterial;
  THREE.RayTracingRenderer = RayTracingRenderer;
  THREE.ThickMaterial = constants.ThickMaterial;
  THREE.ThinMaterial = constants.ThinMaterial;
}

export {
  constants,
  LensCamera,
  SoftDirectionalLight,
  EnvironmentLight,
  RayTracingMaterial,
  RayTracingRenderer,
};
