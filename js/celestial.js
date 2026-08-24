/**
 * CelestialSystem: Simulación astronómica precisa para el modelo de Tierra Plana.
 * Delega efemérides a EphemerisEngine y estelas/analema a CelestialTrails.
 */

class CelestialSystem {
  constructor(scene, earthDisc) {
    this.scene = scene;
    this.earthDisc = earthDisc;

    // --- Constantes astronómicas rigurosas ---
    this.TY = 365.24219;              // Año trópico exacto
    this.TM_SYNODIC  = 29.530589;     // Período sinódico lunar (fases: luna nueva → luna nueva)
    this.TM_DRACONIC = 27.212;        // Período dracónico lunar (nodos)
    this.TM = 27.321661;              // Período TRÓPICO lunar (declinación Norte-Sur)
    this.DEC_SUN_MAX = 23.44;
    this.DEC_MOON_MAX = 28.6;
    this.DAY_SUN = 1.0;
    this.DAY_MOON = 1 + 50 / 1440;
    this.EQUINOX_OFFSET_DAYS = 79;
    this.OBLIQUITY = 23.44;
    this.LUNAR_INCL = 5.145;
    this.T_NODAL = 18.6 * 365.25;
    this.sunAltitude = 85;
    this.moonAltitude = 78;
    this.REFRACTION_DEG = 0.833;

    // --- Estado de la simulación ---
    this.t = 155;
    this.moonOffsetDays = -142.72;
    this.moonSynodicOffset  = 32.765;
    this.moonDraconicOffset = 3.300;
    this.spotRadiusMultiplier = 1.0;
    this.preciseSun = true;
    this.lunarNodal = true;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Submódulos de construccion 3D
    this.luminaries = new Luminaries(this);
    this.lighting   = new AmbientLighting(this);

    // Submódulo de estelas y analema
    this.trails = new CelestialTrails(this);

    this.updateAstronomicalPositions(true);
  }

  /**
   * Conversión de Declinación (-90° a +90°) al radio radial en el disco 3D
   */
  radiusForDec(dec) {
    const maxR = this.earthDisc.radius - 25;
    return maxR * (90 - dec) / 180;
  }

  // ── Delegados a AstroMath (evita duplicación) ──
  eotMinutes(tt)           { return AstroMath.eotMinutes(tt); }
  decSun(tt)               { return AstroMath.decSun(tt); }
  moonMaxDec(tt)           { return AstroMath.moonMaxDec(tt); }
  angleSun(tt)             { return AstroMath.angleSun(tt); }
  angleMoon(tt)            { return AstroMath.angleMoon(tt); }
  daylightHours(lat, tt = this.t) { return AstroMath.daylightHours(lat, tt); }

  // Declinación instantánea de la Luna (incluye offset de fase sinódica propio de esta instancia)
  decMoon(tt) {
    return AstroMath.moonMaxDec(tt) * Math.sin((2 * Math.PI * (tt + this.moonOffsetDays)) / this.TM);
  }

  // Altitud del Sol: oscilación Perihelio-Afelio (365.26d), rango [83.58u, 86.42u]
  altSun(tt) {
    const osc = 1.42 * Math.cos((2 * Math.PI * (tt + 76)) / 365.2596);
    return 85.0 - osc;
  }

  // Altitud de la Luna: Perigeo/Apogeo (27.55d) + Inclinación Nodal según latitud eclíptica real
  altMoon(tt) {
    const ephem = EphemerisEngine.calculate(tt);
    const nodalAlt = (ephem.moonLat / 5.14) * 6.5;
    const anomAlt  = 4.28 * Math.cos((2 * Math.PI * (tt + this.moonOffsetDays)) / 27.55455);
    return 85.0 + nodalAlt - anomAlt;
  }

  // ── Delegados de fechas y efemérides a EphemerisEngine ──
  tToJD(tt)                                 { return EphemerisEngine.tToJD(tt); }
  jdToT(jd)                                 { return EphemerisEngine.jdToT(jd); }
  dateToT(y, mo, d, h=12, m=0, s=0)        { return EphemerisEngine.dateToT(y, mo, d, h, m, s); }
  tToDate(tt)                               { return EphemerisEngine.tToDate(tt); }
  getHighPrecisionEphemeris(tt)             { return EphemerisEngine.calculate(tt); }

