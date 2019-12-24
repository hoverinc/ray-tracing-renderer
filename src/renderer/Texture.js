import { clamp } from './util';

export function makeTexture(gl, params) {
  let {
    width = null,
    height = null,

    // A single HTMLImageElement, ImageData, or TypedArray,
    // Or an array of any of these objects. In this case an Array Texture will be created
    data = null,

    // If greater than 1, create an Array Texture of this length
    length = 1,

    // Number of channels, [1-4]. If left blank, the the function will decide the number of channels automatically from the data
    channels = null,

    // Either 'byte' or 'float'
    // If left empty, the function will decide the format automatically from the data
    storage = null,

    // Reverse the texture across the y-axis.
    flipY = false,

    // sampling properties
    gammaCorrection = false,
    wrapS = gl.REPEAT,
    wrapT = gl.REPEAT,
    minFilter = gl.LINEAR,
    magFilter = gl.LINEAR,
  } = params;

  width = width || data.width || 0;
  height = height || data.height || 0;

  const texture = gl.createTexture();

  let target;
  let dataArray;

  // if data is a JS array but not a TypedArray, assume data is an array of images and create a GL Array Texture
  if (Array.isArray(data)) {
    dataArray = data;
    data = dataArray[0];
  }

  target = dataArray || length > 1 ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, texture);

  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);

  if (!channels) {
    if (data && data.length) {
      channels = data.length / (width * height); // infer number of channels from data size
    } else {
      channels = 4;
    }
  }

  channels = clamp(channels, 1, 4);

  const format = [
    gl.RED,
    gl.RG,
    gl.RGB,
    gl.RGBA
  ][channels - 1];

  const isByteArray =
    storage === 'byte' ||
    data instanceof Uint8Array ||
    data instanceof HTMLImageElement ||
    data instanceof HTMLCanvasElement ||
    data instanceof ImageData;

  const isFloatArray =
    storage === 'float' ||
    data instanceof Float32Array;

  let type;
  let internalFormat;
  if (isByteArray) {
    type = gl.UNSIGNED_BYTE;
    internalFormat = [
      gl.R8,
      gl.RG8,
      gammaCorrection ? gl.SRGB8 : gl.RGB8,
      gammaCorrection ? gl.SRGB8_ALPHA8 : gl.RGBA8
    ][channels - 1];
  } else if (isFloatArray) {
    type = gl.FLOAT;
    internalFormat = [
      gl.R32F,
      gl.RG32F,
      gl.RGB32F,
      gl.RGBA32F
    ][channels - 1];
  } else {
    console.error('Texture of unknown type:', storage || data);
  }

  if (dataArray) {
    gl.texStorage3D(target, 1, internalFormat, width, height, dataArray.length);
    for (let i = 0; i < dataArray.length; i++) {
      // if layer is an HTMLImageElement, use the .width and .height properties of each layer
      // otherwise use the max size of the array texture
      const layerWidth = dataArray[i].width || width;
      const layerHeight = dataArray[i].height || height;

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, Array.isArray(flipY) ? flipY[i] : flipY);

      gl.texSubImage3D(target, 0, 0, 0, i, layerWidth, layerHeight, 1, format, type, dataArray[i]);
    }
  } else if (length > 1) {
    // create empty array texture
    gl.texStorage3D(target, 1, internalFormat, width, height, length);
  } else {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
    gl.texStorage2D(target, 1, internalFormat, width, height);
    if (data) {
      gl.texSubImage2D(target, 0, 0, 0, width, height, format, type, data);
    }
  }

  // return state to default
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  return {
    target,
    texture
  };
}
