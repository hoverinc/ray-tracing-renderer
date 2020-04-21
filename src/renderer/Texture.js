import { clamp } from './util';

const TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;
const MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;

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
    wrapS = gl.CLAMP_TO_EDGE,
    wrapT = gl.CLAMP_TO_EDGE,
    minFilter = gl.NEAREST,
    magFilter = gl.NEAREST,
  } = params;

  const texture = gl.createTexture();

  let dataArray;

  // if data is a JS array but not a TypedArray, assume data is an array of images and create a GL Array Texture
  if (Array.isArray(data)) {
    dataArray = data;
    data = dataArray[0];
  }

  const target = dataArray || length > 1 ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, texture);

  const useMipmaps =
    minFilter === gl.NEAREST_MIPMAP_NEAREST ||
    minFilter === gl.NEAREST_MIPMAP_LINEAR ||
    minFilter === gl.LINEAR_MIPMAP_NEAREST ||
    minFilter === gl.LINEAR_MIPMAP_LINEAR;

  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);

  // disable anisotropic filtering until there's more testing
  // if (minFilter === gl.LINEAR_MIPMAP_LINEAR) {
  //   const anisotropy = gl.getParameter(MAX_TEXTURE_MAX_ANISOTROPY_EXT);
  //   gl.texParameteri(target, TEXTURE_MAX_ANISOTROPY_EXT, anisotropy);
  // }

  width = width || data.width || 0;
  height = height || data.height || 0;

  if (!channels) {
    if (data && data.length) {
      channels = data.length / (width * height); // infer number of channels from data size
    } else {
      channels = 4;
    }
  }

  channels = clamp(channels, 1, 4);

  const { type, format, internalFormat } = getTextureFormat(gl, channels, storage, data, gammaCorrection);

  const levels = useMipmaps ?
    Math.floor(Math.log2(Math.max(width, height))) :
    1;

  if (dataArray) {
    gl.texStorage3D(target, levels, internalFormat, width, height, dataArray.length);
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
    gl.texStorage3D(target, levels, internalFormat, width, height, length);
  } else {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
    gl.texStorage2D(target, levels, internalFormat, width, height);
    if (data) {
      gl.texSubImage2D(target, 0, 0, 0, width, height, format, type, data);
    }
  }

  if (useMipmaps) {
    gl.generateMipmap(target);
  }

  // return state to default
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  return {
    target,
    texture
  };
}

export function makeDepthTarget(gl, width, height) {
  const texture = gl.createRenderbuffer();
  const target = gl.RENDERBUFFER;

  gl.bindRenderbuffer(target, texture);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
  gl.bindRenderbuffer(target, null);

  return {
    target,
    texture
  };
}

function getTextureFormat(gl, channels, storageStr, data, gammaCorrection) {
  let type;
  let internalFormat;

  const isByteArray =
    data instanceof Uint8Array ||
    data instanceof HTMLImageElement ||
    data instanceof HTMLCanvasElement ||
    data instanceof ImageData;

  const isFloatArray = data instanceof Float32Array;

  if (storageStr === 'byte' || (!storageStr && isByteArray)) {
    internalFormat = {
      1: gl.R8,
      2: gl.RG8,
      3: gammaCorrection ? gl.SRGB8 : gl.RGB8,
      4: gammaCorrection ? gl.SRGB8_ALPHA8 : gl.RGBA8
    }[channels];

    type = gl.UNSIGNED_BYTE;
  } else if (storageStr === 'float' || (!storageStr && isFloatArray)) {
    internalFormat = {
      1: gl.R32F,
      2: gl.RG32F,
      3: gl.RGB32F,
      4: gl.RGBA32F
    }[channels];

    type = gl.FLOAT;
  } else if (storageStr === 'halfFloat') {
    internalFormat = {
      1: gl.R16F,
      2: gl.RG16F,
      3: gl.RGB16F,
      4: gl.RGBA16F
    }[channels];

    type = gl.FLOAT;
  } else if (storageStr === 'snorm') {
    internalFormat = {
      1: gl.R8_SNORM,
      2: gl.RG8_SNORM,
      3: gl.RGB8_SNORM,
      4: gl.RGBA8_SNORM,
    }[channels];

    type = gl.UNSIGNED_BYTE;
  }

  const format = {
    1: gl.RED,
    2: gl.RG,
    3: gl.RGB,
    4: gl.RGBA
  }[channels];

  return {
    format,
    internalFormat,
    type
  };
}
