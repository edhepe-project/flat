/**
 * Luminaries: Construcción 3D del Sol y la Luna con shaders, halos, luces y efectos de eclipse.
 * Delegado por CelestialSystem para mantener celestial.js reducido al core matemático.
 */

class Luminaries {
  constructor(celestialSystem) {
    this.cs = celestialSystem;
    this._initSun();
    this._initMoon();
  }

  _initSun() {
    const cs = this.cs;
    cs.sunGroup = new THREE.Group();

    const sunGeo = new THREE.SphereGeometry(9, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3ad });
    cs.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    cs.sunGroup.add(cs.sunMesh);

    // Corona / Halo solar
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 110);
    grad.addColorStop(0,    'rgba(255, 245, 160, 1.0)');
    grad.addColorStop(0.18, 'rgba(255, 220, 100, 0.85)');
    grad.addColorStop(0.40, 'rgba(231, 178,  75, 0.45)');
    grad.addColorStop(0.70, 'rgba(231, 178,  75, 0.10)');
    grad.addColorStop(1.0,  'rgba(231, 178,  75, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const flareMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false
    });
    cs.sunFlare = new THREE.Sprite(flareMat);
    cs.sunFlare.scale.set(52, 52, 1);
    cs.sunGroup.add(cs.sunFlare);

    cs.sunSpotlight = new THREE.SpotLight(0xfffaed, 5.2);
    cs.sunSpotlight.angle    = Math.PI / 2.45;
    cs.sunSpotlight.penumbra = 0.70;
    cs.sunSpotlight.decay    = 0.45;
    cs.sunSpotlight.distance = 650;
    cs.sunSpotlight.castShadow = false;
    cs.sunGroup.add(cs.sunSpotlight);

    cs.sunPointLight = new THREE.PointLight(0xffe680, 2.2, 0, 0.8);
    cs.sunGroup.add(cs.sunPointLight);

    cs.sunTarget = new THREE.Object3D();
    cs.sunTarget.position.set(0, -cs.sunAltitude, 0);
    cs.sunGroup.add(cs.sunTarget);
    cs.sunSpotlight.target = cs.sunTarget;

    // Anillo indicador de declinación
    const orbitPts = [];
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      orbitPts.push(Math.cos(a) * 200, 0, Math.sin(a) * 200);
    }
    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(orbitPts, 3));
    cs.sunOrbitLine = new THREE.Line(
      orbitGeo,
      new THREE.LineBasicMaterial({ color: 0xe7b24b, transparent: true, opacity: 0.4 })
    );
    cs.sunOrbitLine.position.y = cs.sunAltitude;
    cs.group.add(cs.sunOrbitLine);
    cs.group.add(cs.sunGroup);
  }

  _initMoon() {
    const cs = this.cs;
    cs.moonGroup = new THREE.Group();

    const moonGeo = new THREE.SphereGeometry(7, 64, 64);
    cs.moonShaderUniforms = {
      uSunWorldPos:   { value: new THREE.Vector3(0, 85, 0) },
      uColor:         { value: new THREE.Color(0xdceaf4) },
      uEmissive:      { value: new THREE.Color(0x000000) },
      uEclipseFactor: { value: 0.0 }
    };

    const moonMat = new THREE.ShaderMaterial({
      uniforms: cs.moonShaderUniforms,
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        void main() {
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunWorldPos;
        uniform vec3 uColor;
        uniform vec3 uEmissive;
        uniform float uEclipseFactor;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        float fbm(vec2 p) {
          float v=0.0,a=0.5;
          for(int i=0;i<5;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
          return v;
        }

        void main() {
          vec3 lightDir = normalize(uSunWorldPos - vWorldPosition);
          vec3 viewDir  = normalize(-vWorldPosition);
          float NdotL   = dot(vWorldNormal, lightDir);
          float NdotV   = max(0.0, dot(vWorldNormal, viewDir));

          float macroPorosity = fbm(vUv * 7.0);
          float microCells    = fbm(vUv * 22.0);
          float nanoLattice   = fbm(vUv * 48.0);
          float deepCraters   = pow(fbm(vUv * 14.0), 2.2);
          float porosityPattern = macroPorosity*0.45+microCells*0.35+nanoLattice*0.20-deepCraters*0.35;
          float albedo = mix(0.55, 1.30, smoothstep(0.20, 0.75, porosityPattern));
          float poreDepthShading = mix(0.65, 1.0, smoothstep(0.25, 0.65, porosityPattern));
          vec3 aerogelBase = vec3(0.92, 0.95, 1.0) * albedo;

          float directSun = max(0.0, NdotL);
          float shadowMask = smoothstep(-0.02, 0.04, NdotL);
          float retroReflection = directSun * (1.0 + 0.20 * pow(directSun, 2.0));
          float sunIntensity = shadowMask * (0.15 + 0.85 * retroReflection * poreDepthShading);
          float rim = pow(1.0 - NdotV, 3.5);
          vec3 rayleighGlow = vec3(0.35, 0.65, 0.95) * rim * shadowMask * 0.28;

          float shadowPoreContrast = pow(albedo, 1.6);
          vec3 darkSideSurface = vec3(0.022, 0.028, 0.038) * shadowPoreContrast;
          vec3 litColor = mix(darkSideSurface, aerogelBase * sunIntensity + rayleighGlow, shadowMask);
          litColor = mix(litColor, litColor + uEmissive * albedo, uEclipseFactor);
          gl_FragColor = vec4(clamp(litColor, 0.0, 1.0), 1.0);
        }
      `
    });

    cs.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    cs.moonGroup.add(cs.moonMesh);

    // Halo lunar
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 256; moonCanvas.height = 256;
    const moonCtx = moonCanvas.getContext('2d');
    const moonGrad = moonCtx.createRadialGradient(128, 128, 0, 128, 128, 105);
    moonGrad.addColorStop(0,    'rgba(220, 234, 244, 0.90)');
    moonGrad.addColorStop(0.22, 'rgba(195, 218, 238, 0.50)');
    moonGrad.addColorStop(0.50, 'rgba(175, 203, 224, 0.18)');
    moonGrad.addColorStop(0.80, 'rgba(175, 203, 224, 0.04)');
    moonGrad.addColorStop(1.0,  'rgba(175, 203, 224, 0.0)');
    moonCtx.fillStyle = moonGrad;
    moonCtx.fillRect(0, 0, 256, 256);

    const moonFlareMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(moonCanvas),
      transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false
    });
    cs.moonFlare = new THREE.Sprite(moonFlareMat);
    cs.moonFlare.scale.set(34, 34, 1);
    cs.moonGroup.add(cs.moonFlare);

    cs.moonSpotlight = new THREE.SpotLight(0xafcbe0, 0.0);
    cs.moonSpotlight.angle    = Math.PI / 2.8;
    cs.moonSpotlight.penumbra = 0.95;
    cs.moonSpotlight.decay    = 1.0;
    cs.moonSpotlight.distance = 550;
    cs.moonSpotlight.castShadow = false;
    cs.moonGroup.add(cs.moonSpotlight);

    cs.moonPointLight = new THREE.PointLight(0xafcbe0, 0.0, 80, 2.0);
    cs.moonGroup.add(cs.moonPointLight);

    cs.moonTarget = new THREE.Object3D();
    cs.moonTarget.position.set(0, -cs.moonAltitude, 0);
    cs.moonGroup.add(cs.moonTarget);
    cs.moonSpotlight.target = cs.moonTarget;

    cs.group.add(cs.moonGroup);
  }
}

window.Luminaries = Luminaries;
