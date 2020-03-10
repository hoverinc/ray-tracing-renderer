import { clamp } from './util';
import { Vector2 } from 'three';

export function makeRenderSize(gl) {
  const desiredMsPerFrame = 20;

  let fullWidth;
  let fullHeight;

  let renderWidth;
  let renderHeight;
  let scale = new Vector2(1, 1);

  let pixelsPerFrame = pixelsPerFrameEstimate(gl);

  function setSize(w, h) {
    fullWidth = w;
    fullHeight = h;
    calcDimensions();
  }

  function calcDimensions() {
    const aspectRatio = fullWidth / fullHeight;
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

    pixelsPerFrame += strength * error;
    pixelsPerFrame = clamp(pixelsPerFrame, 8192, fullWidth * fullHeight);
    calcDimensions();
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
