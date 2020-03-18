import { clamp } from './util';
import { Vector2 } from 'three';
import { MinimumRayTracingPerformance, OkRayTracingPerformance, GoodRayTracingPerformance, ExcellentRayTracingPerformance, DynamicRayTracingPerformance } from '../constants';

export function makeRenderSize(gl, performanceLevel, debugOutput) {
  const desiredMsPerFrame = 20;
  const performanceDebugOutput = debugOutput;
  let fullWidth;
  let fullHeight;
  let aspectRatio;
  let overridePixelsPerFrame = pixelsPerFrameFromPerformanceLevel(performanceLevel);

  let renderWidth;
  let renderHeight;
  let scale = new Vector2(1, 1);

  let pixelsPerFrame = overridePixelsPerFrame ? overridePixelsPerFrame : pixelsPerFrameEstimate(gl);

  function setSize(w, h) {
    fullWidth = w;
    fullHeight = h;
    calcDimensions();
  }

  function calcDimensions() {
    aspectRatio = fullWidth / fullHeight;
    renderWidth = Math.round(clamp(Math.sqrt(pixelsPerFrame * aspectRatio), 1, fullWidth));
    renderHeight = Math.round(clamp(renderWidth / aspectRatio, 1, fullHeight));
    scale.set(renderWidth / fullWidth, renderHeight / fullHeight);
  }

  function adjustSize(elapsedFrameMs) {
    if (!elapsedFrameMs) {
      return;
    }

     // tweak to find balance. higher = faster convergence, lower = less fluctuations to microstutters
    const strength = 600;

    const error = desiredMsPerFrame - elapsedFrameMs;

    let tempPixPerFrame = pixelsPerFrame;
    tempPixPerFrame += strength * error;
    tempPixPerFrame = clamp(tempPixPerFrame, 8192, fullWidth * fullHeight);
    if(!overridePixelsPerFrame) {
      pixelsPerFrame = tempPixPerFrame;
      calcDimensions();
    }
    // pixelsPerFrame += strength * error;
    // pixelsPerFrame = clamp(pixelsPerFrame, 8192, fullWidth * fullHeight);
  }

  return {
    adjustSize,
    setSize,
    scale,
    get width() {
      return renderWidth;
    },
    get height() {
      return renderHeight;
    }
  };
}

function pixelsPerFrameFromPerformanceLevel(performanceLevel) {
  switch (performanceLevel) {
    case MinimumRayTracingPerformance:
      return 20000;
    case OkRayTracingPerformance:
      return 50000;
    case GoodRayTracingPerformance:
      return 80000;
    case ExcellentRayTracingPerformance:
      return 1000000;
    case DynamicRayTracingPerformance:
      return null;
  }
}

function pixelsPerFrameEstimate(gl) {
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

  if (maxRenderbufferSize <= 8192) {
    return 80000;
  } else if (maxRenderbufferSize === 16384) {
    return 150000;
  } else if (maxRenderbufferSize >= 32768) {
    return 400000;
  }
}