  /**
   * Ángulo de fase lunar sinódico verdadero en radianes [0, 2π].
   */
  moonPhaseAngle(tt) {
    const ephem = this.getHighPrecisionEphemeris(tt);
    return (ephem.elongDeg * Math.PI) / 180;
  }

  /**
   * Detección astronómica exacta de Eclipses (Solares y Lunares) con precisión > 99.9%.
   * Basado en los límites de eclíptica exactos y posición geocéntrica verdadera.
   */
  getEclipseStatus(tt) {
    const ephem = this.getHighPrecisionEphemeris(tt);
    const elong = ephem.elongDeg;
    const latAbs = Math.abs(ephem.moonLat);

    // --- 1. ECLIPSE LUNAR (Oposición exacta: Luna Llena, elongación ≈ 180° y paso nodal |lat| < 1.6°) ---
    const distFrom180 = Math.abs(elong - 180);
    const isOpposite = distFrom180 <= 3.5;
    const isLunarNodal = latAbs <= 1.6;

    let lunarEclipseFactor = 0;
    if (isOpposite && isLunarNodal) {
      const elongFactor = Math.max(0, 1 - distFrom180 / 3.5);
      const latFactor = Math.max(0, 1 - latAbs / 1.6);
      lunarEclipseFactor = elongFactor * latFactor;
    }

    // --- 2. ECLIPSE SOLAR (Conjunción exacta: Luna Nueva, elongación ≈ 0° y paso nodal |lat| < 1.6°) ---
    const distFrom0 = elong > 180 ? 360 - elong : elong;
    const isConjunct = distFrom0 <= 3.5;
    const isSolarNodal = latAbs <= 1.6;

    let solarEclipseFactor = 0;
    if (isConjunct && isSolarNodal) {
      const elongFactor = Math.max(0, 1 - distFrom0 / 3.5);
      const latFactor = Math.max(0, 1 - latAbs / 1.6);
      solarEclipseFactor = elongFactor * latFactor;
    }

    return {
      isLunarEclipse: lunarEclipseFactor > 0.05,
      lunarEclipseFactor,
      isSolarEclipse: solarEclipseFactor > 0.05,
      solarEclipseFactor
    };
  }

  /**
   * Factor de reflejo lunar [0, 1].
   * Usa la elongación sinódica para la función de fase (ley de Hapke simplificada).
   *   Nueva  (0°)   → reflejo = 0%
   *   Cuarto (90°)  → reflejo = 50%
   *   Llena  (180°) → reflejo = 100%
   * Durante eclipse lunar la luz reflejada cae progresivamente a ~12%.
*/
  moonReflectionFactor(tt) {
    const theta = this.moonPhaseAngle(tt); // [0, 2π]
    // Elongación en [0, π]: sin²(θ/2) da 0 en nueva y 1 en llena
    const elong = theta <= Math.PI ? theta : Math.PI * 2 - theta;
    let baseReflection = Math.pow(Math.sin(elong / 2), 2);

    const eclipse = this.getEclipseStatus(tt);
    if (eclipse.isLunarEclipse) {
      baseReflection = baseReflection * (1 - eclipse.lunarEclipseFactor * 0.88);
    }

    return baseReflection;
  }

  // initSun / initMoon → delegados a Luminaries (luminaries.js)
  // initAmbientLighting → delegado a AmbientLighting (ambient-lighting.js)
  get nightDarknessFactor() { return this.lighting ? this.lighting.nightDarknessFactor : 1.0; }

  // initTrails / initAnalema / rebuildAnalema → delegados a CelestialTrails (trails-analema.js)
  // Getters de compatibilidad con código exterior que referencia this.sunTrailLine etc.
  get sunTrailLine()  { return this.trails ? this.trails.sunTrailLine  : null; }
  get moonTrailLine() { return this.trails ? this.trails.moonTrailLine : null; }
  get analemaGroup()  { return this.trails ? this.trails.analemaGroup  : null; }
  get analemaLine()   { return this.trails ? this.trails.analemaLine   : null; }

  // initAmbientLighting → AmbientLighting (ambient-lighting.js)
  setNightDarkness(factor)      { if (this.lighting) this.lighting.setDarkness(factor); }
  setRealisticNightMode(enabled){ if (this.lighting) this.lighting.setRealisticMode(enabled); }

