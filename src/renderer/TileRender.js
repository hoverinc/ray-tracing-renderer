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

  let firstTileTime = 0;

  let width = 0;
  let height = 0;

  // initial number of pixels per rendered tile
  // based on correlation between system performance and max supported render buffer size
  // adjusted dynamically according to system performance
  let pixelsPerTile = pixelsPerTileEstimate(gl);

  let pixelsPerTileQuantized = pixelsPerTile;

  let desiredTimePerTile = 20;

  let timePerPixel = desiredTimePerTile / pixelsPerTile;

  function reset() {
    currentTile = -1;
    firstTileTime = 0;
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
    pixelsPerTileQuantized = tileWidth * tileHeight;

    columns = Math.ceil(width / tileWidth);
    rows = Math.ceil(height / tileHeight);
    numTiles = columns * rows;
  }

  function initTiles() {
    if (firstTileTime) {
      const timeElapsed = Date.now() - firstTileTime;
      const timePerTile = timeElapsed / numTiles;

      const expAvg = 0.5;

      const newPixelsPerTile = pixelsPerTile * desiredTimePerTile / timePerTile;
      pixelsPerTile = expAvg * pixelsPerTile + (1 - expAvg) * newPixelsPerTile;

      const newTimePerPixel = timePerTile / pixelsPerTileQuantized;
      timePerPixel = expAvg * timePerPixel + (1 - expAvg) * newTimePerPixel;
    }

    firstTileTime = Date.now();

    pixelsPerTile = clamp(pixelsPerTile, 8192, width * height);

    setTileDimensions(pixelsPerTile);
  }

  let lastTime = Date.now();
  let sampleTime = 0;
  function nextTile() {
    currentTile++;

    if (currentTile % numTiles === 0) {
      const thisSampleTime = Date.now() - lastTime;
      sampleTime = 0.9 * sampleTime + 0.1 * thisSampleTime;
      // console.log('sample time:', sampleTime);
      lastTime = Date.now();

      initTiles();
      currentTile = 0;
    }

    const x = currentTile % columns;
    const y = Math.floor(currentTile / columns) % rows;

    return {
      x: x * tileWidth,
      y: y * tileHeight,
      tileWidth,
      tileHeight,
      isFirstTile: currentTile === 0,
      isLastTile: currentTile === numTiles - 1
    };
  }

  return {
    setSize,
    reset,
    nextTile,
    restartTimer() {
      firstTileTime = 0;
    },
    getTimePerPixel() {
      return timePerPixel;
    },
    getTileWidth() {
      return tileWidth;
    },
    getTileHeight() {
      return tileHeight;
    }
  };
}

function pixelsPerTileEstimate(gl) {
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

  if (maxRenderbufferSize <= 8192) {
    console.log(0);
    return 200000;
  } else if (maxRenderbufferSize === 16384) {
    console.log(1);
    return 400000;
  } else if (maxRenderbufferSize >= 32768) {
    console.log(2);
    return 600000;
  }
}
