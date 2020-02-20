import { clamp } from './util';

// TileRender is based on the concept of a compute shader's work group.

// Sampling the scene with the RayTracingRenderer can be very slow (<1 fps).
// This overworks the GPU and tends to lock up the OS, making it unresponsive.

// To fix this, we can split the screen into smaller tiles, and sample the scene one tile at a time
// The tile size is set such that each tile takes approximatly a constant amount of time to render.

// Since the render time of a tile is dependent on the device, we find the desired tile dimensions by measuring
// the time it takes to render an arbitrarily-set tile size and adjusting the size according to the benchmark.

export function makeTileRender(gl) {
  let currentTile = -1;
  let numTiles = 1;
  let tileWidth;
  let tileHeight;
  let columns;
  let rows;

  let width = 0;
  let height = 0;

  // initial number of pixels per rendered tile
  // based on correlation between system performance and max supported render buffer size
  // adjusted dynamically according to system performance
  let pixelsPerTile = pixelsPerTileEstimate(gl);

  let desiredTimePerTile = 20;

  let lastTime = 0;
  let timeElapsed = 0;

  function updateTime(time) {
    if (lastTime) {
      timeElapsed = time - lastTime;
    }

    lastTime = time;
  }

  function reset() {
    currentTile = -1;
    timeElapsed = 0;
    lastTime = 0;
  }

  function setSize(w, h) {
    width = w;
    height = h;
    reset();
  }

  function setTileDimensions(pixelsPerTile) {
    const aspectRatio = width / height;

    // quantize the width of the tile so that it evenly divides the entire window
    tileWidth = Math.ceil(width / Math.round(width / Math.sqrt(pixelsPerTile * aspectRatio)));
    tileHeight = Math.ceil(tileWidth / aspectRatio);

    columns = Math.ceil(width / tileWidth);
    rows = Math.ceil(height / tileHeight);
    numTiles = columns * rows;
  }

  function initTiles() {
    if (timeElapsed) {
      const timePerTile = timeElapsed / numTiles;

      const expAvg = 0.5;

      const newPixelsPerTile = pixelsPerTile * desiredTimePerTile / timePerTile;
      pixelsPerTile = expAvg * pixelsPerTile + (1 - expAvg) * newPixelsPerTile;
    }

    pixelsPerTile = clamp(pixelsPerTile, 8192, width * height);

    setTileDimensions(pixelsPerTile);
  }

  function nextTile() {
    currentTile++;

    if (currentTile % numTiles === 0) {
      initTiles();
      currentTile = 0;
      timeElapsed = 0;
    }

    const isLastTile = currentTile === numTiles - 1;
    if (isLastTile) {
      requestAnimationFrame(updateTime);
    }

    const x = currentTile % columns;
    const y = Math.floor(currentTile / columns) % rows;

    return {
      x: x * tileWidth,
      y: y * tileHeight,
      tileWidth,
      tileHeight,
      isFirstTile: currentTile === 0,
      isLastTile,
    };
  }

  return {
    nextTile,
    reset,
    setSize,
  };
}

function pixelsPerTileEstimate(gl) {
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

  if (maxRenderbufferSize <= 8192) {
    return 200000;
  } else if (maxRenderbufferSize === 16384) {
    return 400000;
  } else if (maxRenderbufferSize >= 32768) {
    return 600000;
  }
}
