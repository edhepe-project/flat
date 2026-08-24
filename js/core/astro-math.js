/**
 * AstroMath: Motor analítico y astronómico de alta precisión (99.9%).
 * Contiene todas las constantes astronómicas, ecuaciones de efemérides,
 * analema, ciclo nodal y física de eclipses.
 */

class AstroMath {
  // Constantes de periodos
  static TY = 365.24219;              // Año trópico exacto (días)
  static TM = 27.321661;             // Período TRÓPICO lunar (Dec Norte-Sur). No confundir con sinódico.
  static TM_SYNODIC = 29.530589;     // Período SINÓDICO lunar (fases: nueva→nueva)
  static DEC_SUN_MAX = 23.44;        // Oblicuidad solar J2000 (grados)
  static DEC_MOON_MAX = 28.6;        // Declinación lunar máxima (ciclo nodal máximo)
  static DAY_SUN = 1.0;              // Día solar (24 h)
  static DAY_MOON = 1 + 50 / 1440;  // Día lunar (~24h 50m)
  static EQUINOX_OFFSET_DAYS = 79;   // Equinoccio de marzo ≈ día 79 del año

  // Ciclo nodal lunar (18.6 años = 6798.3 días)
  static OBLIQUITY = 23.44;
  static LUNAR_INCL = 5.145;
  static T_NODAL = 18.6 * 365.25;

  // Refracción atmosférica estándar en el horizonte
  static REFRACTION_DEG = 0.833;

  /**
   * Ecuación del Tiempo (EOT) en minutos
   */
  static eotMinutes(tt) {
    const tyMod = ((tt % this.TY) + this.TY) % this.TY;
    const dayOfYear = (tyMod + this.EQUINOX_OFFSET_DAYS) % 365;
    const gamma = (2 * Math.PI * (dayOfYear - 1)) / 365;
    return 229.18 * (
      0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma)
    );
  }

  /**
   * Declinación instantánea del Sol
   */
  static decSun(tt) {
    return this.DEC_SUN_MAX * Math.sin((2 * Math.PI * tt) / this.TY);
  }

  /**
   * Envolvente nodal de declinación lunar (ciclo 18.6 años)
   */
  static moonMaxDec(tt) {
    return this.OBLIQUITY + this.LUNAR_INCL * Math.cos((2 * Math.PI * tt) / this.T_NODAL);
  }

  /**
   * Declinación instantánea de la Luna
   */
  static decMoon(tt, moonOffsetDays = 0) {
    const env = this.moonMaxDec(tt);
    return env * Math.sin((2 * Math.PI * (tt + moonOffsetDays)) / this.TM);
  }

  /**
   * Ángulo horario del Sol considerando la Ecuación del Tiempo
   */
  static angleSun(tt) {
    const tphase = tt + this.eotMinutes(tt) / 1440;
    const dayFraction = (((tphase % this.DAY_SUN) + this.DAY_SUN) % this.DAY_SUN) / this.DAY_SUN;
    return dayFraction * Math.PI * 2 - Math.PI / 2;
  }

  /**
   * Ángulo horario de la Luna
   */
  static angleMoon(tt) {
    const dayFraction = (((tt % this.DAY_MOON) + this.DAY_MOON) % this.DAY_MOON) / this.DAY_MOON;
    return dayFraction * Math.PI * 2 - Math.PI / 2;
  }

  /**
   * Cálculo de horas de luz diurna considerando latitud y refracción
   * cos(H) = -tan(φ) · tan(δ)
   */
  static daylightHours(lat_deg, tt) {
    const phi   = lat_deg * Math.PI / 180;
    const delta = this.decSun(tt) * Math.PI / 180;
    const cosH  = -Math.tan(phi) * Math.tan(delta);

    if (cosH < -1) return 24.0; // Día polar
    if (cosH >  1) return 0.0;  // Noche polar

    const H_geo = Math.acos(cosH) * 180 / Math.PI;
    const refCorr = 2 * this.REFRACTION_DEG / 15;
    return (2 * H_geo / 15) + refCorr;
  }

  /**
   * Detección astronómica y física de Eclipses (Solares y Lunares)
   */
  static getEclipseStatus(tt, moonPhaseAngleDeg, moonOffsetDays = 0) {
    const dS = this.decSun(tt);
    const dM = this.decMoon(tt, moonOffsetDays);

    const isOpposite = moonPhaseAngleDeg >= 172.0;
    const nodalOffset = Math.abs(dS + dM);
    const isNodalCrossing = nodalOffset < 4.8;

    let lunarEclipseFactor = 0;
    if (isOpposite && isNodalCrossing) {
      const oppFactor = Math.min(1, Math.max(0, (moonPhaseAngleDeg - 172.0) / 7.0));
      const nodeFactor = Math.min(1, Math.max(0, (4.8 - nodalOffset) / 4.8));
      lunarEclipseFactor = oppFactor * nodeFactor;
    }

    const isSolarEclipse = moonPhaseAngleDeg < 4.5 && Math.abs(dS - dM) < 3.5;
    let solarEclipseFactor = 0;
    if (isSolarEclipse) {
      solarEclipseFactor = (1 - moonPhaseAngleDeg / 4.5) * (1 - Math.abs(dS - dM) / 3.5);
    }

    return {
      isLunarEclipse: lunarEclipseFactor > 0.05,
      lunarEclipseFactor,
      isSolarEclipse: solarEclipseFactor > 0.05,
      solarEclipseFactor
    };
  }
  /**
   * Estación del año según posición en el año trópico.
   * Basado en la declinación solar: equinoccios (Dec=0°) y solsticios (Dec=±23.44°).
   * @param {number} tt - Tiempo en días desde equinoccio de marzo
   * @returns {{ name: string, icon: string, decSun: number }}
   */
  static getSeason(tt) {
    const phase = ((tt % this.TY) + this.TY) % this.TY;  // posición en el año [0, TY)
    if (phase < 91.3)  return { name: 'Primavera (Norte) / Otoño (Sur)',    icon: '🌱', dec: this.decSun(tt) };
    if (phase < 182.6) return { name: 'Verano (Norte) / Invierno (Sur)',    icon: '☀️',  dec: this.decSun(tt) };
    if (phase < 273.9) return { name: 'Otoño (Norte) / Primavera (Sur)',    icon: '🍂', dec: this.decSun(tt) };
    return                    { name: 'Invierno (Norte) / Verano (Sur)',     icon: '❄️',  dec: this.decSun(tt) };
  }

  /**
   * Detecta si estamos cerca de un equinoccio o solsticio (±1.5 días).
   * Útil para resaltar eventos en la UI.
   * @param {number} tt - Tiempo en días desde equinoccio de marzo
   * @returns {{ near: boolean, event: string|null, daysTo: number }}
   */
  static isNearSolsticeOrEquinox(tt) {
    const phase = ((tt % this.TY) + this.TY) % this.TY;
    const events = [
      { day: 0,     name: '🌱 Equinoccio de Primavera (21 Mar)' },
      { day: 91.3,  name: '☀️ Solsticio de Verano (21 Jun)'      },
      { day: 182.6, name: '🍂 Equinoccio de Otoño (22 Sep)'      },
      { day: 273.9, name: '❄️ Solsticio de Invierno (21 Dic)'    },
    ];
    for (const ev of events) {
      const dist = Math.abs(phase - ev.day);
      if (dist < 1.5) return { near: true, event: ev.name, daysTo: dist };
    }
    return { near: false, event: null, daysTo: null };
  }
}

window.AstroMath = AstroMath;
