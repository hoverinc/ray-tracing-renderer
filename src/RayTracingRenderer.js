import { loadExtensions } from './renderer/glUtil';
import { makeSceneSampler } from './renderer/sceneSampler';
import * as THREE from 'three';

const glRequiredExtensions = [
  'EXT_color_buffer_float', // enables rendering to float buffers
];

const glOptionalExtensions = [
  'OES_texture_float_linear', // enables gl.LINEAR texture filtering for float textures,
];

function RayTracingRenderer(params = {}) {
  const canvas = params.canvas || document.createElement('canvas');

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: true
  });
  loadExtensions(gl, glRequiredExtensions);
  const optionalExtensions = loadExtensions(gl, glOptionalExtensions);

  // private properties
  let sceneSampler = null;
  const size = new THREE.Vector2();
  let renderTime = 22;
  let pixelRatio = 1;

  const module = {
    bounces: 3,
    domElement: canvas,
    maxHardwareUsage: false,
    needsUpdate: true,
    onSampleRendered: null,
    renderWhenOffFocus: true,
    renderToScreen: true,
    toneMapping: THREE.LinearToneMapping,
    toneMappingExposure: 1,
    toneMappingWhitePoint: 1,
  };

  function initScene(scene) {
    scene.updateMatrixWorld();

    const toneMappingParams = {
      exposure: module.toneMappingExposure,
      whitePoint: module.toneMappingWhitePoint,
      toneMapping: module.toneMapping
    };

    const bounces = module.bounces;

    sceneSampler = makeSceneSampler({gl, optionalExtensions, scene, toneMappingParams, bounces});

    sceneSampler.onSampleRendered = (...args) => {
      if (module.onSampleRendered) {
        module.onSampleRendered(...args);
      }
    };

    module.setRenderTime(renderTime);
    module.setSize(size.width, size.height);
    module.needsUpdate = false;
  }

  function restartTimer() {
    if (sceneSampler) {
      sceneSampler.restartTimer();
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

    if (sceneSampler) {
      sceneSampler.setSize(size.width * pixelRatio, size.height * pixelRatio);
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

  module.setRenderTime = (time) => {
    renderTime = time;
    if (sceneSampler) {
      sceneSampler.setRenderTime(time);
    }
  };

  module.getRenderTime = () => {
    return renderTime;
  };

  module.getTotalSamplesRendered = () => {
    if (sceneSampler) {
      return sceneSampler.getTotalSamplesRendered();
    }
  };

  module.sendToScreen = () => {
    if (sceneSampler) {
      sceneSampler.hdrBufferToScreen();
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
        sceneSampler.drawFull(camera);
      } else {
        // render new sample for a tiled subset of the screen
        sceneSampler.drawTile(camera);
      }

    } else {
      sceneSampler.drawOffscreenTile(camera);
    }
  };

  // Assume module.render is called using requestAnimationFrame.
  // This means that when the user is on a different browser tab, module.render won't be called.
  // Since the timer should not measure time when module.render is inactive,
  // the timer should be reset when the user switches browser tabs
  document.addEventListener('visibilitychange', restartTimer);

  module.dispose = () => {
    document.removeEventListener('visibilitychange', restartTimer);
    sceneSampler = false;
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

export { RayTracingRenderer };
