import * as constants from './constants';
import { LensCamera } from './LensCamera';
import { SoftDirectionalLight } from './SoftDirectionalLight';
import { EnvironmentLight } from './EnvironmentLight';
import { RayTracingMaterial } from './RayTracingMaterial';
import { RayTracingRenderer } from './RayTracingRenderer';

if (window.THREE) {
  /* global THREE */
  THREE.LensCamera = LensCamera;
  THREE.SoftDirectionalLight = SoftDirectionalLight;
  THREE.EnvironmentLight = EnvironmentLight;
  THREE.RayTracingMaterial = RayTracingMaterial;
  THREE.RayTracingRenderer = RayTracingRenderer;
  THREE.ThickMaterial = constants.ThickMaterial;
  THREE.ThinMaterial = constants.ThinMaterial;
  THREE.MinimumRayTracingPerformance = constants.MinimumPerformance;
  THREE.OkRayTracingPerformance = constants.OkPerformance;
  THREE.GoodRayTracingPerformance = constants.GoodPerformance;
  THREE.ExcellentRayTracingPerformance = constants.ExcellentPerformance;
  THREE.DynamicRayTracingPerformance = constants.DynamicPerformance;
}

export {
  constants,
  LensCamera,
  SoftDirectionalLight,
  EnvironmentLight,
  RayTracingMaterial,
  RayTracingRenderer,
};
