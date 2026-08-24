/**
 * EphemerisEngine: Motor de Efemérides Astronómicas de Alta Precisión (Jean Meeus / VSOP87 / ELP-2000).
 * Calcula conversiones de fecha Juliana, longitudes, latitudes eclípticas y elongación lunar verdadera.
 */

class EphemerisEngine {
  static tToJD(tt) {
    return 2461120.5 + tt;
  }

  static jdToT(jd) {
    return jd - 2461120.5;
  }

  static dateToT(year, month, day, hour = 12, min = 0, sec = 0) {
    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    const dayFrac = day + (hour + min / 60 + sec / 3600) / 24;
    const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + dayFrac + B - 1524.5;
    return this.jdToT(jd);
  }

  static tToDate(tt) {
    const jd = this.tToJD(tt);
    const z = Math.floor(jd + 0.5);
    const f = (jd + 0.5) - z;
    let a = z;
    if (z >= 2299161) {
      const alpha = Math.floor((z - 1867216.25) / 36524.25);
      a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e) + f;
    const month = (e < 14) ? (e - 1) : (e - 13);
    const year = (month > 2) ? (c - 4716) : (c - 4715);
    
    const dayInt = Math.floor(day);
    const dayFrac = day - dayInt;
    const totalSecs = Math.round(dayFrac * 86400);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    return { year, month, day: dayInt, hours, mins, secs };
  }

  static calculate(tt) {
    const JD = this.tToJD(tt);
    const T = (JD - 2451545.0) / 36525.0;
    const T2 = T * T;
    const T3 = T2 * T;

    // SOL (Jean Meeus Cap. 25)
    let L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T2) % 360;
    if (L0 < 0) L0 += 360;

    let M_sun = (357.52911 + 35999.05029 * T - 0.0001537 * T2) % 360;
    if (M_sun < 0) M_sun += 360;
    const Mrad = (M_sun * Math.PI) / 180;

    const C_sun = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(Mrad)
                + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
                + 0.000289 * Math.sin(3 * Mrad);
    const sunLong = (L0 + C_sun + 360) % 360;

    // LUNA (Jean Meeus Cap. 47 / ELP-2000)
    let Lp = (218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841.0) % 360;
    if (Lp < 0) Lp += 360;

    let D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868.0) % 360;
    if (D < 0) D += 360;

    let M = (134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699.0) % 360;
    if (M < 0) M += 360;

    let F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000.0) % 360;
    if (F < 0) F += 360;

    const toRad = Math.PI / 180;
    const Dr = D * toRad;
    const Mr = M * toRad;
    const Msr = M_sun * toRad;
    const Fr = F * toRad;

    const sumL = 6.288774 * Math.sin(Mr)
               + 1.274027 * Math.sin(2 * Dr - Mr)
               + 0.658314 * Math.sin(2 * Dr)
               + 0.213618 * Math.sin(2 * Mr)
               - 0.185116 * Math.sin(Msr)
               - 0.114332 * Math.sin(2 * Fr)
               + 0.058793 * Math.sin(2 * Dr - 2 * Mr)
               + 0.057066 * Math.sin(2 * Dr - Msr - Mr)
               + 0.053322 * Math.sin(2 * Dr + Mr)
               + 0.045758 * Math.sin(2 * Dr - Msr)
               - 0.040923 * Math.sin(Msr - Mr)
               - 0.034720 * Math.sin(Dr)
               - 0.030383 * Math.sin(Msr + Mr)
               + 0.015327 * Math.sin(2 * Dr - 2 * Fr)
               - 0.012528 * Math.sin(2 * Fr + Mr)
               + 0.010980 * Math.sin(2 * Fr - Mr);

    const moonLong = (Lp + sumL + 360) % 360;

    const sumB = 5.128163 * Math.sin(Fr)
               + 0.280602 * Math.sin(Mr + Fr)
               + 0.277693 * Math.sin(Mr - Fr)
               + 0.173237 * Math.sin(2 * Dr - Fr)
               + 0.055413 * Math.sin(2 * Dr - Mr + Fr)
               + 0.046271 * Math.sin(2 * Dr - Mr - Fr)
               + 0.032573 * Math.sin(2 * Dr + Fr)
               + 0.017198 * Math.sin(2 * Mr + Fr);

    const moonLat = sumB;
    const elongDeg = (moonLong - sunLong + 360) % 360;

    return { sunLong, moonLong, moonLat, elongDeg };
  }
}

window.EphemerisEngine = EphemerisEngine;
