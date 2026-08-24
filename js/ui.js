/**
 * UIManager: Orquestador central de la interfaz de usuario.
 * Delega a submódulos especializados:
 * - LayerControls      (layer-controls.js)   — toggles y sliders de capas
 * - SimControls        (sim-controls.js)      — play/pause, velocidad, analema, estelas, oscuridad
 * - TimeTravel         (time-travel.js)       — selector de fecha, steps, presets astronómicos
 * - PlacesPanel        (places-panel.js)      — lugares guardados y marcadores manuales
 * - MeasurePanel       (measure-panel.js)     — medidor A→B con autocompletado doble
 * - SearchAutocomplete (search-autocomplete.js) — buscador predictivo universal
 * - CoordModal         (coord-modal.js)       — modal de coordenadas
 * - HUDManager         (hud-manager.js)       — popups, lecturas astronómicas, telescopio PiP
 */

class UIManager {
  constructor(app) {
    this.app = app;
    this.hudManager = new HUDManager(this);

    this._initSidebarToggle();
    this._initNavigation();
    this._initSearch();

    LayerControls.init(this);
    SimControls.init(this);
    TimeTravel.init(this);
    PlacesPanel.init(this);
    MeasurePanel.init(this);
    CoordModal.init(this);

    this.renderSavedPlacesList();
  }

  // ── Delegaciones de compatibilidad ──────────────────────────────────
  showCityPopup(city)          { this.hudManager.showCityPopup(city); }
  hideCityHUD()                { this.hudManager.hideCityHUD(); }
  updateAstronomicalUI()       { this.hudManager.updateAstronomicalUI(); }
  parseCoordinates(str)        { return GeoParser.parseCoordinates(str); }
  parseSingleCoordinate(str)   { return GeoParser.parseSingleCoordinate(str); }

  displayMeasureResult(dists) {
    document.getElementById('dist-flat').textContent   = dists.flatDistKm;
    document.getElementById('dist-globe').textContent  = dists.globeDistKm;
    document.getElementById('dist-diff').textContent   = dists.diffPercent;
    document.getElementById('measure-result').classList.remove('hidden');
    const featureInfo = document.getElementById('feature-hover-info');
    if (featureInfo) featureInfo.textContent = 'Medición calculada con éxito.';
  }

  renderSavedPlacesList() {
    const listContainer = document.getElementById('saved-places-list');
    if (!listContainer || !this.app.layerManager) return;

    const places = this.app.layerManager.customPlaces || [];
    if (places.length === 0) {
      listContainer.innerHTML = '<div style="padding: 6px 8px; font-size: 11px; color: var(--text-muted); font-style: italic;">No hay puntos guardados aún.</div>';
      return;
    }

    listContainer.innerHTML = '';
    places.forEach((p) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;font-size:11px;';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      info.innerHTML = `<strong style="color:#f59e0b;">📍 ${p.name}</strong> <span style="color:var(--text-muted);font-size:10px;margin-left:4px;">(${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°)</span>`;
      info.addEventListener('click', () => this.app.controls.flyToCoordinates(p.lat, p.lon));

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = 'Eliminar marcador';
      delBtn.style.cssText = 'width:22px;height:22px;padding:0;color:#ef4444;border:none;background:transparent;cursor:pointer;';
      delBtn.innerHTML = '<i class="fa-solid fa-trash" style="font-size:10px;"></i>';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.app.layerManager.removeCustomPlace(p.id);
        this.renderSavedPlacesList();
      });

