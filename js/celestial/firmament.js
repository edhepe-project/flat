/**
 * CelestialSphere: Gran Esfera Celeste Unificada (Bóveda Estelar 360°).
 * Cubre toda la planicie infinita mediante distribución matemática de Fibonacci Áureo.
 * Genera estrellas con espectro físico real (O, B, A, F, G, K, M), estrellas mayores
 * y rotación en ciclo sideral de 23h 56m 4.09s (1 día sideral).
 */

class CelestialSphere {
  constructor(earthDisc) {
    this.earthDisc = earthDisc;
    this.group = new THREE.Group();
    this.earthDisc.group.add(this.group);

    // Radio de la Gran Esfera Celeste (escala colosal que envuelve la planicie)
    this.sphereRadius = this.earthDisc.radius * 1.85; // ~925 unidades
    this.sphereHeightScale = 1.0;

    this.starPoints = null;
    this.majorStars = null;
    this.gridMesh   = null;
    this.sphereShell= null;

    // Día sideral en días terrestres: 23h 56m 4.0905s / 24h = 0.997269566
    this.SIDEREAL_DAY = 0.997269566;

    this.init();
    this.group.visible = false;
  }

  init() {
    this._createSphereShell();
    this._createFibonacciStars();
    this._createMajorConstellationStars();
    this._createCelestialGrid();
  }

  /**
   * 1. Bóveda Translúcida / Atmósfera de la Esfera Celeste 360° Completa
   */
  _createSphereShell() {
    const geo = new THREE.SphereGeometry(
      this.sphereRadius,
      64,
      64,
      0,
      Math.PI * 2,
      0,
      Math.PI // 0 a PI genera la esfera 360° completa (arriba y abajo)
    );

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.04,
      roughness: 0.2,
      transmission: 0.85,
      thickness: 2.0,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.sphereShell = new THREE.Mesh(geo, mat);
    this.group.add(this.sphereShell);
  }

  /**
   * 2. Estrellas Distribuidas en la Esfera 360° Total con la Espiral de Fibonacci Áurea
   * Cubre tanto el hemisferio superior (Norte) como el hemisferio inferior (Sur por debajo de la tierra).
   */
  _createFibonacciStars() {
    const starCount = 3000; // Fondo difuso reducido: las estrellas reales las agrega el catálogo BSC5
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors    = new Float32Array(starCount * 3);
    const sizes     = new Float32Array(starCount);

    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.39996323 rad (137.5077°)
    const R = this.sphereRadius * 0.985;

    // Paleta de temperaturas estelares reales (Morgan-Keenan: O, B, A, F, G, K, M)
    const spectralColors = [
      new THREE.Color(0x9db4ff), // O / B: Azul brillante (Vega, Rigel)
      new THREE.Color(0xbbccff), // A: Blanco azulado (Sirio)
      new THREE.Color(0xf8f9fa), // F: Blanco puro (Procyon)
      new THREE.Color(0xfff4e8), // G: Amarillo solar (Capella, Sol)
      new THREE.Color(0xffddb4), // K: Naranja (Arturo, Aldebarán)
      new THREE.Color(0xffbd69), // M: Rojo cobrizo (Betelgeuse, Antares)
    ];

    for (let i = 0; i < starCount; i++) {
      // Coordenada X normalizada en la esfera 360° total: va de +1 (+X Polaris) a -1 (-X Polo Sur)
      const xNorm = 1.0 - (2.0 * i) / (starCount - 1);
      const radiusAtX = Math.sqrt(Math.max(0, 1 - xNorm * xNorm));
      const theta = i * GOLDEN_ANGLE;

      const x = R * xNorm;
      const y = R * radiusAtX * Math.cos(theta);
      const z = R * radiusAtX * Math.sin(theta);

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;



      // Color espectral aleatorio ponderado
      const randType = Math.random();
      let starColor;
      if (randType > 0.88)      starColor = spectralColors[0]; // Azul O/B
      else if (randType > 0.70) starColor = spectralColors[1]; // Blanco-Azul A
      else if (randType > 0.45) starColor = spectralColors[2]; // Blanco F
      else if (randType > 0.20) starColor = spectralColors[3]; // Amarillo G
      else if (randType > 0.08) starColor = spectralColors[4]; // Naranja K
      else                      starColor = spectralColors[5]; // Rojo M

      colors[i * 3]     = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      // Magnitud aparente (tamaño)
      const magRand = Math.random();
      if (magRand > 0.95)      sizes[i] = 3.6; // 1ra magnitud
      else if (magRand > 0.75) sizes[i] = 2.5; // 2da magnitud
      else if (magRand > 0.40) sizes[i] = 1.8; // 3ra magnitud
      else                     sizes[i] = 1.2; // 4ta-5ta magnitud
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    });

