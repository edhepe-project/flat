/**
 * NavigationControls: Orquestador de cámara estilo Google Earth.
 * Delega Observador Terrestre a ObserverMode y raycasting a RaycastInteraction.
 */

class NavigationControls {
  constructor(camera, renderer, layerManager) {
    this.camera = camera;
    this.renderer = renderer;
    this.layerManager = layerManager;

    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.05;
    this.orbit.screenSpacePanning = false;
    this.orbit.minDistance = 12;
    this.orbit.maxDistance = 3500;
    this.orbit.maxPolarAngle = Math.PI - 0.05; // Permite ver 360° por debajo del plano terrestre

    this.compassNeedle = document.getElementById('compass-needle');

    // Estado de medición
    this.isMeasuring = false;
    this.measureStep = 0;
    this.measurePoint1 = null;
    this.measurePoint2 = null;
    this.isAddingPin = false;
    this.pendingPinName = null;

    // Submódulos
    this.observer = new ObserverMode(this);
    this.raycast = new RaycastInteraction(this);

    this.resetCameraView();
  }

  resetCameraView() {
    this.orbit.maxPolarAngle = Math.PI - 0.05;
    this.orbit.minDistance = 12;
    this.orbit.maxDistance = 4000;
    this.flyTo({ x: 0, y: 400, z: 420, targetX: 0, targetY: 0, targetZ: 0, duration: 1200 });
  }

  // Delegados de compatibilidad con código existente
  clearObserver() { this.observer.clear(); }
  enablePlaceObserverMode() { this.observer.enablePlaceMode(); }
  setObserverAtPosition(x, z, lat, lon) { this.observer.setAtPosition(x, z, lat, lon); }

  get isPlacingObserver() { return this.observer.isPlacingObserver; }
  get observerLatLon() { return this.observer.observerLatLon; }

  topView() {
    this.flyTo({ x: 0, y: 900, z: 1, targetX: 0, targetY: 0, targetZ: 0, duration: 1000 });
  }

  zoomIn() {
    const factor = 0.75;
    const offset = this.camera.position.clone().sub(this.orbit.target).multiplyScalar(factor);
    this.camera.position.copy(this.orbit.target).add(offset);
  }

  zoomOut() {
    const factor = 1.35;
    const offset = this.camera.position.clone().sub(this.orbit.target).multiplyScalar(factor);
    this.camera.position.copy(this.orbit.target).add(offset);
  }

  tilt(deltaAngle) {
    const currentPolar = this.orbit.getPolarAngle();
    const newPolar = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, currentPolar + deltaAngle));
    const distance = this.camera.position.distanceTo(this.orbit.target);
    const azimuth = this.orbit.getAzimuthalAngle();
    this.camera.position.x = this.orbit.target.x + distance * Math.sin(newPolar) * Math.sin(azimuth);
    this.camera.position.y = this.orbit.target.y + distance * Math.cos(newPolar);
    this.camera.position.z = this.orbit.target.z + distance * Math.sin(newPolar) * Math.cos(azimuth);
  }

  orientNorth() {
    const distance = this.camera.position.distanceTo(this.orbit.target);
    const currentPolar = this.orbit.getPolarAngle();
    this.flyTo({
      x: this.orbit.target.x,
      y: this.orbit.target.y + distance * Math.cos(currentPolar),
      z: this.orbit.target.z + distance * Math.sin(currentPolar),
      targetX: this.orbit.target.x,
      targetY: this.orbit.target.y,
      targetZ: this.orbit.target.z,
      duration: 800
    });
  }

  /**
   * Animación suave tipo Google Earth usando Tween.js.
   */
  flyTo(params) {
    const fromPos = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
    const toPos = { x: params.x, y: params.y, z: params.z };
    const fromTarget = { x: this.orbit.target.x, y: this.orbit.target.y, z: this.orbit.target.z };
    const toTarget = { x: params.targetX || 0, y: params.targetY || 0, z: params.targetZ || 0 };

    new TWEEN.Tween(fromPos)
      .to(toPos, params.duration || 1500)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => { this.camera.position.set(fromPos.x, fromPos.y, fromPos.z); })
      .start();

    new TWEEN.Tween(fromTarget)
      .to(toTarget, params.duration || 1500)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => { this.orbit.target.set(fromTarget.x, fromTarget.y, fromTarget.z); })
      .start();
  }

  /**
   * Vuelo bifásico tipo Google Earth hacia coordenadas geográficas.
   */
  flyToCoordinates(lat, lon, finalAlt = 55, duration = 2200) {
    const groundPt = this.layerManager.latLonToFlatVector(lat, lon, 0);
    const finalCamPos = new THREE.Vector3(groundPt.x, finalAlt, groundPt.z + finalAlt * 0.45);
    const finalTarget = new THREE.Vector3(groundPt.x, 2, groundPt.z);

    const midAlt = Math.max(this.camera.position.y, finalAlt * 3.5, 350);
    const midCamPos = new THREE.Vector3(
      (this.camera.position.x + finalCamPos.x) * 0.5,
      midAlt,
      (this.camera.position.z + finalCamPos.z) * 0.5
    );
    const midTarget = new THREE.Vector3(
      (this.orbit.target.x + finalTarget.x) * 0.5,
      0,
      (this.orbit.target.z + finalTarget.z) * 0.5
    );
    const half = duration / 2;

    const fromPos1 = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
    const fromTgt1 = { x: this.orbit.target.x, y: this.orbit.target.y, z: this.orbit.target.z };

    new TWEEN.Tween(fromPos1)
      .to({ x: midCamPos.x, y: midCamPos.y, z: midCamPos.z }, half)
      .easing(TWEEN.Easing.Quadratic.In)
      .onUpdate(() => { this.camera.position.set(fromPos1.x, fromPos1.y, fromPos1.z); })
      .onComplete(() => {
        const fromPos2 = { x: midCamPos.x, y: midCamPos.y, z: midCamPos.z };
        const fromTgt2 = { x: midTarget.x, y: midTarget.y, z: midTarget.z };
        new TWEEN.Tween(fromPos2)
          .to({ x: finalCamPos.x, y: finalCamPos.y, z: finalCamPos.z }, half)
          .easing(TWEEN.Easing.Cubic.Out)
          .onUpdate(() => { this.camera.position.set(fromPos2.x, fromPos2.y, fromPos2.z); })
          .start();
        new TWEEN.Tween(fromTgt2)
          .to({ x: finalTarget.x, y: finalTarget.y, z: finalTarget.z }, half)
          .easing(TWEEN.Easing.Cubic.Out)
          .onUpdate(() => { this.orbit.target.set(fromTgt2.x, fromTgt2.y, fromTgt2.z); })
          .start();
      })
      .start();

    new TWEEN.Tween(fromTgt1)
      .to({ x: midTarget.x, y: midTarget.y, z: midTarget.z }, half)
      .easing(TWEEN.Easing.Quadratic.In)
      .onUpdate(() => { this.orbit.target.set(fromTgt1.x, fromTgt1.y, fromTgt1.z); })
      .start();
  }

  update() {
    this.orbit.update();

    if (this.compassNeedle) {
      const angle = this.orbit.getAzimuthalAngle();
      this.compassNeedle.style.transform = `rotate(${-angle}rad)`;
    }

    const altDisplay = document.getElementById('altitude-display');
    if (altDisplay) {
      const altKm = Math.round(this.camera.position.y * 25);
      altDisplay.textContent = `Altitud de Cámara: ${altKm.toLocaleString()} km`;
    }
  }
}

window.NavigationControls = NavigationControls;
