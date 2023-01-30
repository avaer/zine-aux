import * as THREE from 'three';
// import {
//   loadKtx2zTexture,
// } from '../utils/ktx2-utils.js';
import {
  loadImage,
} from '../utils/image-utils.js';

// const defaultMaxParticles = 256;
// const canvasSize = 4096;
// const frameSize = 512;
// const rowSize = Math.floor(canvasSize/frameSize);

export class PortalMesh extends THREE.Mesh {
  constructor({
    renderer,
    portalScene,
    portalCamera,
  }) {
    const portalWorldSize = 10;
    const portalSize = 1024;
    
    const geometry = new THREE.PlaneGeometry(portalWorldSize / 1.5, portalWorldSize);

    const iChannel0 = new THREE.Texture();
    (async () => {
      const img = await loadImage('/images/noise.png');
      iChannel0.image = img;
      iChannel0.needsUpdate = true;
    })();

    const portalSceneRenderTarget = new THREE.WebGLRenderTarget(portalSize, portalSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
    });
    const iChannel1 = portalSceneRenderTarget.texture;
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: {
          value: 0,
          needsUpdate: true,
        },
        iChannel0: {
          value: iChannel0,
          needsUpdate: true,
        },
        iChannel1: {
          value: iChannel1,
          needsUpdate: true,
        },
        iResolution: {
          value: new THREE.Vector2(portalSize, portalSize),
          needsUpdate: true,
        },
      },
      vertexShader: `\
        varying vec2 vUv;
        // varying vec2 vScreenSpaceUv;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

          vUv = uv;
          // vScreenSpaceUv = (gl_Position.xy / gl_Position.w) * 0.5 + 0.5;
        }
      `,
      fragmentShader: `\
        //Noise animation - Electric
        //by nimitz (stormoid.com) (twitter: @stormoid)
        //modified to look like a portal by Pleh
        //fbm tweaks by foxes
        
        //The domain is displaced by two fbm calls one for each axis.
        //Turbulent fbm (aka ridged) is used for better effect.
        
        uniform float iTime;
        uniform sampler2D iChannel0;
        uniform sampler2D iChannel1;
        uniform vec2 iResolution;

        varying vec2 vUv;
        // varying vec2 vScreenSpaceUv;
        
        #define PI 3.1415926535897932384626433832795
        #define tau (PI * 2.)
        #define time (iTime * 0.2)
        
        vec3 hueShift( vec3 color, float hueAdjust ){
            const vec3  kRGBToYPrime = vec3 (0.299, 0.587, 0.114);
            const vec3  kRGBToI      = vec3 (0.596, -0.275, -0.321);
            const vec3  kRGBToQ      = vec3 (0.212, -0.523, 0.311);
        
            const vec3  kYIQToR     = vec3 (1.0, 0.956, 0.621);
            const vec3  kYIQToG     = vec3 (1.0, -0.272, -0.647);
            const vec3  kYIQToB     = vec3 (1.0, -1.107, 1.704);
        
            float   YPrime  = dot (color, kRGBToYPrime);
            float   I       = dot (color, kRGBToI);
            float   Q       = dot (color, kRGBToQ);
            float   hue     = atan (Q, I);
            float   chroma  = sqrt (I * I + Q * Q);
        
            hue += hueAdjust;
        
            Q = chroma * sin (hue);
            I = chroma * cos (hue);
        
            vec3    yIQ   = vec3 (YPrime, I, Q);
        
            return vec3( dot (yIQ, kYIQToR), dot (yIQ, kYIQToG), dot (yIQ, kYIQToB) );
        }

        mat2 makem2(in float theta){float c = cos(theta);float s = sin(theta);return mat2(c,-s,s,c);}
        float noise( in vec2 x ){return texture(iChannel0, x*.01).x;}
        
        float fbm(in vec2 p) {
          vec4 tt=fract(vec4(time)+vec4(0.0,0.25,0.5,0.75));
          vec2 p1=p-normalize(p)*tt.x;
          vec2 p2=vec2(1.0)+p-normalize(p)*tt.y;
          vec2 p3=vec2(2.0)+p-normalize(p)*tt.z;
          vec2 p4=vec2(3.0)+p-normalize(p)*tt.w;
          vec4 tr=vec4(1.0)-abs(tt-vec4(0.5))*2.0;
          float z = 2.;
          vec4 rz = vec4(0.);
          for (float i= 1.; i < 4.; i++) {
            rz += abs((vec4(noise(p1),noise(p2),noise(p3),noise(p4))-vec4(0.5))*2.)/z;
            z = z*2.;
            p1 = p1*2.;
            p2 = p2*2.;
            p3 = p3*2.;
            p4 = p4*2.;
          }
          return dot(rz,tr)*0.25;
        }
        float dualfbm(in vec2 p) {
          //get two rotated fbm calls and displace the domain
          vec2 p2 = p*.7;
          vec2 basis = vec2(fbm(p2-time*1.6),fbm(p2+time*1.7));
          basis = (basis-.5)*.2;
          p += basis;
          
          //coloring
          return fbm(p);
        }
        
        float circ(vec2 p) {
          float r = length(p);
          r = log(sqrt(r));
          return abs(mod(r*2.,tau)-4.54)*3.+.5;
        
        }
        float circ2(vec2 p) {
          float r = length(p);
          r = log(sqrt(r));
          return 0.1 - r;
        
        }
        
        void main() {
          // setup system
          vec2 uv = vUv;

          // vScreenSpaceUv based on iResolution, in the range [0, 1]
          vec2 vScreenSpaceUv = gl_FragCoord.xy / iResolution.xy;

          vec2 p = (uv - 0.5) * 4.;

          float rz = dualfbm(p);
          
          // rings
            
          float dx = 5.0;
          float dy = 5.0;
          
          rz *= abs((-circ(vec2(p.x / dx, p.y / dy))));
          rz *= abs((-circ(vec2(p.x / dx, p.y / dy))));
          rz *= abs((-circ(vec2(p.x / dx, p.y / dy))));
          
          // final color
          vec4 mainColor = vec4(.15, 0.1, 0.1, 0.05);
          mainColor.rgb = hueShift(mainColor.rgb, mod(time * tau * 2., tau));
          float darkenFactor = 0.1;
            
          vec4 col = mainColor/rz;
          col = pow(abs(col),vec4(.99));
          col.rgb *= darkenFactor;

          vec4 bgInner = texture(iChannel1, vScreenSpaceUv);
          // vec4 bgInner = vec4(vScreenSpaceUv, 0., 0.);
          vec4 bgOuter = vec4(0., 0., 0., 0.);

          // gl_FragColor = vec4((col.rgb*col.a + bgOuter.rgb*(1.0-col.a)),1.0);
          gl_FragColor = mix(vec4(col.rgb, 1.), bgOuter, 1.- col.a);

          float factor = circ2(vec2(p.x / dx, p.y / dy));
          if (factor > 1.) {
            gl_FragColor.rgb = mix(gl_FragColor.rgb, bgInner.rgb, 1. - col.a);
            gl_FragColor.a = 1.;
          }

          if (gl_FragColor.a < 0.01) {
            discard;
          }
        }
      `,
      transparent: true,
    });

    super(geometry, material);

    this.renderer = renderer;
    this.portalScene = portalScene;
    this.portalCamera = portalCamera;

    this.portalSceneRenderTarget = portalSceneRenderTarget;
  }
  update() {
    const maxTime = 1000;
    this.material.uniforms.iTime.value = performance.now() / maxTime;
    this.material.uniforms.iTime.needsUpdate = true;

    this.material.uniforms.iResolution.value.set(this.portalSceneRenderTarget.width, this.portalSceneRenderTarget.height);
    this.material.uniforms.iResolution.needsUpdate = true;

    this.renderer.setRenderTarget(this.portalSceneRenderTarget);
    this.renderer.render(this.portalScene, this.portalCamera);
    this.renderer.setRenderTarget(null);
  }
}