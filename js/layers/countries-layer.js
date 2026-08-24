/**
 * CountriesLayer: Gestión asíncrona (Lazy Load) de Fronteras Políticas y Etiquetas de Países con LOD dinámico.
 */

class CountriesLayer {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.countriesGroup = new THREE.Group();
    this.layerManager.group.add(this.countriesGroup);

    this.countryLabels = [];
    this.countriesLoaded = false;
    this._countriesWantVisible = false;
    this.countriesGroup.visible = false;
  }

  fetchAndBuildCountries() {
    if (this.countriesLoaded) {
      this.countriesGroup.visible = this._countriesWantVisible;
      return;
    }

    fetch('data/countries.geojson')
      .then((res) => res.json())
      .then((geojson) => {
        const borderMat = new THREE.LineBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.65,
          linewidth: 1.5
        });

        const createCountryLabel = (name, lat, lon, area, geoWidth) => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');

          ctx.clearRect(0, 0, 512, 128);

          let fontSize = 34;
          if (name.length > 18) fontSize = 22;
          else if (name.length > 12) fontSize = 28;

          ctx.font = `bold ${fontSize}px "Outfit", "Inter", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
          ctx.lineWidth = 6;
          ctx.strokeText(name.toUpperCase(), 256, 64);

          ctx.fillStyle = '#fbbf24';
          ctx.fillText(name.toUpperCase(), 256, 64);

          const tex = new THREE.CanvasTexture(canvas);
          tex.anisotropy = 8;
          const spriteMat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            opacity: 0.92,
            depthWrite: false
          });
          const sprite = new THREE.Sprite(spriteMat);
          const pos = this.layerManager.latLonToFlatVector(lat, lon, 7.5);
          sprite.position.copy(pos);

          const maxR = this.layerManager.earthDisc.radius - 25;
          const countrySpan3D = (geoWidth / 180) * maxR * 0.65;
          const baseW = Math.max(3.5, Math.min(22, countrySpan3D));
          const baseH = baseW * 0.25;
          sprite.scale.set(baseW, baseH, 1);

          return { sprite, baseW, baseH, area };
        };

        geojson.features.forEach((feature) => {
          const name = feature.properties ? (feature.properties.ADMIN || feature.properties.name || '') : '';
          const geom = feature.geometry;
          if (!geom) return;

          let centerLat = 0, centerLon = 0, ptCount = 0;
          let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

          const renderRings = (rings) => {
            rings.forEach((ring) => {
              const pts = [];
              ring.forEach(([lon, lat]) => {
                const p = this.layerManager.latLonToFlatVector(lat, lon, 6.3);
                pts.push(p);
                centerLat += lat;
                centerLon += lon;
                ptCount++;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
              });
              const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
              const line = new THREE.Line(lineGeo, borderMat);
              this.countriesGroup.add(line);
            });
          };

          if (geom.type === 'Polygon') {
            renderRings(geom.coordinates);
          } else if (geom.type === 'MultiPolygon') {
            geom.coordinates.forEach((poly) => renderRings(poly));
          }

          const dLat = Math.max(0.1, maxLat - minLat);
          const dLon = Math.max(0.1, maxLon - minLon);
          const approxArea = dLat * dLon;
          const geoWidth = Math.min(dLon, dLat * 1.5);

          if (name && ptCount > 0) {
            const avgLat = centerLat / ptCount;
            const avgLon = centerLon / ptCount;
            const labelItem = createCountryLabel(name, avgLat, avgLon, approxArea, geoWidth);
            this.countriesGroup.add(labelItem.sprite);
            this.countryLabels.push(labelItem);
          }
        });

        this.countriesLoaded = true;
        this.countriesGroup.visible = (this._countriesWantVisible === true);
        console.log(`[CountriesLayer] ${this.countryLabels.length} países cargados diferidamente.`);
      })
      .catch((err) => {
        console.warn('[CountriesLayer] No se pudo cargar countries.geojson:', err);
      });
  }

  toggleCountries(visible) {
    this._countriesWantVisible = visible;
    if (visible && !this.countriesLoaded) {
      this.fetchAndBuildCountries();
      return;
    }
    this.countriesGroup.visible = visible;
  }

  updateLOD(camera) {
    if (!this.countriesGroup.visible || !this.countryLabels || !camera) return;
    const camPos = camera.position;

    this.countryLabels.forEach((item) => {
      const { sprite, baseW, baseH, area } = item;
      const distToCountry = camPos.distanceTo(sprite.position);

      let isVisible = true;
      if (area < 0.4 && distToCountry > 300) {
        isVisible = false;
      } else if (area < 2.5 && distToCountry > 550) {
        isVisible = false;
      } else if (area < 9.0 && distToCountry > 950) {
        isVisible = false;
      }

      sprite.visible = isVisible;
      if (isVisible) {
        const factor = Math.max(0.65, Math.min(1.25, distToCountry / 450));
        sprite.scale.set(baseW * factor, baseH * factor, 1);
      }
    });
  }
}

window.CountriesLayer = CountriesLayer;