      item.appendChild(info);
      item.appendChild(delBtn);
      listContainer.appendChild(item);
    });
  }

  // ── Sidebar Toggle ───────────────────────────────────────────────────
  _initSidebarToggle() {
    const sidebarTabBtn = document.getElementById('sidebar-tab-btn');
    const tabIcon       = document.getElementById('tab-icon');
    const sidebar       = document.getElementById('main-sidebar');
    let sidebarCollapsed = false;

    if (sidebarTabBtn) {
      sidebarTabBtn.addEventListener('click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        if (sidebar)  sidebar.classList.toggle('collapsed', sidebarCollapsed);
        if (tabIcon)  tabIcon.className = sidebarCollapsed ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
      });
    }
  }

  // ── Navegación Flotante ──────────────────────────────────────────────
  _initNavigation() {
    const { celestial, controls } = this.app;

    document.getElementById('compass-btn')?.addEventListener('click',   () => controls.orientNorth());
    document.getElementById('btn-zoom-in')?.addEventListener('click',   () => controls.zoomIn());
    document.getElementById('btn-zoom-out')?.addEventListener('click',  () => controls.zoomOut());
    document.getElementById('btn-tilt-up')?.addEventListener('click',   () => controls.tilt(-0.15));
    document.getElementById('btn-tilt-down')?.addEventListener('click', () => controls.tilt(0.15));
    document.getElementById('btn-view-top')?.addEventListener('click',  () => controls.topView());
    document.getElementById('btn-reset-view')?.addEventListener('click',() => controls.resetCameraView());

    const btnObserver = document.getElementById('btn-ground-observer');
    if (btnObserver) btnObserver.addEventListener('click', () => controls.enablePlaceObserverMode());

    const closeMoonPip = document.getElementById('close-moon-pip');
    if (closeMoonPip) {
      closeMoonPip.addEventListener('click', () => {
        const pipEl = document.getElementById('moon-telescope-pip');
        if (pipEl) pipEl.classList.add('hidden');
        this.app.isMoonPipActive = false;
        if (controls) controls.clearObserver();
      });
    }

    document.getElementById('btn-view-sun')?.addEventListener('click', () => {
      const sunPos = celestial.getSunPosition();
      controls.flyTo({ x: sunPos.x, y: sunPos.y + 80, z: sunPos.z + 120, targetX: sunPos.x, targetY: 0, targetZ: sunPos.z, duration: 1500 });
    });

    document.getElementById('btn-view-moon')?.addEventListener('click', () => {
      const moonPos = celestial.moonGroup.position;
      controls.flyTo({ x: moonPos.x, y: moonPos.y + 70, z: moonPos.z + 110, targetX: moonPos.x, targetY: 0, targetZ: moonPos.z, duration: 1500 });
    });
  }

  // ── Buscador Universal ───────────────────────────────────────────────
  _initSearch() {
    const { layerManager, controls } = this.app;
    const searchInput   = document.getElementById('city-search');
    const searchResults = document.getElementById('search-results');
    const btnClearSearch= document.getElementById('btn-clear-search');

    const updateClearBtn = () => {
      if (btnClearSearch) {
        const hasText = searchInput && searchInput.value.trim().length > 0;
        btnClearSearch.classList.toggle('hidden', !hasText);
      }
    };

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.classList.add('hidden');
        layerManager.clearSearchPin();
        this.hideCityHUD();
        updateClearBtn();
        if (searchInput) searchInput.focus();
      });
    }

    if (searchInput && searchResults) {
      SearchAutocomplete.build(searchInput, searchResults, (item) => {
        if (item.isCustom) {
          layerManager.setSearchPin(item.lat, item.lon, item.name);
          controls.flyToCoordinates(item.lat, item.lon);
          this.showCityPopup({ name: item.name, country: '', lat: item.lat, lon: item.lon, pop: '' });
        } else if (item.isNeighborhood) {
          layerManager.setSearchPin(item.lat, item.lon, item.name);
          controls.flyToCoordinates(item.lat, item.lon, 45);
          this.showCityPopup({ name: item.name, country: 'Colonia / Barrio', lat: item.lat, lon: item.lon, pop: '' });
        } else if (item.isCity) {
          layerManager.setSearchPin(item.lat, item.lon, item.name);
          controls.flyToCoordinates(item.lat, item.lon);
          this.showCityPopup({ name: item.name, country: item.country, lat: item.lat, lon: item.lon, pop: item.pop ? item.pop.toLocaleString() : 'N/A' });
        } else {
          layerManager.setSearchPin(item.lat, item.lon);
          controls.flyToCoordinates(item.lat, item.lon);
        }
        searchInput.value = item.name;
        updateClearBtn();
      }, layerManager, { maxResults: 25, showIcons: true, fullDetails: true });

      searchInput.addEventListener('input', () => updateClearBtn());
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#city-search') && !e.target.closest('#search-results') && !e.target.closest('#btn-clear-search')) {
        if (searchResults) searchResults.classList.add('hidden');
      }
    });
  }
}

window.UIManager = UIManager;
