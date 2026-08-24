/**
 * LayerManager: Orquestador central y limpio de capas geográficas del mapa.
 * Coordina los submódulos especializados:
 * - PinsManager (Pines de búsqueda y lugares personalizados)
 * - CountriesLayer (Fronteras y etiquetas con LOD)
 * - ArcticLayer (Continente Ártico de Mercator)
 * - EnvironmentLayers (Nubes, retícula, rutas aéreas y marítimas)
 * - MeasureEngine (Medición de distancias)
 */

class LayerManager {
  constructor(scene, earthDisc) {
    this.scene = scene;
    this.earthDisc = earthDisc;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.allCities = [];
    this.citiesData = [];
    this.neighborhoodsData = [];

    // Submódulos especializados
    this.pinsManager = new PinsManager(this);
    this.countriesLayer = new CountriesLayer(this);
    this.arcticLayer = new ArcticLayer(this);
    this.envLayers = new EnvironmentLayers(this);

    // Grupos para compatibilidad con raycaster y UI
    this.customPlacesGroup = this.pinsManager.customPlacesGroup;
    this.countriesGroup = this.countriesLayer.countriesGroup;
    this.arcticIslandsGroup = this.arcticLayer.arcticIslandsGroup;
    this.measureGroup = new THREE.Group();
    this.group.add(this.measureGroup);

    this.loadWorldCitiesDatabase();
  }

  // Getters para mantener compatibilidad 100% con controles y UI
  get searchPins() { return this.pinsManager.searchPins; }
  set searchPins(val) { this.pinsManager.searchPins = val; }
  get customPlaces() { return this.pinsManager.customPlaces; }

  loadWorldCitiesDatabase() {
    fetch('data/world_cities.json')
      .then((res) => res.json())
      .then((data) => {
        this.allCities = data;
        this.citiesData = data.slice(0, 150).map(c => ({
          name: c.n,
          country: c.c || '',
          lat: c.lt,
          lon: c.ln,
          pop: c.p || 0
        }));
        this.envLayers.initFlightRoutes(this.citiesData);
        console.log(`[LayerManager] ${this.allCities.length.toLocaleString()} ciudades cargadas para búsqueda.`);
      })
      .catch((err) => {
        console.warn('[LayerManager] No se pudo cargar world_cities.json:', err);
      });
  }

  loadNeighborhoodsForCountry(countryCode = 'mexico') {
    if (this.neighborhoodsData && this.neighborhoodsData.length > 0) return Promise.resolve(this.neighborhoodsData);
    return fetch(`data/neighborhoods/${countryCode}.json`)
      .then(res => res.json())
      .then(data => {
        this.neighborhoodsData = data;
        return data;
      })
      .catch(err => {
        console.warn(`[LayerManager] No se pudieron cargar vecindarios para ${countryCode}:`, err);
        return [];
      });
  }

  latLonToFlatVector(lat, lon, heightOffset = 6.0) {
    const maxR = this.earthDisc.radius - 25;
    const r = ((90 - lat) / 180) * maxR;
    const theta = ((lon + 90) * Math.PI) / 180;
    const x = -r * Math.cos(theta);
    const z = r * Math.sin(theta);
    return new THREE.Vector3(x, heightOffset, z);
  }

  flatVectorToLatLon(posOrX, zMaybe) {
    let x, z;
    if (typeof posOrX === 'number') {
      x = posOrX;
      z = zMaybe !== undefined ? zMaybe : 0;
    } else if (posOrX && typeof posOrX.x === 'number') {
      x = posOrX.x;
      z = posOrX.z !== undefined ? posOrX.z : (posOrX.y || 0);
    } else {
      return { lat: 0, lon: 0 };
    }
    const maxR = this.earthDisc.radius - 25;
    const r = Math.sqrt(x * x + z * z);
    const lat = 90 - (r / maxR) * 180;
    let theta = Math.atan2(z, -x);
    let lon = (theta * 180) / Math.PI - 90;
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    return { lat, lon };
  }

  calculateDistances(lat1, lon1, lat2, lon2) {
    return MeasureEngine.calculate(lat1, lon1, lat2, lon2, this.earthDisc.radius);
  }

  setMeasureLine(p1, p2) {
    this.clearMeasure();
    const pts = [p1.clone().setY(6.5), p2.clone().setY(6.5)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xef4444,
      dashSize: 3,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.9,
      linewidth: 3
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    this.measureGroup.add(line);

    [p1, p2].forEach(p => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      dot.position.copy(p).setY(6.5);
      this.measureGroup.add(dot);
    });
  }

  clearMeasure() {
    while (this.measureGroup.children.length > 0) {
      const obj = this.measureGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      this.measureGroup.remove(obj);
    }
  }

  // Delegaciones a PinsManager
  addCustomPlace(name, lat, lon, color) { return this.pinsManager.addCustomPlace(name, lat, lon, color); }
  renderCustomPin(place, save) { return this.pinsManager.renderCustomPin(place, save); }
  removeCustomPlace(placeId) { return this.pinsManager.removeCustomPlace(placeId); }
  setSearchPin(lat, lon, label) { return this.pinsManager.setSearchPin(lat, lon, label); }
  removeSearchPinById(pinId) { return this.pinsManager.removeSearchPinById(pinId); }
  clearSearchPin() { return this.pinsManager.clearSearchPin(); }

  // Delegaciones a Capas
  toggleGrid(v) { this.envLayers.gridGroup.visible = v; }
  toggleCountries(v) { this.countriesLayer.toggleCountries(v); }
  toggleFlights(v) { this.envLayers.flightsGroup.visible = v; }
  toggleTraffic(v) { this.envLayers.trafficGroup.visible = v; }
  toggleWeather(v) { this.envLayers.weatherGroup.visible = v; }
  toggleArcticIslands(v) { this.arcticLayer.toggle(v); }
  toggleArcticRelief(en, sc) { this.arcticLayer.toggleRelief(en, sc); }
  setArcticReliefScale(sc) { this.arcticLayer.setReliefScale(sc); }

  update(deltaSec, camera) {
    this.envLayers.update(deltaSec);
    this.countriesLayer.updateLOD(camera);

    // Animación de pulso para pines de búsqueda
    if (this.searchPins && this.searchPins.length > 0) {
      const timeSec = performance.now() * 0.001;
      this.searchPins.forEach(p => {
        if (p.ring2) {
          const pulse = (timeSec * 2.2) % 1;
          const s = 1.0 + pulse * 0.6;
          p.ring2.scale.set(s, s, 1);
          if (p.ring2Mat) p.ring2Mat.opacity = Math.max(0, 0.45 * (1 - pulse));
        }
      });
    }
  }
}

window.LayerManager = LayerManager;
