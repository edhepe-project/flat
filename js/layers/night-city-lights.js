/**
 * NightCityLights: Shader GPU para la iluminación nocturna urbana global ("Black Marble").
 * Renderiza más de 34,000 núcleos urbanos que se encienden físicamente al anochecer.
 */

class NightCityLights {
  constructor(earthDisc) {
    this.earthDisc = earthDisc;
    this.cityLightsMesh = null;
    this.cityLightsUniforms = null;
    this.init();
  }

  init() {
    fetch('data/world_cities.json')
      .then(res => res.json())
      .then(data => {
        const validCities = data.filter(c => typeof c.lt === 'number' && typeof c.ln === 'number');
        const totalPoints = validCities.length;
        if (totalPoints === 0) return;

        const positions = new Float32Array(totalPoints * 3);
        const colors = new Float32Array(totalPoints * 3);
        const sizes = new Float32Array(totalPoints);

        const maxR = this.earthDisc.radius - 25;

        for (let i = 0; i < totalPoints; i++) {
          const c = validCities[i];
          const lat = c.lt;
          const lon = c.ln;
          const pop = c.p || 10000;

          const r = ((90 - lat) / 180) * maxR;
          const theta = ((lon + 90) * Math.PI) / 180;
          const x = -r * Math.cos(theta);
          const z = r * Math.sin(theta);

          positions[i * 3]     = x;
          positions[i * 3 + 1] = 6.22;
          positions[i * 3 + 2] = z;

          if (pop >= 2000000) {
            colors[i * 3]     = 1.0;
            colors[i * 3 + 1] = 0.94;
            colors[i * 3 + 2] = 0.72;
            sizes[i]          = 3.2;
          } else if (pop >= 500000) {
            colors[i * 3]     = 1.0;
            colors[i * 3 + 1] = 0.85;
            colors[i * 3 + 2] = 0.48;
            sizes[i]          = 2.4;
          } else if (pop >= 100000) {
            colors[i * 3]     = 0.98;
            colors[i * 3 + 1] = 0.75;
            colors[i * 3 + 2] = 0.38;
            sizes[i]          = 1.7;
          } else {
            colors[i * 3]     = 0.92;
            colors[i * 3 + 1] = 0.65;
            colors[i * 3 + 2] = 0.28;
            sizes[i]          = 1.1;
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        this.cityLightsUniforms = {
          uSunWorldPos: { value: new THREE.Vector3(0, 85, 0) },
          uSunSpotAngle: { value: Math.PI / 2.45 }
        };

        const vertShader = `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          varying vec3 vWorldPos;

          void main() {
            vColor = color;
            vec4 worldP = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldP.xyz;
            vec4 mvPosition = viewMatrix * worldP;
            gl_PointSize = size * (240.0 / -mvPosition.z);
            gl_PointSize = clamp(gl_PointSize, 1.0, 10.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `;

        const fragShader = `
          uniform vec3 uSunWorldPos;
          uniform float uSunSpotAngle;
          varying vec3 vColor;
          varying vec3 vWorldPos;

          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.05, dist);

            float distToSun = distance(vWorldPos.xz, uSunWorldPos.xz);
            float sunRadiusAtGround = uSunWorldPos.y * tan(uSunSpotAngle);
            float nightFactor = smoothstep(sunRadiusAtGround * 0.80, sunRadiusAtGround * 1.10, distToSun);

            if (nightFactor < 0.01) discard;

            gl_FragColor = vec4(vColor * 1.2, alpha * nightFactor * 0.90);
          }
        `;

        const mat = new THREE.ShaderMaterial({
          uniforms: this.cityLightsUniforms,
          vertexShader: vertShader,
          fragmentShader: fragShader,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        this.cityLightsMesh = new THREE.Points(geo, mat);
        this.cityLightsMesh.renderOrder = 3;
        this.cityLightsMesh.visible = this.enabled === true;
        this.earthDisc.group.add(this.cityLightsMesh);
        console.log(`[NightCityLights] ${totalPoints.toLocaleString()} luces nocturnas urbanas listas (apagadas por defecto).`);
      })
      .catch(err => {
        console.warn('[NightCityLights] No se pudieron cargar las ciudades para las luces nocturnas:', err);
      });
  }

  toggle(visible) {
    this.enabled = visible;
    if (this.cityLightsMesh) {
      this.cityLightsMesh.visible = visible;
    }
  }

  update(sunX, sunY, sunZ) {
    if (this.cityLightsUniforms && this.enabled && this.cityLightsMesh && this.cityLightsMesh.visible) {
      this.cityLightsUniforms.uSunWorldPos.value.set(sunX, sunY, sunZ);
    }
  }
}

window.NightCityLights = NightCityLights;