    this.starPoints = new THREE.Points(geo, mat);
    this.group.add(this.starPoints);
  }

  /**
   * Helper: Convierte coordenadas astronómicas ecuatoriales (Ascensión Recta en horas y Declinación en grados)
   * a un Vector3 sobre la Gran Esfera Celeste 360°.
   * Calibrado para que POLARIS esté EXACTAMENTE sobre el Eje de Rotación (X):
   *   - Dec = +90° (Polaris) se ubica en el extremo del Eje de Giro (+X, 0, 0) -> INMÓVIL AL ROTAR
   *   - Dec = -90° (Cruz del Sur / Octans) se ubica en el extremo opuesto (-X, 0, 0)
   *   - RA gira en círculos concéntricos en el plano (Y, Z) alrededor del eje X
   *   - CONVENCIÓN: RA=0h apunta a +Y. RA crece hacia Este (−Z) para que la rotación
   *     +X del grupo mueva las estrellas de Este a Oeste (dirección diurna correcta).
   */
  raDecToSphereVector(raHours, decDeg, radius = this.sphereRadius * 0.985) {
    const raRad = (raHours / 24) * Math.PI * 2;
    const decRad = (decDeg * Math.PI) / 180;

    // Eje de Rotación X: Polaris en +X, Polo Sur en -X
    const x = radius * Math.sin(decRad);   // +90°->+X (Norte inmóvil), -90°->-X (Sur)
    const rCirc = radius * Math.cos(decRad);
    const y = rCirc * Math.cos(raRad);   // RA=0h -> +Y (meridiano de referencia)
    const z = rCirc * Math.sin(raRad);    // RA=6h -> +Z  (positivo: sentido anti-horario visto desde +X)

    return new THREE.Vector3(x, y, z);
  }



  /**
   * 3. Estrellas reales del catálogo Yale BSC5
   */
  _createMajorConstellationStars() {
    const majorStarsGroup = new THREE.Group();
    const R = this.sphereRadius * 0.985;

    // ── Fallback si el catálogo no cargó ──
    if (!window.STAR_CATALOG) {
      console.warn('CelestialSphere: STAR_CATALOG no disponible.');
      const p = new THREE.Mesh(new THREE.SphereGeometry(1.8,12,12), new THREE.MeshBasicMaterial({color:0xe0f2fe}));
      p.position.copy(this.raDecToSphereVector(2.53, 89.26, R));
      majorStarsGroup.add(p);
      this.majorStars = majorStarsGroup;
      this.group.add(this.majorStars);
      return;
    }

    const catalog = window.STAR_CATALOG;
    const spectral = window.SPECTRAL_COLORS || {
      'O':0x9db4ff,'B':0xaabfff,'A':0xcad7ff,'F':0xfff4ea,'G':0xffd2a1,'K':0xffb466,'M':0xff6b35
    };

    // ── Pre-calcular posiciones 3D de todas las estrellas ──
    const starPositions = catalog.map(s => this.raDecToSphereVector(s[0], s[1], R));

    // ── Generar textura de punto estelar con difracción (Patrón de Airy) ──
    const makeStarTexture = (hexColor, size = 64) => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      const cx = size / 2, cy = size / 2, maxR = size * 0.48;
      const hexStr = hexColor.toString(16).padStart(6, '0');
      const r = parseInt(hexStr.slice(0,2),16);
      const g = parseInt(hexStr.slice(2,4),16);
      const b = parseInt(hexStr.slice(4,6),16);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      grad.addColorStop(0.00, `rgba(255,255,255,1.0)`);
      grad.addColorStop(0.06, `rgba(${r},${g},${b},1.0)`);
      grad.addColorStop(0.25, `rgba(${r},${g},${b},0.55)`);
      grad.addColorStop(0.55, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(1.00, `rgba(${r},${g},${b},0.0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    };

    // ── Sistema de partículas (THREE.Points) para todas las estrellas ──
    const positions = new Float32Array(catalog.length * 3);
    const colors    = new Float32Array(catalog.length * 3);
    const sizes     = new Float32Array(catalog.length);

    for (let i = 0; i < catalog.length; i++) {
      const [ra, dec, mag, spec] = catalog[i];
      const pos = starPositions[i];
      positions[i*3]   = pos.x;
      positions[i*3+1] = pos.y;
      positions[i*3+2] = pos.z;

      const hexColor = spectral[spec] || 0xffffff;
      const tc = new THREE.Color(hexColor);
      colors[i*3]   = tc.r;
      colors[i*3+1] = tc.g;
      colors[i*3+2] = tc.b;

      const brightness = Math.max(0.0, Math.min(1.0, (4.8 - mag) / 6.3));
      sizes[i] = 1.5 + brightness * 5.5;
    }

    const starTexCanvas = document.createElement('canvas');
    starTexCanvas.width = 32; starTexCanvas.height = 32;
    const stCtx = starTexCanvas.getContext('2d');
    const stGrad = stCtx.createRadialGradient(16,16,0,16,16,15);
    stGrad.addColorStop(0.00, 'rgba(255,255,255,1.0)');
    stGrad.addColorStop(0.15, 'rgba(255,255,255,0.9)');
    stGrad.addColorStop(0.45, 'rgba(200,220,255,0.35)');
    stGrad.addColorStop(1.00, 'rgba(100,150,255,0.0)');
    stCtx.fillStyle = stGrad;
    stCtx.fillRect(0, 0, 32, 32);

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    pointGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const pointMat = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: new THREE.CanvasTexture(starTexCanvas),
      sizeAttenuation: true
    });

    const starPoints = new THREE.Points(pointGeo, pointMat);
    majorStarsGroup.add(starPoints);

    // ── Halos individuales para estrellas muy brillantes (mag < 2.5) ──
    for (let i = 0; i < catalog.length; i++) {
      const [ra, dec, mag, spec] = catalog[i];
      if (mag >= 2.5) continue;

      const pos = starPositions[i];
      const hexColor = spectral[spec] || 0xffffff;
      const brightness = Math.max(0, Math.min(1, (4.8 - mag) / 6.3));
      const haloSize = 6 + brightness * 22;
      const texSize = mag < 0.5 ? 128 : 64;

      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeStarTexture(hexColor, texSize),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }));
      sprite.scale.set(haloSize, haloSize, 1);
      sprite.position.copy(pos);
      majorStarsGroup.add(sprite);
    }

    // ── Marcadores de Polos y Ejes de Rotación ──
    const makeLabelSprite = (text, subtitle, colorHex) => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 160;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(10, 16, 32, 0.88)';
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(10, 10, 492, 140, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 256, 68);

      ctx.fillStyle = colorHex;
      ctx.font = '500 24px "JetBrains Mono", monospace';
      ctx.fillText(subtitle, 256, 115);

      const spriteMat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
        depthTest: false
      });
      const sp = new THREE.Sprite(spriteMat);
      sp.scale.set(65, 20, 1);
      return sp;
    };

    // 1. EJE DE ROTACIÓN NORTE EXACTO (+X, Polo Físico Inmóvil)
    const northPoleAxisPos = new THREE.Vector3(R, 0, 0);
    const ringGeoPivot = new THREE.RingGeometry(4, 7, 32);
    const ringMatPivot = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const pivotNorth = new THREE.Mesh(ringGeoPivot, ringMatPivot);
    pivotNorth.position.copy(northPoleAxisPos);
    pivotNorth.lookAt(0, 0, 0);
    majorStarsGroup.add(pivotNorth);

    const northAxisLabel = makeLabelSprite('⊕ EJE POLAR NORTE', 'Pivote Inmóvil · Dec +90.0°', '#38bdf8');
    northAxisLabel.position.copy(northPoleAxisPos).multiplyScalar(0.95);
    majorStarsGroup.add(northAxisLabel);

    // 2. POLARIS (Desviada 0.65° del eje exacto, girando en micro-círculo)
    const polarisPos = this.raDecToSphereVector(2.53, 89.35, R);
    const polarisLabel = makeLabelSprite('★ POLARIS', 'Desviación: 0.65° del Eje', '#facc15');
    polarisLabel.position.copy(polarisPos).multiplyScalar(0.95);
    majorStarsGroup.add(polarisLabel);

    // Micro-anillo alrededor de Polaris
    const ringPolaris = new THREE.Mesh(new THREE.RingGeometry(6, 8, 32), new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    ringPolaris.position.copy(polarisPos);
    ringPolaris.lookAt(0, 0, 0);
    majorStarsGroup.add(ringPolaris);

    // 3. EJE DE ROTACIÓN SUR EXACTO (-X, Polo Austral Inmóvil)
    const southPoleAxisPos = new THREE.Vector3(-R, 0, 0);
    const pivotSouth = new THREE.Mesh(ringGeoPivot, new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    pivotSouth.position.copy(southPoleAxisPos);
    pivotSouth.lookAt(0, 0, 0);
    majorStarsGroup.add(pivotSouth);

    const southAxisLabel = makeLabelSprite('⊕ EJE POLAR SUR', 'Pivote Inmóvil · Dec -90.0°', '#a855f7');
    southAxisLabel.position.copy(southPoleAxisPos).multiplyScalar(0.95);
    majorStarsGroup.add(southAxisLabel);

    // 4. CRUZ DEL SUR (Referencia a Dec -63.1°, girando alrededor del Eje Sur)
    const cruxPos = this.raDecToSphereVector(12.44, -63.10, R);
    const ringGeoSouth = new THREE.RingGeometry(12, 15, 32);
    const ringSouth = new THREE.Mesh(ringGeoSouth, new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    ringSouth.position.copy(cruxPos);
    ringSouth.lookAt(0, 0, 0);
    majorStarsGroup.add(ringSouth);

    const cruxLabel = makeLabelSprite('✦ CRUZ DEL SUR', 'Guía Austral · Dec -63.1°', '#f43f5e');
    cruxLabel.position.copy(cruxPos).multiplyScalar(0.95);
    majorStarsGroup.add(cruxLabel);


    this.majorStars = majorStarsGroup;
    this.group.add(this.majorStars);
  }


  /**
   * 4. Retícula Celeste de Coordenadas Ecuatoriales 360° (Norte y Sur)
   */
  _createCelestialGrid() {
    const gridGroup = new THREE.Group();
    const R = this.sphereRadius * 0.98;
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12
    });
    const equatorMat = new THREE.LineBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.28,
      linewidth: 2
    });

    // Círculos de Declinación concéntricos alrededor del eje de giro X (+75° a -75°)
    for (let dec = -75; dec <= 75; dec += 15) {
      const decRad = (dec * Math.PI) / 180;
      const x = R * Math.sin(decRad); // +90° Polaris (+X), -90° Sur (-X)
      const rCirc = R * Math.cos(decRad);

      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(x, rCirc * Math.cos(a), rCirc * Math.sin(a)));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, dec === 0 ? equatorMat : mat));
    }

    // Meridianos de Ascensión Recta completos (de Polaris +X al Polo Sur -X, 360°)
    for (let ra = 0; ra < 360; ra += 30) {
      const raRad = (ra * Math.PI) / 180;
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const phi = (i / 64) * Math.PI; // 0 (+X Polaris) a PI (-X Polo Sur)
        const decRad = Math.PI / 2 - phi;
        const x = R * Math.sin(decRad);
        const rCirc = R * Math.cos(decRad);
        const y = rCirc * Math.cos(raRad);
        const z = rCirc * Math.sin(raRad);
        pts.push(new THREE.Vector3(x, y, z));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, mat));
    }

    this.gridMesh = gridGroup;
    this.group.add(this.gridMesh);


  }

  /**
   * Actualiza la rotación de la esfera celeste con calibración astronómica completa.
   *
   * CALIBRACIÓN:
   * ──────────────────────────────────────────────────────────────────────────
   * El GMST (Tiempo Sideral Medio de Greenwich) indica qué RA [grados] culmina
   * en el meridiano sur de Greenwich en ese instante. Al aplicar rotation.x,
   * hacemos girar el catalogo estelar de modo que:
   *
   *   1. La RA del Sol calculada (longitud eclíptica ≈ RA) coincida con la
   *      dirección en la que el Sol físico se mueve en el disco.
   *   2. El eje de rotación sea X (Polaris fija en +X, Polo Sur en −X).
   *   3. Las constelaciones visibles de noche cambien con las estaciones del año.
   *
   * La clave: en nuestra geometría RA=0h está en +Y y RA crece hacia −Z.
   * rotation.x = +gmstRad gira +Y hacia +Z, moviendo las estrellas de ESTE a OESTE.
   *
   * @param {number} tDays - Tiempo actual en días (relativo al equinoccio de marzo)
   */
  updateRotation(tDays) {
    // ── 1. Día Juliano exacto ─────────────────────────────────────────────
    const JD = (typeof EphemerisEngine !== 'undefined' && EphemerisEngine.tToJD)
      ? EphemerisEngine.tToJD(tDays)
      : 2461120.5 + tDays;

    // ── 2. GMST de alta precisión (Jean Meeus, cap. 12) ──────────────────
    // gmstDeg = RA [grados] en el meridiano de Greenwich en este instante
    const T = (JD - 2451545.0) / 36525.0;
    let gmstDeg = 280.46061837
      + 360.98564736629 * (JD - 2451545.0)
      + 0.000387933 * T * T
      - (T * T * T) / 38710000;
    gmstDeg = ((gmstDeg % 360) + 360) % 360;

    // ── 3. RA solar eclíptica para la fecha actual ────────────────────────
    // El Sol avanza ~360° en un año tropical desde el equinoccio de marzo.
    // tDays=0 → equinoccio de primavera → RA_Sol = 0h = 0°
    const TY = 365.24219;
    const sunRaDeg  = (((tDays / TY) * 360.0) % 360 + 360) % 360;  // RA del Sol en grados

    // ── 4. Ángulo del Sol en el disco 3D ─────────────────────────────────
    // angleSun(tDays) produce un ángulo tal que en t=0 el Sol está a −π/2,
    // es decir en la posición (0, 0, −r) = dirección −Z del disco.
    // En nuestra convención RA=0h está en +Y, RA=6h (90°) está en −Z.
    // El Sol en −Z corresponde a RA=6h, pero en t=0 debería ser RA=0h.
    // → Offset fijo entre el ángulo del disco y la RA: −π/2 rad (−6h → corr. −90°).
    const angleSunVal = (typeof AstroMath !== 'undefined')
      ? AstroMath.angleSun(tDays)
      : (-Math.PI / 2 + 2 * Math.PI * (((tDays % 1) + 1) % 1));

    // El Sol en el disco está en dirección angularDeg desde +Y hacia +Z:
    // angleSun en el disco: +Y=0°, +Z=90°, -Y=180°, -Z=270°
    // RA en la esfera: +Y=0°, -Z=90° (RA crece hacia el Este = -Z en nuestro sistema)
    // Por eso la RA correspondiente al Sol en el disco es: sunDiskRA_deg = angleSunDeg (mismo sentido)
    const angleSunDeg = ((angleSunVal * 180 / Math.PI) % 360 + 360) % 360;

    // ── 5. Offset de sincronización Sol-Disco-Catálogo ────────────────────
    // Queremos que la RA solar del catálogo (sunRaDeg) aparezca en la misma
    // dirección que la posición del Sol en el disco (angleSunDeg).
    // La diferencia nos dice cuánto hay que rotar el catálogo para alinearlos:
    const sunAlignOffsetDeg = sunRaDeg - angleSunDeg;

    // ── 6. Ángulo total de rotación del firmamento ────────────────────────
    // gmstDeg pone la RA correcta en el meridiano según la hora del día.
    // sunAlignOffsetDeg alinea las estaciones del año con el catálogo.
    // La suma da la rotación total del grupo en radianes:
    const totalRotDeg = gmstDeg + sunAlignOffsetDeg;
    const totalRotRad = (totalRotDeg * Math.PI) / 180;

    // ── 7. Aplicar rotación sobre eje X ──────────────────────────────────
    // Visto desde +X (polo Norte / Polaris), −rotation.x rota el plano Y-Z
    // en sentido ANTI-HORARIO, igual que las trazas reales de estrella desde el hemisferio Norte.
    // (+rotation.x sería horario → incorrecto)
    this.group.rotation.set(0, 0, 0);
    this.group.rotation.x = -totalRotRad;
  }

  setSphereScale(scale) {
    this.sphereHeightScale = scale;
    this.group.scale.set(1, scale, 1);
  }

  toggle(visible) {
    this.group.visible = visible;
  }
}



window.CelestialSphere = CelestialSphere;
window.FirmamentDome = CelestialSphere; // Alias de retrocompatibilidad

