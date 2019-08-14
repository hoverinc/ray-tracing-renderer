import { clamp } from './util';

export function makeTexture(gl, params) {
  let {
    wrapS = gl.REPEAT,
    wrapT = gl.REPEAT,
    minFilter = gl.LINEAR,
    magFilter = gl.LINEAR,
    gammaCorrection = false,
    width = null,
    height = null,
    channels = null,
    storage = null,
    data = null,
    flipY = false
  } = params;

  width = width || data.width || 0;
  height = height || data.height || 0;

  const texture = gl.createTexture();

  let target;
  let dataArray;

  // if data is a JS array but not a TypedArray, assume data is an array of TypedArrays and create a GL Array Texture
  if (Array.isArray(data)) {
    dataArray = data;
    data = dataArray[0];
    target = gl.TEXTURE_2D_ARRAY;
  } else {
    target = gl.TEXTURE_2D;
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, texture);

  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);

  if (!channels) {
    channels = data.length / (width * height) || 4; // infer number of channels from data size
  }

  channels = clamp(channels, 1, 4);

  const format = [
    gl.R,
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
    console.error('Texture of unknown type:', data);
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
  } else {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
    gl.texImage2D(target, 0, internalFormat, width, height, 0, format, type, data);
  }

  // return state to default
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  return Object.freeze({
    target,
    texture
  });
}