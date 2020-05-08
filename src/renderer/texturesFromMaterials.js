// retrieve textures used by meshes, grouping textures from meshes shared by *the same* mesh property
export function getTexturesFromMaterials(meshes, textureNames) {
  const textureMap = {};

  for (const name of textureNames) {
    const textures = [];
    textureMap[name] = {
      indices: texturesFromMaterials(meshes, name, textures),
      textures
    };
  }

  return textureMap;
}

// retrieve textures used by meshes, grouping textures from meshes shared *across all* mesh properties
export function mergeTexturesFromMaterials(meshes, textureNames) {
  const textureMap = {
    textures: [],
    indices: {}
  };

  for (const name of textureNames) {
    textureMap.indices[name] = texturesFromMaterials(meshes, name, textureMap.textures);
  }

  return textureMap;
}

function texturesFromMaterials(materials, textureName, textures) {
  const indices = [];

  for (const material of materials) {
    const isTextureLoaded = material[textureName] && material[textureName].image;

    if (!isTextureLoaded) {
      indices.push(-1);
    } else {
      let index = textures.length;
      for (let i = 0; i < textures.length; i++) {
        if (textures[i] === material[textureName]) {
          // Reuse existing duplicate texture.
          index = i;
          break;
        }
      }
      if (index === textures.length) {
        // New texture. Add texture to list.
        textures.push(material[textureName]);
      }
      indices.push(index);
    }
  }

  return indices;
}
