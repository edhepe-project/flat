/**
 * EarthDisc: Disco base de la Tierra, textura satelital fotorrealista HD y relieve topográfico.
 */

class EarthDisc {
  constructor(scene) {
    this.scene = scene;
    this.radius = 500;
    this.thickness = 10;
    this.domeRadius = this.radius * 0.95;
    this.domeHeight = 160;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.satelliteTexture = null;
    this.displacementTexture = null;
    this.reliefEnabled = false;
    this.reliefScale = 8.0;

    this.createDiscMesh();
    this.createIceWall();
    this.createOuterRim();

    // Submódulos independientes
    this.celestialSphere = new CelestialSphere(this);
    this.firmament = this.celestialSphere; // Retrocompatibilidad
    this.nightCityLights = new NightCityLights(this);

    // La textura satelital se carga bajo demanda cuando el usuario la activa
    // (lazy load — evita el flash blanco y reduce el tiempo de carga inicial)
    this.loadElevationDisplacementMap();
  }

  get domeGroup() { return this.celestialSphere.group; }
  get domeMesh() { return this.celestialSphere.sphereShell; }
  get starPoints() { return this.celestialSphere.starPoints; }
  toggleCelestialSphere(visible) { this.celestialSphere.toggle(visible); }
  setCelestialSphereScale(scale) { this.celestialSphere.setSphereScale(scale); }

  loadSatelliteTexture() {
    const loader = new THREE.TextureLoader();
    loader.load(
      'textures/satellite_photoreal_nasa.jpg',
      (texture) => {
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 16;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
        this.satelliteTexture = texture;

        // Aplicar satelital de inmediato (idéntico al original de GitHub)
        this.setMapStyle('satellite');

        console.log('[EarthDisc] Textura Satelital NASA Ultra HD cargada.');
      },
      undefined,
      (err) => {
        console.warn('[EarthDisc] No se pudo cargar satellite_photoreal_nasa.jpg, usando respaldo procedural.');
        this.createFallbackTexture();
      }
    );
  }

  setTextureRotation(deg) {
    // No-op: la orientación está definida por los UVs del disco, no se modifica.
  }


  loadElevationDisplacementMap(size = 4096, cx = 2048, cy = 2048, discRadius = 1945.6) {
    const elevImg = new Image();
    elevImg.crossOrigin = 'anonymous';
    elevImg.src = 'textures/elevation_displacement.png';

    elevImg.onload = () => {
      const srcW = elevImg.naturalWidth || elevImg.width;
      const srcH = elevImg.naturalHeight || elevImg.height;

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = srcW;
      srcCanvas.height = srcH;
      const srcCtx = srcCanvas.getContext('2d');
      srcCtx.drawImage(elevImg, 0, 0);
      const srcImageData = srcCtx.getImageData(0, 0, srcW, srcH);

      if (window.Worker) {
        try {
          const worker = new Worker('js/workers/elevation_worker.js');

          worker.onmessage = (ev) => {
            const dstData = new Uint8ClampedArray(ev.data.dstBuffer);
            const dstCanvas = document.createElement('canvas');
            dstCanvas.width = size;
            dstCanvas.height = size;
            const dstCtx = dstCanvas.getContext('2d');
            dstCtx.putImageData(new ImageData(dstData, size, size), 0, 0);

            this.displacementTexture = new THREE.CanvasTexture(dstCanvas);
            this.displacementTexture.anisotropy = 16;
            this.displacementTexture.wrapS = THREE.ClampToEdgeWrapping;
            this.displacementTexture.wrapT = THREE.ClampToEdgeWrapping;
            this.displacementTexture.needsUpdate = true;

            if (this.discMaterial && this.reliefEnabled) {
              this.discMaterial.displacementMap = this.displacementTexture;
              this.discMaterial.bumpMap = this.displacementTexture;
              this.discMaterial.needsUpdate = true;
            }
            console.log('[EarthDisc] Reproyeccion azimutal DEM calculada via Web Worker.');
            worker.terminate();
          };

          worker.onerror = (err) => {
            console.warn('[EarthDisc] Error en Web Worker de elevación:', err.message);
            worker.terminate();
          };

          const srcBuffer = srcImageData.data.buffer;
          worker.postMessage({ srcBuffer, srcW, srcH, size, cx, cy, discRadius }, [srcBuffer]);
        } catch (workerErr) {
          console.warn('[EarthDisc] Error instanciando Worker:', workerErr);
        }
      }
    };

    elevImg.onerror = () => {
      console.warn('[EarthDisc] No se pudo cargar elevation_displacement.png');
    };
  }

  setReliefScale(scale) {
    this.reliefScale = scale;
    if (this.discMaterial) {
      this.discMaterial.displacementScale = scale;
      this.discMaterial.bumpScale = scale > 0 ? Math.min(2.5, scale * 0.15) : 0;
      this.discMaterial.needsUpdate = true;
    }
  }

