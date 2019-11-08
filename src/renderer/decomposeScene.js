
export function decomposeScene(scene) {
  const meshes = [];
  const directionalLights = [];
  const environmentLights = [];
  scene.traverseVisible(child => {
    if (child instanceof THREE.Mesh) {
      if (!child.geometry || !child.geometry.getAttribute('position')) {
        console.warn(child, 'must have a geometry property with a position attribute');
      }
      else if (!child.material instanceof THREE.MeshStandardMaterial) {
        console.warn(child, 'must use MeshStandardMaterial in order to be rendered.');
      } else {
        meshes.push(child);
      }
    }
    if (child instanceof THREE.DirectionalLight) {
      directionalLights.push(child);
    }
    if (child instanceof THREE.EnvironmentLight) {
      if (environmentLights.length > 1) {
        console.warn(environmentLights, 'only one environment light can be used per scene');
      }
      else if (isHDRTexture(child)) {
        environmentLights.push(child);
      } else {
        console.warn(child, 'environment light does not use THREE.RGBEEncoding');
      }
    }
  });

  return {
    meshes, directionalLights, environmentLights
  };
}


function isHDRTexture(texture) {
  return texture.map
    && texture.map.image
    && (texture.map.encoding === THREE.RGBEEncoding || texture.map.encoding === THREE.LinearEncoding);
}
