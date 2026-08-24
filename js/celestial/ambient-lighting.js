/**
 * AmbientLighting: Iluminación ambiental de la escena (día/noche).
 * Gestiona AmbientLight, HemisphereLight y los modos de oscuridad.
 */

class AmbientLighting {
  constructor(celestialSystem) {
    this.cs = celestialSystem;
    this.nightDarknessFactor = 1.0;
    this.baseAmbientIntensity    = 0.22;
    this.baseHemisphereIntensity = 0.18;
    this.realisticNightMode = false;

    this._init();
  }

  _init() {
    const cs = this.cs;

    this.ambientLight = new THREE.AmbientLight(0x060912, this.baseAmbientIntensity);
    cs.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x142032, 0x020408, this.baseHemisphereIntensity);
    cs.scene.add(this.hemisphereLight);

    // Exponer en cs para compatibilidad con código externo
    cs.ambientLight    = this.ambientLight;
    cs.hemisphereLight = this.hemisphereLight;
  }

  /**
   * Ajusta la intensidad de la oscuridad nocturna [0.0 → 2.0].
   * 0.0 = muy claro (estudio cartográfico)
   * 1.0 = estándar
   * 2.0 = oscuridad fotométrica absoluta
   */
  setDarkness(factor) {
    this.nightDarknessFactor = factor;
    let mult = 1.0;
    if (factor <= 1.0) {
      mult = 1.0 + (1.0 - factor) * 2.2;
    } else {
      mult = Math.max(0.0, 1.0 - (factor - 1.0));
    }
    this.ambientLight.intensity    = this.baseAmbientIntensity    * mult;
    this.hemisphereLight.intensity = this.baseHemisphereIntensity * mult;
  }

  /**
   * Modo Noche Realista: oscuridad espacial absoluta (0 lux ambiental).
   */
  setRealisticMode(enabled) {
    this.realisticNightMode = enabled;
    if (enabled) {
      this.ambientLight.intensity    = 0.0;
      this.hemisphereLight.intensity = 0.0;
    } else {
      this.setDarkness(this.nightDarknessFactor);
    }
  }
}

window.AmbientLighting = AmbientLighting;
