/**
 * RaycastInteraction: Gestión de Raycasting para selección de objetos, medición y pines.
 * Detecta: mousemove (coordenadas), clics sobre el disco (pin, medición, observador),
 * sprites de búsqueda [✖] y meshes de ciudades.
 */

class RaycastInteraction {
  constructor(controls) {
    this.controls = controls;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._initListeners();
  }

  _initListeners() {
    const dom = (this.controls.renderer && this.controls.renderer.domElement) || window;

    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('click', (e) => this._onClick(e));
  }

  _updateMouse(e) {
    const rect = this.controls.renderer && this.controls.renderer.domElement
      ? this.controls.renderer.domElement.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.controls.camera);
  }

  _onMouseMove(e) {
    this._updateMouse(e);
    const intersects = this.raycaster.intersectObject(this.controls.layerManager.earthDisc.discMesh);

    if (intersects.length > 0) {
      const pt = intersects[0].point;
      const coords = this.controls.layerManager.flatVectorToLatLon(pt.x, pt.z);
      const coordLabel = document.getElementById('cursor-coords');
      if (coordLabel) {
        coordLabel.textContent = `Lat: ${coords.lat.toFixed(2)}°, Lon: ${coords.lon.toFixed(2)}°`;
      }
    }
  }

  _onClick(e) {
    // Si el clic fue sobre la interfaz de usuario (sidebar, modal, header, etc.), ignorar el raycast
    if (e.target && e.target.closest && e.target.closest('.sidebar, .app-header, .status-bar, .modal-dialog, .nav-controls, .search-dropdown, .pip-panel')) {
      return;
    }

    this._updateMouse(e);
    const c = this.controls;
    const lm = c.layerManager;

    // Modo Observador en Tierra
    if (c.observer && c.observer.isPlacingObserver) {
      const hits = this.raycaster.intersectObject(lm.earthDisc.discMesh);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const coords = lm.flatVectorToLatLon(pt.x, pt.z);
        c.observer.isPlacingObserver = false;
        c.observer.setAtPosition(pt.x, pt.z, coords.lat, coords.lon);
      }
      return;
    }

    // Modo Añadir Pin
    if (c.isAddingPin) {
      const hits = this.raycaster.intersectObject(lm.earthDisc.discMesh);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const coords = lm.flatVectorToLatLon(pt.x, pt.z);
        c.isAddingPin = false;

        const pinName = c.pendingPinName || `Punto (${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°)`;
        const place = lm.addCustomPlace(pinName, coords.lat, coords.lon);
        if (window.appUI && window.appUI.renderSavedPlacesList) window.appUI.renderSavedPlacesList();

        const hoverInfo = document.getElementById('feature-hover-info');
        if (hoverInfo) hoverInfo.textContent = `📍 Marcador guardado: ${place.name}`;

        const btnAdd = document.getElementById('btn-add-pin-map');
        if (btnAdd) btnAdd.classList.remove('btn-secondary');
      }
      return;
    }

    // Modo Medición
    if (c.isMeasuring) {
      const hits = this.raycaster.intersectObject(lm.earthDisc.discMesh);
      if (hits.length > 0) {
        const pt = hits[0].point;
        const coords = lm.flatVectorToLatLon(pt.x, pt.z);

        if (c.measureStep === 0) {
          c.measurePoint1 = { pt, coords };
          c.measureStep = 1;
          const featureInfo = document.getElementById('feature-hover-info');
          if (featureInfo) featureInfo.textContent = 'Medición: Haz clic en el 2do punto...';
        } else {
          c.measurePoint2 = { pt, coords };
          c.measureStep = 0;
          c.isMeasuring = false;

          lm.setMeasureLine(c.measurePoint1.pt, c.measurePoint2.pt);
          const dists = lm.calculateDistances(
            c.measurePoint1.coords.lat, c.measurePoint1.coords.lon,
            c.measurePoint2.coords.lat, c.measurePoint2.coords.lon
          );
          if (window.appUI) window.appUI.displayMeasureResult(dists);
        }
      }
      return;
    }

    // Clic en marcadores de búsqueda [✖]
    if (lm.searchPins && lm.searchPins.length > 0) {
      const sprites = lm.searchPins.map(p => p.sprite).filter(Boolean);
      const pinHits = this.raycaster.intersectObjects(sprites, false);
      if (pinHits.length > 0) {
        const hitSprite = pinHits[0].object;
        if (hitSprite.userData && hitSprite.userData.pinId) {
          lm.removeSearchPinById(hitSprite.userData.pinId);
          if (lm.searchPins.length === 0) {
            const searchInput = document.getElementById('city-search');
            const btnClear = document.getElementById('btn-clear-search');
            if (searchInput) searchInput.value = '';
            if (btnClear) btnClear.classList.add('hidden');
            if (window.appUI && window.appUI.hideCityHUD) window.appUI.hideCityHUD();
          }
          return;
        }
      }
    }

    // Clic en pines de ciudades
    const cityHits = this.raycaster.intersectObjects(lm.cityMeshes, true);
    if (cityHits.length > 0) {
      let rootMesh = cityHits[0].object;
      while (rootMesh.parent && !rootMesh.userData.city) {
        rootMesh = rootMesh.parent;
      }
      if (rootMesh.userData && rootMesh.userData.city) {
        window.appUI.showCityPopup(rootMesh.userData.city);
      }
    }
  }
}

window.RaycastInteraction = RaycastInteraction;
