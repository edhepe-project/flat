/**
 * ObserverMode: Modo de Observador Terrestre.
 * Sitúa al observador en un punto del disco, configura la cámara a nivel del suelo
 * y activa el telescopio lunar PiP.
 */

class ObserverMode {
  constructor(controls) {
    this.controls = controls;
    this.observerMarker = null;
    this.observerPosition = null;
    this.observerLatLon = null;
    this.isPlacingObserver = false;
  }

  enablePlaceMode() {
    this.isPlacingObserver = true;
    const btn = document.getElementById('btn-ground-observer');
    if (btn) btn.classList.add('active');
    const hoverInfo = document.getElementById('feature-hover-info');
    if (hoverInfo) hoverInfo.textContent = '👁️ Haz clic sobre cualquier punto de la Tierra para situar al Observador...';
  }

  clear() {
    if (this.observerMarker) this.observerMarker.visible = false;
    this.observerPosition = null;
    this.observerLatLon = null;
    this.isPlacingObserver = false;

    const c = this.controls;
    c.orbit.maxPolarAngle = Math.PI / 2 - 0.03;
    c.orbit.minDistance = 12;
    c.orbit.maxDistance = 4000;

    const btn = document.getElementById('btn-ground-observer');
    if (btn) btn.classList.remove('active');

    const hoverInfo = document.getElementById('feature-hover-info');
    if (hoverInfo) hoverInfo.textContent = 'Sol 24h00m · Luna 24h50m · Ecuación del Tiempo Activa';

    c.resetCameraView();
  }

  setAtPosition(x, z, lat, lon) {
    this.observerPosition = new THREE.Vector3(x, 6, z);

    if (!this.observerMarker) {
      const group = new THREE.Group();

      const ringGeo = new THREE.RingGeometry(3, 7, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.3;
      group.add(ring);

      const bodyGeo = new THREE.CylinderGeometry(1.2, 1.8, 8, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, roughness: 0.2, metalness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 4;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(1.8, 16, 16);
      const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 9;
      group.add(head);

      this.observerMarker = group;
      this.controls.layerManager.scene.add(this.observerMarker);
    }

    this.observerMarker.position.set(x, 0, z);
    this.observerMarker.visible = true;

    const c = this.controls;
    c.orbit.maxPolarAngle = Math.PI / 2 + 0.3;
    c.orbit.minDistance = 2;
    c.orbit.maxDistance = 2500;

    c.flyTo({
      x, y: 10, z,
      targetX: x * 0.4,
      targetY: 95,
      targetZ: z * 0.4,
      duration: 1600
    });

    const hoverInfo = document.getElementById('feature-hover-info');
    if (hoverInfo) hoverInfo.textContent = `👁️ Observador en (${lat.toFixed(2)}°, ${lon.toFixed(2)}°) · Telescopio Lunar activado`;

    const btn = document.getElementById('btn-ground-observer');
    if (btn) btn.classList.add('active');

    this.observerLatLon = { lat, lon };
    const pipEl = document.getElementById('moon-telescope-pip');
    if (pipEl) {
      pipEl.classList.remove('hidden');
      if (window.app) window.app.isMoonPipActive = true;
    }
  }
}

window.ObserverMode = ObserverMode;
