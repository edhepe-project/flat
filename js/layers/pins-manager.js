/**
 * PinsManager: Gestor independiente de Marcadores y Pines 3D en el mapa.
 * Responsabilidades:
 * 1. Pines de búsqueda con botón interactivo [✕]
 * 2. Marcadores personalizados guardados por el usuario (LocalStorage)
 * 3. Liberación segura de memoria GPU (dispose de geometrías, materiales y texturas)
 */

class PinsManager {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.customPlacesGroup = new THREE.Group();
    this.layerManager.group.add(this.customPlacesGroup);

    this.customPlaces = [];
    this.searchPins = [];

    this.loadCustomPlacesFromStorage();
  }

  loadCustomPlacesFromStorage() {
    try {
      const saved = localStorage.getItem('terraplana_saved_places');
      if (saved) {
        const list = JSON.parse(saved);
        list.forEach(p => this.renderCustomPin(p, false));
      }
    } catch (e) {
      console.warn('[PinsManager] Error leyendo lugares guardados:', e);
    }
  }

  saveCustomPlacesToStorage() {
    try {
      const data = this.customPlaces.map(p => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        color: p.color
      }));
      localStorage.setItem('terraplana_saved_places', JSON.stringify(data));
    } catch (e) {}
  }

  addCustomPlace(name, lat, lon, color = '#f59e0b') {
    const place = {
      id: 'place_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: name || `Punto (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      color: color
    };
    this.renderCustomPin(place, true);
    return place;
  }

  renderCustomPin(place, save = true) {
    const pos = this.layerManager.latLonToFlatVector(place.lat, place.lon, 6.2);

    const pinGroup = new THREE.Group();
    pinGroup.position.copy(pos);

    const pinColor = place.color || '#f59e0b';
    const hexColor = parseInt(pinColor.replace('#', '0x'), 16);

    // Aguja de Precisión Milimétrica 3D
    const needleGeo = new THREE.ConeGeometry(0.35, 3.2, 16);
    const needleMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      emissive: hexColor,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.8
    });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.rotation.x = Math.PI;
    needle.position.y = 1.6;
    pinGroup.add(needle);

    // Esfera en el tope de la aguja
    const topSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    topSphere.position.y = 3.2;
    pinGroup.add(topSphere);

    // Micro-anillo en el suelo
    const ringGeo = new THREE.RingGeometry(0.25, 0.75, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    pinGroup.add(ring);

    // Letrero Canvas HD
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 16, 26, 0.88)';
    ctx.strokeStyle = pinColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, 376, 72, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Outfit", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📍 ${place.name}`, 192, 28);

    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = pinColor;
    ctx.fillText(`${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°`, 192, 54);

    const labelTexture = new THREE.CanvasTexture(canvas);
    labelTexture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 4.8, 0);

    const baseW = 6.8;
    const baseH = 1.45;
    sprite.scale.set(baseW, baseH, 1);
    pinGroup.add(sprite);

    this.customPlacesGroup.add(pinGroup);

    place.mesh = pinGroup;
    place.sprite = sprite;
    place.baseW = baseW;
    place.baseH = baseH;

    this.customPlaces.push(place);

    if (save) {
      this.saveCustomPlacesToStorage();
    }
  }

  removeCustomPlace(placeId) {
    const idx = this.customPlaces.findIndex(p => p.id === placeId);
    if (idx !== -1) {
      const place = this.customPlaces[idx];
      if (place.mesh) {
        place.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        this.customPlacesGroup.remove(place.mesh);
      }
      this.customPlaces.splice(idx, 1);
      this.saveCustomPlacesToStorage();
    }
  }

  setSearchPin(lat, lon, label = '') {
    const pinId = 'search_pin_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const pos = this.layerManager.latLonToFlatVector(lat, lon, 6.5);
    const pinGroup = new THREE.Group();
    pinGroup.position.copy(pos);

    // Micro-punto de precisión
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, depthTest: false, transparent: true, opacity: 0.95 })
    );
    dot.position.y = 0.7;
    pinGroup.add(dot);

    // Núcleo blanco
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 1.0 })
    );
    core.position.y = 0.7;
    pinGroup.add(core);

    // Anillo base fino
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.65, 48),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false })
    );
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.1;
    pinGroup.add(ring1);

    // Onda pulsante
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 2.65, 48),
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthTest: false })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.1;
    pinGroup.add(ring2);

    // Canvas HD con botón [✕]
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 14, 30, 0.94)';
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 88, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00d2ff';
    ctx.fillRect(4, 4, 6, 88);

    // Botón circular [✕]
    ctx.fillStyle = 'rgba(255, 70, 70, 0.25)';
    ctx.strokeStyle = 'rgba(255, 90, 90, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(476, 32, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', 476, 32);

    const displayLabel = label || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
    ctx.font = 'bold 28px "Outfit", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    let txt = displayLabel;
    while (ctx.measureText(txt).width > 410 && txt.length > 3) txt = txt.slice(0, -1);
    if (txt.length < displayLabel.length) txt += '…';
    ctx.fillText(txt, 22, 42);

    const latLbl = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lonLbl = `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'O'}`;
    ctx.font = '16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00d2ff';
    ctx.fillText(`${latLbl}   ${lonLbl}`, 22, 74);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false
    }));
    const baseW = 24;
    const baseH = 4.5;
    sprite.scale.set(baseW, baseH, 1);
    sprite.position.set(0, 4.5, 0);
    sprite.userData = { isCloseButton: true, pinId };
    pinGroup.add(sprite);

    pinGroup.userData = { isSearchPinGroup: true, pinId };
    this.customPlacesGroup.add(pinGroup);

    const pinObj = {
      id: pinId,
      mesh: pinGroup,
      dot,
      core,
      ring1,
      ring2,
      ring2Mat: ring2.material,
      sprite,
      baseW,
      baseH
    };

    this.searchPins.push(pinObj);
    return pinObj;
  }

  removeSearchPinById(pinId) {
    const idx = this.searchPins.findIndex(p => p.id === pinId);
    if (idx !== -1) {
      const pinObj = this.searchPins[idx];
      if (pinObj.mesh) {
        pinObj.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        this.customPlacesGroup.remove(pinObj.mesh);
      }
      this.searchPins.splice(idx, 1);
    }
  }

  clearSearchPin() {
    this.searchPins.forEach(p => {
      if (p.mesh) {
        p.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        this.customPlacesGroup.remove(p.mesh);
      }
    });
    this.searchPins = [];
  }
}

window.PinsManager = PinsManager;
