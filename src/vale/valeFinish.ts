import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export type VisualQuality = 'high' | 'medium' | 'low';

export function createValeFinish(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const composer = new EffectComposer(renderer);
  const render = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .2, .45, 1.2);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2(1, 1) }, miniature: { value: .2 }, night: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; uniform float miniature; uniform float night; varying vec2 vUv;
      void main(){
        float blur=pow(smoothstep(.24,.52,abs(vUv.y-.53)),2.0)*miniature;
        vec3 c=texture2D(tDiffuse,vUv).rgb*(1.0-blur);
        vec2 d=texel*1.4;
        c+=(texture2D(tDiffuse,vUv+vec2(d.x,d.y)).rgb+texture2D(tDiffuse,vUv+vec2(-d.x,d.y)).rgb+texture2D(tDiffuse,vUv-vec2(d.x,d.y)).rgb+texture2D(tDiffuse,vUv+vec2(d.x,-d.y)).rgb)*blur*.25;
        float luminance=dot(c,vec3(.2126,.7152,.0722));
        c=mix(vec3(luminance),c,1.035);
        c*=mix(vec3(1.025,1.015,.985),vec3(.98,1.0,1.035),night);
        vec2 p=vUv-.5; c*=1.0-dot(p,p)*.12;
        gl_FragColor=vec4(max(c,vec3(0.0)),1.0);
      }`,
  });
  const smaa = new SMAAPass(), output = new OutputPass(), fxaa = new ShaderPass(FXAAShader);
  for (const pass of [render, bloom, grade, smaa, output, fxaa]) composer.addPass(pass);
  let quality: VisualQuality = 'high', night = false;
  let lastWidth = 0, lastHeight = 0, lastRatio = 0;
  const configure = () => {
    smaa.enabled = quality === 'high'; fxaa.enabled = quality === 'medium';
    bloom.enabled = night && quality === 'high';
    grade.uniforms.miniature!.value = quality === 'high' ? .2 : 0;
    grade.uniforms.night!.value = night ? 1 : 0;
  };
  configure();
  return {
    render() { if (quality === 'low') renderer.render(scene, camera); else composer.render(); },
    setQuality(value: VisualQuality) { quality = value; configure(); },
    setNight(value: boolean) { night = value; configure(); },
    resize(width: number, height: number, ratio: number) {
      if (width === lastWidth && height === lastHeight && ratio === lastRatio) return;
      lastWidth = width; lastHeight = height; lastRatio = ratio;
      composer.setPixelRatio(ratio); composer.setSize(width, height);
      grade.uniforms.texel!.value.set(1 / (width * ratio), 1 / (height * ratio));
      fxaa.uniforms.resolution!.value.set(1 / (width * ratio), 1 / (height * ratio));
    },
    dispose() { for (const pass of composer.passes) pass.dispose(); composer.dispose(); },
  };
}
