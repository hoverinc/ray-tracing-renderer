import { loadExtensions } from './renderer/glUtil';
import { makeRenderingPipeline } from './renderer/RenderingPipeline';
import * as THREE from 'three';

const glRequiredExtensions = [
  'EXT_color_buffer_float', // enables rendering to float buffers
  'EXT_float_blend',
];

const glOptionalExtensions = [
  'OES_texture_float_linear', // enables gl.LINEAR texture filtering for float textures,
];

export function RayTracingRenderer(params = {}) {
  const canvas = params.canvas || document.createElement('canvas');

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    depth: true,
    stencil: false,
    antialias: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: true
  });

  loadExtensions(gl, glRequiredExtensions);
  const optionalExtensions = loadExtensions(gl, glOptionalExtensions);

  let pipeline = null;
  const size = new THREE.Vector2();
  let pixelRatio = 1;

  const module = {
    bounces: 2,
    domElement: canvas,
    maxHardwareUsage: false,
    needsUpdate: true,
    onSampleRendered: null,
    renderWhenOffFocus: true,
    renderToScreen: true,
    toneMapping: THREE.LinearToneMapping,
    toneMappingExposure: 1,
    toneMappingWhitePoint: 1,
    reprojectedSamples: 20,
    initialUniformSamples: 10,
    previewTime: 25,
    fogScale: 2000,
  };

  function initScene(scene) {
    scene.updateMatrixWorld();

    const toneMappingParams = {
      exposure: module.toneMappingExposure,
      whitePoint: module.toneMappingWhitePoint,
      toneMapping: module.toneMapping
    };

    const bounces = module.bounces;

    const renderingParams = {
      reprojectedSamples: module.reprojectedSamples,
      initialUniformSamples: module.initialUniformSamples,
      previewTime: module.previewTime,
      fogScale: module.fogScale,
      bounces: module.bounces,
    };

    pipeline = makeRenderingPipeline({gl, optionalExtensions, scene, toneMappingParams, renderingParams});

    pipeline.onSampleRendered = (...args) => {
      if (module.onSampleRendered) {
        module.onSampleRendered(...args);
      }
    };

    module.setSize(size.width, size.height);
    module.needsUpdate = false;
  }

  function restartTimer() {
    if (pipeline) {
      pipeline.restartTimer();
    }
  }

  module.setSize = (width, height, updateStyle = true) => {
    size.set(width, height);
    canvas.width = size.width * pixelRatio;
    canvas.height = size.height * pixelRatio;

    if (updateStyle) {
      canvas.style.width = `${ size.width }px`;
      canvas.style.height = `${ size.height }px`;
    }

    if (pipeline) {
      pipeline.setSize(size.width * pixelRatio, size.height * pixelRatio);
    }
  };

  module.getSize = (target) => {
    if (!target) {
      target = new THREE.Vector2();
    }

    return target.copy(size);
  };

  module.setPixelRatio = (x) => {
    if (!x) {
      return;
    }
    pixelRatio = x;
    module.setSize(size.width, size.height, false);
  };

  module.getPixelRatio = () => pixelRatio;

  module.getTotalSamplesRendered = () => {
    if (pipeline) {
      return pipeline.getTotalSamplesRendered();
    }
  };

  module.sendToScreen = () => {
    if (pipeline) {
      pipeline.hdrBufferToScreen();
    }
  };

  let lastFocus = false;
  module.render = (scene, camera) => {
    if (!module.renderWhenOffFocus) {
      const hasFocus = document.hasFocus();
      if (!hasFocus) {
        lastFocus = hasFocus;
        return;
      } else if (hasFocus && !lastFocus) {
        lastFocus = hasFocus;
        restartTimer();
      }
    }

    if (module.needsUpdate) {
      initScene(scene);
    }

    camera.updateMatrixWorld();

    if (module.renderToScreen) {
      if(module.maxHardwareUsage) {
        // render new sample for the entire screen
        pipeline.drawFull(camera);
      } else {
        // render new sample for a tiled subset of the screen
        pipeline.draw(camera);
      }

    } else {
      pipeline.drawOffscreenTile(camera);
    }
  };

  // Assume module.render is called using requestAnimationFrame.
  // This means that when the user is on a different browser tab, module.render won't be called.
  // Since the timer should not measure time when module.render is inactive,
  // the timer should be reset when the user switches browser tabs
  document.addEventListener('visibilitychange', restartTimer);

  module.dispose = () => {
    document.removeEventListener('visibilitychange', restartTimer);
    pipeline = null;
  };

  return module;
}

RayTracingRenderer.isSupported = () => {
  const gl = document.createElement('canvas')
    .getContext('webgl2', {
      failIfMajorPerformanceCaveat: true
    });

  if (!gl) {
    return false;
  }

  const extensions = loadExtensions(gl, glRequiredExtensions);
  for (let e in extensions) {
    if (!extensions[e]) {
      return false;
    }
  }

  return true;
};
