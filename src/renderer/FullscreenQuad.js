import vertString from './glsl/fullscreenQuad.vert';
import { compileShader } from './glUtil';

export function makeFullscreenQuad(gl) {
  // TODO: use VAOs
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

  // vertex shader should set layout(location = 0) on position attribute
  const posLoc = 0;

  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertString());

  function draw() {
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return {
    draw,
    vertexShader
  };
}
