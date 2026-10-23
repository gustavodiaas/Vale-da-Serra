import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import type { VisualQuality } from './valeFinish';

/** One colour-edge pass supplies ink in every quality tier, including low. */
export const CARTOON_INK_SHADER = {
  uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2(1, 1) }, ink: { value: new THREE.Color('#28232f') } },
  vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; uniform vec3 ink; varying vec2 vUv;
    void main(){
      vec3 center=texture2D(tDiffuse,vUv).rgb;
      vec3 left=texture2D(tDiffuse,vUv-vec2(texel.x,0.0)).rgb;
      vec3 right=texture2D(tDiffuse,vUv+vec2(texel.x,0.0)).rgb;
      vec3 up=texture2D(tDiffuse,vUv+vec2(0.0,texel.y)).rgb;
      vec3 down=texture2D(tDiffuse,vUv-vec2(0.0,texel.y)).rgb;
      float edge=max(max(length(center-left),length(center-right)),max(length(center-up),length(center-down)));
      float stroke=smoothstep(0.09,0.24,edge);
      gl_FragColor=vec4(mix(center,ink,stroke*0.92),1.0);
    }`,
};

export function createCartoonFinish(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const composer = new EffectComposer(renderer), render = new RenderPass(scene, camera), ink = new ShaderPass(CARTOON_INK_SHADER), fxaa = new ShaderPass(FXAAShader), output = new OutputPass();
  for (const pass of [render, ink, output, fxaa]) composer.addPass(pass);
  let width = 0, height = 0, ratio = 0;
  return {
    render() { composer.render(); },
    setQuality(tier: VisualQuality) { fxaa.enabled = tier !== 'low'; },
    setNight(_night: boolean) { /* Flat paint owns its night palette; ink stays readable. */ },
    resize(w: number, h: number, r: number) {
      if (w === width && h === height && r === ratio) return;
      width = w; height = h; ratio = r; composer.setPixelRatio(r); composer.setSize(w, h);
      ink.uniforms.texel!.value.set(1.05 / w, 1.05 / h);
      fxaa.uniforms.resolution!.value.set(1 / (w * r), 1 / (h * r));
    },
    dispose() { for (const pass of composer.passes) pass.dispose(); composer.dispose(); },
  };
}
