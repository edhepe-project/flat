/**
 * GeoParser: Parser universal y robusto de coordenadas geográficas.
 * Soporta:
 * 1. Decimal: "16.9242, -96.3594" o "16.9242 -96.3594"
 * 2. Con cardinalidad y grados: "16.9242° N, 96.3594° O" / "16.9242° N, -96.3594°"
 * 3. DMS (Grados, Minutos, Segundos): "16° 55' 27\" N, 96° 21' 34\" O"
 * 4. Notaciones en español e inglés (N, S, E, W, O).
 */

class GeoParser {
  static parseCoordinates(str) {
    if (!str || typeof str !== 'string') return null;

    const clean = str.trim();

    // Separar en dos componentes (Latitud y Longitud) por coma o punto y coma
    let parts = [];
    if (clean.includes(',')) {
      parts = clean.split(',');
    } else if (clean.includes(';')) {
      parts = clean.split(';');
    } else {
      // Si no hay separador, intentar por letra cardinal (N/S seguido de números)
      const splitMatch = clean.match(/(.*?[NSns])\s+(.*)/);
      if (splitMatch) {
        parts = [splitMatch[1], splitMatch[2]];
      } else {
        const spaceParts = clean.split(/\s+/);
        if (spaceParts.length === 2) {
          parts = spaceParts;
        } else {
          return null;
        }
      }
    }

    if (parts.length < 2) return null;

    const latVal = this.parseSingleCoordinate(parts[0]);
    const lonVal = this.parseSingleCoordinate(parts[1]);

    if (latVal === null || lonVal === null) return null;

    if (latVal >= -90 && latVal <= 90 && lonVal >= -180 && lonVal <= 180) {
      return { lat: latVal, lon: lonVal };
    }

    return null;
  }

  static parseSingleCoordinate(coordStr) {
    if (!coordStr) return null;
    let s = coordStr.trim().toUpperCase();

    // Detectar signo por letra cardinal: N=+ S=- E=+ W/O=-
    let signMultiplier = 1;
    if (s.includes('S')) {
      signMultiplier = -1;
      s = s.replace(/S/g, '');
    } else if (s.includes('N')) {
      signMultiplier = 1;
      s = s.replace(/N/g, '');
    }

    if (s.includes('W') || s.includes('O')) {
      signMultiplier = -1;
      s = s.replace(/[WO]/g, '');
    } else if (s.includes('E')) {
      signMultiplier = 1;
      s = s.replace(/E/g, '');
    }

    // Normalizar caracteres de grados, minutos y segundos: °, ', ", '', ´, etc.
    s = s.replace(/[°ºD]/g, ' ')
         .replace(/['’´]/g, ' ')
         .replace(/["”]/g, ' ')
         .replace(/,/g, '.')
         .trim();

    // Extraer todos los números
    const numMatches = s.match(/-?\d+(\.\d+)?/g);
    if (!numMatches || numMatches.length === 0) return null;

    const nums = numMatches.map(Number);

    let decimal = 0;
    if (nums.length === 1) {
      // Grados decimales: ej. "16.9242"
      decimal = nums[0];
    } else if (nums.length === 2) {
      // Grados y minutos: ej. "16° 55.45'"
      const deg = Math.abs(nums[0]);
      const min = nums[1];
      decimal = deg + (min / 60);
      if (nums[0] < 0) signMultiplier = -signMultiplier;
    } else if (nums.length >= 3) {
      // Grados, minutos y segundos (DMS): ej. "16° 55' 27""
      const deg = Math.abs(nums[0]);
      const min = nums[1];
      const sec = nums[2];
      decimal = deg + (min / 60) + (sec / 3600);
      if (nums[0] < 0) signMultiplier = -signMultiplier;
    }

    return decimal * signMultiplier;
  }
}

window.GeoParser = GeoParser;