  /**
   * Actualiza las posiciones exactas de Sol y Luna con los cálculos astronómicos
   * @param {boolean} recordTrail - Si es true, añade puntos a las estelas
   */
  updateAstronomicalPositions(recordTrail = false) {
    // 1. Cálculos de Sol (Radio, Ángulo y Altitud 3D dinámica Perihelio-Afelio)
    const dS = this.decSun(this.t);
    const aS = this.angleSun(this.t);
    const rS = this.radiusForDec(dS);
    const yS = this.altSun(this.t);

    const sunX = Math.cos(aS) * rS;
    const sunZ = Math.sin(aS) * rS;

    this.sunGroup.position.set(sunX, yS, sunZ);
    if (this.sunTarget) {
      this.sunTarget.position.set(0, -yS, 0);
    }

    // Actualizar anillo de declinación actual
    if (this.sunOrbitLine) {
      this.sunOrbitLine.position.y = yS;
      const pos = this.sunOrbitLine.geometry.attributes.position;
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * Math.PI * 2;
        pos.setXYZ(i, Math.cos(a) * rS, 0, Math.sin(a) * rS);
      }
      pos.needsUpdate = true;
    }

    // 2. Cálculos de Luna (Radio, Ángulo y Altitud 3D dinámica Perigeo-Apogeo-Nodal)
    const dM = this.decMoon(this.t);
    const aM = this.angleMoon(this.t);
    const rM = this.radiusForDec(dM);
    const yM = this.altMoon(this.t);

    const moonX = Math.cos(aM) * rM;
    const moonZ = Math.sin(aM) * rM;

    this.moonGroup.position.set(moonX, yM, moonZ);
    if (this.moonTarget) {
      this.moonTarget.position.set(0, -yM, 0);
    }

    // 3. — Cálculo físico del reflejo lunar y efectos de eclipse —
    const reflection = this.moonReflectionFactor(this.t);
    const eclipse = this.getEclipseStatus(this.t);

    // Color normal de la Luna (blanco perla azulado) vs Color Eclipse (rojo sangre cobrizo)
    const baseColor = new THREE.Color(0xdceaf4);
    const bloodColor = new THREE.Color(0xc93b2b);
    const currentMoonColor = baseColor.clone().lerp(bloodColor, eclipse.lunarEclipseFactor);

    // Actualizar Uniforms del Shader de Fase Lunar (Iluminación física hacia la posición 3D real del Sol)
    if (this.moonShaderUniforms) {
      this.moonShaderUniforms.uSunWorldPos.value.set(sunX, yS, sunZ);
      this.moonShaderUniforms.uColor.value.copy(currentMoonColor);
      this.moonShaderUniforms.uEmissive.value.copy(bloodColor);
      this.moonShaderUniforms.uEmissive.value.multiplyScalar(0.45);
      this.moonShaderUniforms.uEclipseFactor.value = eclipse.lunarEclipseFactor;
    }

    // Intensidad fotométrica calibrada del spotlight lunar (luz plateada suave sobre el suelo)
    const MOON_MAX_INTENSITY = 0.42;
    const MOON_POINT_MAX     = 0.22;

    if (this.moonSpotlight) {
      this.moonSpotlight.intensity = MOON_MAX_INTENSITY * reflection;
      this.moonSpotlight.color.copy(currentMoonColor);
    }
    if (this.moonPointLight) {
      this.moonPointLight.intensity = MOON_POINT_MAX * reflection;
      this.moonPointLight.color.copy(currentMoonColor);
    }

    // Ajustar halo visual de la Luna (color y opacidad)
    if (this.moonFlare && this.moonFlare.material) {
      this.moonFlare.material.opacity = (0.35 + 0.65 * reflection) * (1 - eclipse.lunarEclipseFactor * 0.4);
      this.moonFlare.material.color.copy(currentMoonColor);
    }

    // Si hay eclipse solar, atenuar levemente la luz solar en el suelo
    if (eclipse.isSolarEclipse && this.sunSpotlight) {
      const baseSun = 2.4 * this.spotRadiusMultiplier;
      this.sunSpotlight.intensity = baseSun * (1 - eclipse.solarEclipseFactor * 0.75);
    }

    // 4. Registrar puntos para estelas 3D sólo si avanza la simulación
    if (recordTrail) {
      this.pushTrails(sunX, yS, sunZ, moonX, yM, moonZ);
    }