  setMapStyle(style) {
    if (!this.discMaterial) return;
    if (style === 'satellite') {
      if (this.satelliteTexture) {
        this.discMaterial.map = this.satelliteTexture;
        this.discMaterial.color.setHex(0xffffff);
        this.discMaterial.roughness = 0.38;
        this.discMaterial.metalness = 0.08;
        this.discMaterial.needsUpdate = true;
      } else {
        // Cargar bajo demanda la primera vez que se active el toggle
        this.loadSatelliteTexture();
      }
    } else if (style === 'dark') {
      this.discMaterial.map = this.darkTexture || null;
      this.discMaterial.color.setHex(0xffffff);
      this.discMaterial.roughness = 0.8;
      this.discMaterial.metalness = 0.1;
      this.discMaterial.needsUpdate = true;
    }
  }

  toggleRelief(enabled) {
    this.reliefEnabled = enabled;
    if (!this.discMaterial) return;

    if (enabled) {
      this.discMaterial.displacementMap = this.displacementTexture || null;
      this.discMaterial.displacementScale = this.reliefScale !== undefined ? this.reliefScale : 8.0;
      this.discMaterial.displacementBias = 0.0;
      this.discMaterial.bumpMap = this.displacementTexture || null;
      this.discMaterial.bumpScale = this.reliefScale > 0 ? Math.min(2.5, this.reliefScale * 0.15) : 1.2;
    } else {
      this.discMaterial.displacementScale = 0;
      this.discMaterial.bumpScale = 0;
    }
    this.discMaterial.needsUpdate = true;
  }

  createFallbackTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(0.7, '#0f2042');
    grad.addColorStop(0.9, '#081426');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    if (this.discMaterial) {
      this.discMaterial.map = texture;
      this.discMaterial.needsUpdate = true;
    }
  }

  createDiscMesh() {
    const discGeo = new THREE.CylinderGeometry(
      this.radius,
      this.radius,
      this.thickness,
      128,
      128
    );

    // Sobreescribir UVs de la cara superior con el mismo mapeo del repositorio original:
    // u = 0.5 + x/(radius*2),  v = 0.5 + z/(radius*2)
    // Esto garantiza que la textura satelital alinee exactamente con los datos vectoriales.
    const uvs = discGeo.attributes.uv;
    const pos = discGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0) { // Cara superior
        const x = pos.getX(i);
        const z = pos.getZ(i);
        uvs.setXY(i,
          0.5 + (x / (this.radius * 2)),
          0.5 + (z / (this.radius * 2))
        );
      }
    }
    uvs.needsUpdate = true;

    // Textura oscura de fondo — visible mientras carga la satelital (evita flash blanco)
    const _size = 512;
    const _canvas = document.createElement('canvas');
    _canvas.width = _size; _canvas.height = _size;
    const _ctx = _canvas.getContext('2d');
    const _cx = _size / 2, _cy = _size / 2, _maxR = _size / 2 - 4;
    _ctx.fillStyle = '#05070c';
    _ctx.fillRect(0, 0, _size, _size);
    const _grad = _ctx.createRadialGradient(_cx, _cy, 0, _cx, _cy, _maxR);
    _grad.addColorStop(0.0, '#0a1628');
    _grad.addColorStop(0.6, '#061020');
    _grad.addColorStop(1.0, '#04070d');
    _ctx.beginPath();
    _ctx.arc(_cx, _cy, _maxR, 0, Math.PI * 2);
    _ctx.fillStyle = _grad;
    _ctx.fill();
    const _darkTex = new THREE.CanvasTexture(_canvas);
    _darkTex.anisotropy = 4;
    this.darkTexture = _darkTex;

    this.discMaterial = new THREE.MeshStandardMaterial({
      map: this.darkTexture,
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.08
    });

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.1
    });

    this.discMesh = new THREE.Mesh(discGeo, [sideMat, this.discMaterial, sideMat]);
    this.discMesh.receiveShadow = false;
    this.group.add(this.discMesh);
  }

  createIceWall() {
    const iceRadius = this.radius * 0.96;
    const wallHeight = 22;
    const wallGeo = new THREE.CylinderGeometry(
      iceRadius + 2,
      iceRadius,
      wallHeight,
      96,
      1,
      true
    );

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x94d2bd,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });

    this.iceWallMesh = new THREE.Mesh(wallGeo, wallMat);
    this.iceWallMesh.position.y = wallHeight / 2;
    this.iceWallMesh.visible = false;
    this.group.add(this.iceWallMesh);
  }

  createOuterRim() {
    const ringGeo = new THREE.RingGeometry(
      this.radius * 0.94,
      this.radius * 1.01,
      96
    );
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    this.outerRimMesh = new THREE.Mesh(ringGeo, ringMat);
    this.outerRimMesh.rotation.x = -Math.PI / 2;
    this.outerRimMesh.position.y = 5.2;
    this.group.add(this.outerRimMesh);
  }

  setDomeHeightScale(scale) { this.celestialSphere.setSphereScale(scale); }
  toggleIceWall(visible) { if (this.iceWallMesh) this.iceWallMesh.visible = visible; }
  toggleDome(visible) { this.celestialSphere.toggle(visible); }
  toggleNightCityLights(visible) { if (this.nightCityLights) this.nightCityLights.toggle(visible); }
  updateNightCityLights(sunX, sunY, sunZ) { this.nightCityLights.update(sunX, sunY, sunZ); }
}

window.EarthDisc = EarthDisc;
