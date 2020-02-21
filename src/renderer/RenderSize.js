import { clamp } from './util';
import { Vector2 } from 'three';

export function makeRenderSize(gl, timePerFrame = 21) {
  let fullWidth;
  let fullHeight;

  let renderWidth;
  let renderHeight;

  let pixelsPerFrame = pixelsPerFrameEstimate(gl);
  let maxPixelsPerFrame;

  let scale = new Vector2(1, 1);

  function setSize(w, h) {
    fullWidth = w;
    fullHeight = h;
    maxPixelsPerFrame = w * h;
    calcSize();
  }

  function calcSize() {
    const aspectRatio = fullWidth / fullHeight;
    renderWidth = Math.round(clamp(Math.sqrt(pixelsPerFrame * aspectRatio), 1, fullWidth));
    renderHeight = Math.round(clamp(renderWidth / aspectRatio, 1, fullHeight));
    scale.set(renderWidth / fullWidth, renderHeight / fullHeight);
  }

  let lastTime;

  function onBenchmark(time) {
    const elapsed = time - lastTime;
    const pixelsPerTime = renderWidth * renderHeight / elapsed;

    const expAvg = 0.99999;
    pixelsPerFrame = expAvg * pixelsPerFrame + (1 - expAvg) * timePerFrame * pixelsPerTime;
    pixelsPerFrame = clamp(timePerFrame * pixelsPerTime, 2048, maxPixelsPerFrame);
  }

  function benchmark() {
    lastTime = performance.now();
    requestAnimationFrame(onBenchmark);
  }

  return {
    benchmark,
    calcSize,
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
    return 100000;
  } else if (maxRenderbufferSize === 16384) {
    return 200000;
  } else if (maxRenderbufferSize >= 32768) {
    return 300000;
  }
}
