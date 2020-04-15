import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

export function makeTextureReadPass(gl, params) {
  const {
    fullscreenQuad,
  } = params;

  const renderPass = makeRenderPass(gl, {
    vertex: fullscreenQuad.vertexShader,
    fragment: {
      outputs: ['color'],
      source: `
        in vec2 vCoord;
        uniform sampler2D tex;
        void main() {
          out_color = texture(tex, vCoord);
        }
      `
    }
  });

  function draw(texture) {
    renderPass.setTexture('tex', texture);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw,
  };
}
