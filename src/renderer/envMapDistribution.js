// Create a piecewise 2D cumulative distribution function of light intensity from an env map
// http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Piecewise-Constant2DDistributions

export function envMapDistribution(image) {
  const data = image.data;

  const cdfImage = {
    width: image.width + 2,
    height: image.height + 1
  };

  const cdf = makeTextureArray(cdfImage.width, cdfImage.height, 2);

  for (let y = 0; y < image.height; y++) {
    const sinTheta = Math.sin(Math.PI * (y + 0.5) / image.height);
    for (let x = 0; x < image.width; x++) {
      const i = 3 * (y * image.width + x);
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      let luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luminance *= sinTheta;
      cdf.set(x + 2, y, 0, cdf.get(x + 1, y, 0) + luminance / image.width);
      cdf.set(x + 1, y, 1, luminance);
    }

    const rowIntegral = cdf.get(cdfImage.width - 1, y, 0);

    for (let x = 1; x < cdf.width; x++) {
      cdf.set(x, y, 0, cdf.get(x, y, 0) / rowIntegral);
      cdf.set(x, y, 1, cdf.get(x, y, 1) / rowIntegral);
    }

    cdf.set(0, y + 1, 0, cdf.get(0, y, 0) + rowIntegral / image.height);
    cdf.set(0, y, 1, rowIntegral);
  }

  const integral = cdf.get(0, cdf.height - 1, 0);

  for (let y = 0; y < cdf.height; y++) {
    cdf.set(0, y, 0, cdf.get(0, y, 0) / integral);
    cdf.set(0, y, 1, cdf.get(0, y, 1) / integral);
  }
  cdfImage.data = cdf.array;

  return cdfImage;
}


function makeTextureArray(width, height, channels) {
  const array = new Float32Array(channels * width * height);

  return {
    set(x, y, channel, val) {
      array[channels * (y * width + x) + channel] = val;
    },
    get(x, y, channel) {
      return array[channels * (y * width + x) + channel];
    },
    width,
    height,
    channels,
    array
  };
}
