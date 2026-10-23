import type { MeshStandardMaterial } from 'three';

export function addVegetationWind(material: MeshStandardMaterial, clock: { value: number }, minimum: number, height: number) {
  material.onBeforeCompile = shader => {
    shader.uniforms.valeWind = clock;
    shader.vertexShader = `uniform float valeWind;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float anchor=clamp((position.y-(${minimum.toFixed(5)}))/${Math.max(height, .001).toFixed(5)},0.0,1.0);
      float windPhase=valeWind*.65+instanceMatrix[3].x*.17+instanceMatrix[3].z*.11;
      transformed.x+=sin(windPhase+anchor)*anchor*anchor*${(height * .025).toFixed(5)};
      transformed.z+=cos(windPhase*.8+anchor)*anchor*anchor*${(height * .013).toFixed(5)};
    `);
  };
  material.customProgramCacheKey = () => `vale-wind-${minimum}-${height}`;
}
