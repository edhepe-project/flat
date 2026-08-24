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

    // 6. Mini Cámara PiP (Telescopio Lunar desde el Observador)
    this.initMoonPiP();
  }

  initMoonPiP() {
    this.pipCanvas = document.getElementById('moon-pip-canvas');
    if (!this.pipCanvas) return;

    this.pipRenderer = new THREE.WebGLRenderer({
      canvas: this.pipCanvas,
      antialias: true,
      alpha: true
    });
    this.pipRenderer.setSize(240, 180);
    this.pipRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.pipCamera = new THREE.PerspectiveCamera(12, 240 / 180, 1, 3000);
    this.isMoonPipActive = false;
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

    // Renderizar mini cámara PiP si está activa
    if (this.isMoonPipActive && this.pipRenderer && this.pipCamera && this.controls && this.controls.observerPosition && this.celestial) {
      const obsPos = this.controls.observerPosition;
      this.pipCamera.position.set(obsPos.x, 3.5, obsPos.z);
      const moonPos = this.celestial.moonGroup.position;
      this.pipCamera.lookAt(moonPos.x, moonPos.y, moonPos.z);
      this.pipRenderer.render(this.scene, this.pipCamera);
    }
  }
}

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  window.app = new FlatEarthApp();
});
