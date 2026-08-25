/**
 * FlatEarthApp: Orquestador principal de Three.js, animación y bucle temporal astronómico.
 */

class FlatEarthApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.isLiveSim = false;          // Arranca PAUSADO — el usuario elige cuándo iniciar
    this.speedDaysPerSec = 1.0;

    // Calcular t desde la fecha real del sistema (días desde equinoccio de marzo, ~día 79)
    const _hoy = new Date();
    const _inicioanio = new Date(_hoy.getFullYear(), 0, 1);
    const _diaAnio = Math.floor((_hoy - _inicioanio) / 86400000) + 1;
    this.tDays = _diaAnio - 79;     // 79 = EQUINOX_OFFSET_DAYS (≈ 20 de marzo)

    this.lastTimestamp = null;

    this.initScene();
    this.initComponents();
    // Sincronizar el sistema celeste con la fecha real actual
    this.celestial.setTimeInDays(this.tDays);
    this.initEvents();
    this.animate();
  }

  initScene() {
    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d16);
    this.scene.fog = new THREE.FogExp2(0x0a0d16, 0.0005);

    // 2. Cámara de perspectiva orbital calibrada a 16,000 km de altitud
    // 16,000 km / 40 km/u = 400 unidades de altura orbital
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      8000
    );
    this.camera.position.set(0, 400, 420);

    // 3. Renderizador WebGL fotorrealista de alto rango dinámico
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.appendChild(this.renderer.domElement);

    this.createDeepSpaceBackground();
  }

  createDeepSpaceBackground() {
    const starsGeo = new THREE.BufferGeometry();
    const count = 2500;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 3500 + Math.random() * 1500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.6
    });

    const deepStars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(deepStars);
  }

  initComponents() {
    // 1. Disco terrestre, textura y domo
    this.earthDisc = new EarthDisc(this.scene);

    // 2. Sol, Luna, Analema 3D y Estelas con las fórmulas de orbitas.html
    this.celestial = new CelestialSystem(this.scene, this.earthDisc);

    // 3. Capas de datos, ciudades y rutas
    this.layerManager = new LayerManager(this.scene, this.earthDisc);

    // 4. Controles de navegación de cámara
    this.controls = new NavigationControls(this.camera, this.renderer, this.layerManager);

    // 5. Interfaz de usuario
    this.ui = new UIManager(this);
    window.appUI = this.ui;

    // 6. Mini Cámara PiP (Telescopio Lunar) y Observatorio de Bóveda Completa
    this.initMoonPiP();
    this.initObservatoryViewer();
  }

  initMoonPiP() {
    this.pipCanvas = document.getElementById('moon-pip-canvas');
    if (!this.pipCanvas) return;

    this.pipRenderer = new THREE.WebGLRenderer({
      canvas: this.pipCanvas,
      antialias: true,
      alpha: true
    });
    this.pipRenderer.setSize(260, 200);
    this.pipRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // FOV estrecho calibrado (8.0°) enfocado exclusivamente en la Luna
    this.pipCamera = new THREE.PerspectiveCamera(8.0, 260 / 200, 1, 3000);
    this.isMoonPipActive = false;
  }

  initObservatoryViewer() {
    this.obsCanvas = document.getElementById('observatory-canvas');
    if (!this.obsCanvas) return;

    this.obsRenderer = new THREE.WebGLRenderer({
      canvas: this.obsCanvas,
      antialias: true,
      alpha: false
    });
    this.obsRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Cámara de Gran Angular (75°) para cubrir todo el cielo nocturno y la bóveda celeste
    this.obsCamera = new THREE.PerspectiveCamera(75, 16 / 9, 0.5, 4000);
    this.isObservatoryActive = false;
  }

  initEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));

    // Cálculo delta de tiempo real en segundos
    if (this.lastTimestamp == null) this.lastTimestamp = time;
    const dtReal = time ? (time - this.lastTimestamp) / 1000 : 0.016;
    this.lastTimestamp = time;

    // Actualizar animaciones Tween.js (Fly-To)
    TWEEN.update();

    // Actualizar controles de cámara
    if (this.controls) {
      this.controls.update();
    }

    // Simulación astronómica continua (con registro de estelas preservado)
    if (this.isLiveSim && dtReal < 0.5) {
      this.tDays += dtReal * this.speedDaysPerSec;
      this.celestial.setTimeInDays(this.tDays, true);
    }
    // Siempre actualizar UI (para que los readouts se muestren aunque esté pausado)
    if (this.ui) {
      this.ui.updateAstronomicalUI();
    }

    // Actualizar capas dinámicas y sistema LOD de etiquetas según zoom de cámara
    if (this.layerManager) {
      this.layerManager.update(dtReal, this.camera);
    }

    // Rotación del día sideral exacto de la Gran Esfera Celeste (23h 56m 4s)
    if (this.earthDisc && this.earthDisc.celestialSphere) {
      this.earthDisc.celestialSphere.updateRotation(this.tDays);
    }

    // Renderizar escena principal
    this.renderer.render(this.scene, this.camera);

    // 1. Renderizar mini cámara PiP si está activa (Telescopio Lunar de Alta Definición)
    if (this.isMoonPipActive && this.pipRenderer && this.pipCamera && this.controls && this.controls.observerPosition && this.celestial) {
      const obsPos = this.controls.observerPosition;
      this.pipCamera.position.set(obsPos.x, 0.8, obsPos.z);
      this.pipCamera.up.set(0, 1, 0);
      
      const moonPos = this.celestial.moonGroup.position;
      this.pipCamera.lookAt(moonPos.x, moonPos.y, moonPos.z);
      this.pipCamera.updateMatrixWorld(true);

      const flare = this.celestial.moonFlare;
      const prevFlareVis = flare ? flare.visible : true;
      if (flare) flare.visible = false; // Ocultar halo para terminador nítido

      this.pipRenderer.render(this.scene, this.pipCamera);

      if (flare) flare.visible = prevFlareVis;
    }

    // 2. Renderizar Observatorio de Ventana Completa (Gran Angular de Bóveda Celeste 360°)
    if (this.isObservatoryActive && this.obsRenderer && this.obsCamera && this.controls && this.controls.observerPosition && this.celestial) {
      const obsPos = this.controls.observerPosition;
      const canvas = this.obsCanvas;
      
      if (canvas) {
        const w = canvas.clientWidth || 800;
        const h = canvas.clientHeight || 500;
        if (canvas.width !== w || canvas.height !== h) {
          this.obsRenderer.setSize(w, h, false);
          this.obsCamera.aspect = w / h;
          this.obsCamera.updateProjectionMatrix();
        }
      }

      this.obsCamera.position.set(obsPos.x, 0.8, obsPos.z);
      this.obsCamera.up.set(0, 1, 0);

      // Orientación del Observatorio: mirar hacia el horizonte exterior / cenit (elevación 45°)
      const len = Math.sqrt(obsPos.x * obsPos.x + obsPos.z * obsPos.z) || 1;
      const dirX = obsPos.x / len;
      const dirZ = obsPos.z / len;
      
      this.obsCamera.lookAt(
        obsPos.x + dirX * 120,
        85, // Altura del firmamento y luminarias
        obsPos.z + dirZ * 120
      );
      this.obsCamera.updateMatrixWorld(true);

      this.obsRenderer.render(this.scene, this.obsCamera);
    }
  }
}

// Nota: La inicialización de FlatEarthApp se delega a js/ui/component-loader.js
// para asegurar que todos los templates HTML estén inyectados en el DOM.
