import { makeRenderPass } from './RenderPass';
import * as THREE from 'three';

export function makeAlbedoSeparationPass(gl, params) {
  const {
    fullscreenQuad,
  } = params;

  const renderPass = makeRenderPass(gl, {
    vertex: fullscreenQuad.vertexShader,
    fragment: {
      outputs: ['diffuseAlbedo', 'specularAlbedo'],
      source: `
        in vec2 vCoord;

        uniform sampler2D albedoTex;
        uniform sampler2D matPropsTex;

        void main() {
          vec3 albedo = texture(albedoTex, vCoord).rgb;
          float metalness = texture(matPropsTex, vCoord).g;

          vec3 diffuseAlbedo = (1.0 - metalness) * albedo;
          vec3 specularAlbedo = mix(vec3(1.0), albedo, metalness);

          out_diffuseAlbedo = vec4(diffuseAlbedo, 1.0);
          out_specularAlbedo = vec4(specularAlbedo, 1.0);
        }
      `
    }
  });

  function draw(params) {
    const {
      albedo,
      matProps
    } = params;

    renderPass.setTexture('albedoTex', albedo);
    renderPass.setTexture('matPropsTex', matProps);

    renderPass.useProgram();
    fullscreenQuad.draw();
  }

  return {
    draw,
    outputLocs: renderPass.outputLocs
  };
}
