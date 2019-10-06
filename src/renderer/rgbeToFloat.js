// Convert image data from the RGBE format to a 32-bit floating point format
// See https://www.cg.tuwien.ac.at/research/theses/matkovic/node84.html for a description of the RGBE format
// Optional multiplier argument for performance optimization
export function rgbeToFloat(buffer, intensity = 1) {
  const texels = buffer.length / 4;
  const floatBuffer = new Float32Array(texels * 3);

  const expTable = [];
  for (let i = 0; i < 255; i++) {
    expTable[i] = intensity * Math.pow(2, i - 128) / 255;
  }

  for (let i = 0; i < texels; i++) {

    const r = buffer[4 * i];
    const g = buffer[4 * i + 1];
    const b = buffer[4 * i + 2];
    const a = buffer[4 * i + 3];
    const e = expTable[a];

    floatBuffer[3 * i] = r * e;
    floatBuffer[3 * i + 1] = g * e;
    floatBuffer[3 * i + 2] = b * e;
  }

  return floatBuffer;
}
