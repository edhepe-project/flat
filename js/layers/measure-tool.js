/**
 * MeasureEngine: Motor de cálculo y comparativa de distancias.
 * 1. Distancia en disco plano (Azimutal Equidistante)
 * 2. Distancia en esfera real WGS84 (Fórmula de Haversine)
 */

class MeasureEngine {
  static calculate(lat1, lon1, lat2, lon2, discRadius = 475) {
    // 1. Esfera Real: Haversine
    const R = 6371; // Radio medio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const globeDist = R * c;

    // 2. Modelo Plano Azimutal: Distancia Euclidiana en el plano proyectado
    const maxR = discRadius - 25;
    const r1 = maxR * (90 - lat1) / 180;
    const rad1 = (lon1 * Math.PI) / 180;
    const p1x = r1 * Math.sin(rad1);
    const p1z = -r1 * Math.cos(rad1);

    const r2 = maxR * (90 - lat2) / 180;
    const rad2 = (lon2 * Math.PI) / 180;
    const p2x = r2 * Math.sin(rad2);
    const p2z = -r2 * Math.cos(rad2);

    const dx = p2x - p1x;
    const dz = p2z - p1z;
    const distEuclid = Math.sqrt(dx * dx + dz * dz);

    const unitsToKm = 40075 / (2 * Math.PI * (discRadius * (90 / 180)));
    const flatDist = distEuclid * unitsToKm;

    const diffPercent = (((flatDist - globeDist) / globeDist) * 100).toFixed(1);

    return {
      flatDistKm: Math.round(flatDist).toLocaleString() + ' km',
      globeDistKm: Math.round(globeDist).toLocaleString() + ' km',
      diffPercent: (diffPercent > 0 ? '+' : '') + diffPercent + '%',
      rawFlatKm: flatDist,
      rawGlobeKm: globeDist
    };
  }
}

window.MeasureEngine = MeasureEngine;
