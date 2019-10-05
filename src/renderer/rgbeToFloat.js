// Convert image data from the RGBE format to a 32-bit floating point format
// See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format
// Optional multiplier argument for performance optimization
export function rgbeToFloat(buffer, multiplier = 1) {
  const texels = buffer.length / 4;
  const floatBuffer = new Float32Array(texels * 3);

  for (let i = 0; i < texels; i++) {

    const r = buffer[4 * i];
    const g = buffer[4 * i + 1];
    const b = buffer[4 * i + 2];
    const a = buffer[4 * i + 3];

    const exponent = a - 128;
    // bit shift equivilent to e = Math.pow(2, exponent);
    const e = exponent > 0 ? 1 << exponent : 1 / (1 << (-1 * exponent));

    floatBuffer[3 * i] = multiplier * r * e / 255;
    floatBuffer[3 * i + 1] = multiplier * g * e / 255;
    floatBuffer[3 * i + 2] = multiplier * b * e / 255;
  }

  return floatBuffer;
}
