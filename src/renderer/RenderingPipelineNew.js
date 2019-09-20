import { decomposeScene } from './decomposeScene';
import { makeFramebuffer } from './FrameBuffer';
import { makeFullscreenQuad } from './FullscreenQuad';
import { createShader, createProgram, getAttributes, getUniforms } from './glUtil';
import { makeGBufferShader } from './GBufferShader';
import { mergeMeshesToGeometry } from './mergeMeshesToGeometry';

import { makeTextureAllocator } from './TextureAllocator';
import { makeToneMapShader } from './ToneMapShader';


// Important TODO: Refactor this file to get rid of duplicate and confusing code

export function makeRenderingPipeline(params) {

  const {
    gl, optionalExtensions, scene, toneMappingParams
  } = params;

  const { meshes } = decomposeScene(scene);
  const { geometry } = mergeMeshesToGeometry(meshes);

  const textureAllocator = makeTextureAllocator(gl);
  const fullscreenQuad = makeFullscreenQuad(gl);

  const gBufferShader = makeGBufferShader({ geometry, gl });
  const toneMapShader = makeToneMapShader({ gl, fullscreenQuad, optionalExtensions, textureAllocator, toneMappingParams });

  const rt = makeFramebuffer({
    depth: true,
    gl,
    renderTargets: gBufferShader.renderTargets
  });

  gl.enable(gl.DEPTH_TEST);

  function drawFull(camera) {


    rt.bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gBufferShader.draw(camera);
    rt.unbind();

    toneMapShader.draw({ texture: rt.texture.normal });
  }

  function setSize(width, height) {
    gl.viewport(0, 0, width, height);
    rt.setSize(width, height);
  }

  return {
    drawFull,
    setSize,
    setRenderTime() {},
    restartTimer() {},
  };
}