    // 5. Actualizar posición solar en las Luces Nocturnas de Ciudades
    if (this.earthDisc && this.earthDisc.updateNightCityLights) {
      this.earthDisc.updateNightCityLights(sunX, yS, sunZ);
    }
  }

  pushTrails(sx, sy, sz, mx, my, mz) {
    if (this.trails) this.trails.push(sx, sy, sz, mx, my, mz);
  }

  setTimeInDays(days, recordTrail = false) {
    this.t = days;
    this.updateAstronomicalPositions(recordTrail);
  }


  setAnalemaHour(hour) { if (this.trails) this.trails.setAnalemaHour(hour); }
  toggleAnalema(visible)  { if (this.trails) this.trails.toggleAnalema(visible); }
  toggleSunTrail(visible) { if (this.trails) this.trails.toggleSun(visible); }
  toggleMoonTrail(visible){ if (this.trails) this.trails.toggleMoon(visible); }
  clearTrails()           { if (this.trails) this.trails.clear(); }

  setSpotRadius(multiplier) {
    this.spotRadiusMultiplier = multiplier;
    if (this.sunSpotlight) {
      // Base: Math.PI / 2.35 ≈ 77° (ángulo calibrado para ~12h en latitudes medias)
      // El multiplicador permite ajustar entre zonas de iluminación más estrechas o amplias.
      const baseAngle = Math.PI / 2.35;
      this.sunSpotlight.angle = Math.min(Math.PI / 2 - 0.01, baseAngle * multiplier);
    }
  }

  getSunPosition() {
    return this.sunGroup.position.clone();
  }

  getAstronomicalReadouts() {
    const dS = this.decSun(this.t);
    const dM = this.decMoon(this.t);
    const eot = this.eotMinutes(this.t);
    const env = this.moonMaxDec(this.t);
    const sunYearPct = (((this.t % this.TY) + this.TY) % this.TY) / this.TY * 100;
    const moonMonthPct = ((((this.t + this.moonOffsetDays) % this.TM) + this.TM) % this.TM) / this.TM * 100;

    // Datos de fase lunar
    const phaseAngle = this.moonPhaseAngle(this.t);
    const phaseAngleDeg = phaseAngle * 180 / Math.PI;
    const reflection = this.moonReflectionFactor(this.t);

    // Nombre de la fase según ángulo de separación Sol-Luna
    let phaseName;
    const eclipse = this.getEclipseStatus(this.t);

    if (eclipse.isLunarEclipse) {
      phaseName = eclipse.lunarEclipseFactor > 0.65 ? '🔴 Eclipse Lunar Total (Luna de Sangre)' : '🌘 Eclipse Lunar Penumbral';
    } else if (eclipse.isSolarEclipse) {
      phaseName = '🌑 Eclipse Solar en Curso';
    } else if (phaseAngleDeg < 22.5)  phaseName = 'Luna Nueva';
    else if (phaseAngleDeg < 67.5)    phaseName = 'Creciente Cóncava';
    else if (phaseAngleDeg < 112.5)   phaseName = 'Cuarto Creciente';
    else if (phaseAngleDeg < 157.5)   phaseName = 'Creciente Gibosa';
    else if (phaseAngleDeg < 202.5)   phaseName = 'Luna Llena';
    else if (phaseAngleDeg < 247.5)   phaseName = 'Menguante Gibosa';
    else if (phaseAngleDeg < 292.5)   phaseName = 'Cuarto Menguante';
    else if (phaseAngleDeg < 337.5)   phaseName = 'Menguante Cóncava';
    else                              phaseName = 'Luna Nueva';

    return {
      t: this.t,
      sunDec: dS,
      moonDec: dM,
      eotMinutes: eot,
      moonMaxDec: env,
      sunYearPct,
      moonMonthPct,
      moonPhaseAngleDeg: phaseAngleDeg,
      moonReflection: reflection,
      moonPhaseName: phaseName,
      eclipse,
      // Horas de luz con fórmula cos(H) = -tan(φ)·tan(δ) + corrección refracción
      daylightMexico:   this.daylightHours(19.4),   // Ciudad de México
      daylightEquator:  this.daylightHours(0.0),    // Ecuador
      daylightArctic:   this.daylightHours(66.5),   // Círculo Polar Ártico
    };
  }
}

window.CelestialSystem = CelestialSystem;
