/**
 * CoordModal: Modal especializado de búsqueda y guardado de coordenadas.
 */

class CoordModal {
  static init(uiManager) {
    const btnOpenCoordModal = document.getElementById('btn-open-coord-modal');
    const coordModalBackdrop = document.getElementById('coord-search-modal-backdrop');
    const closeCoordModal = document.getElementById('close-coord-modal');
    const tabCoordSingle = document.getElementById('tab-coord-single');
    const tabCoordFields = document.getElementById('tab-coord-fields');
    const panelCoordSingle = document.getElementById('panel-coord-single');
    const panelCoordFields = document.getElementById('panel-coord-fields');
    const inputModalRaw = document.getElementById('input-modal-coord-raw');
    const inputModalLat = document.getElementById('input-modal-lat');
    const inputModalLon = document.getElementById('input-modal-lon');
    const selectLatHem = document.getElementById('select-modal-lat-hem');
    const selectLonHem = document.getElementById('select-modal-lon-hem');
    const inputModalName = document.getElementById('input-modal-coord-name');
    const btnModalFly = document.getElementById('btn-modal-fly-coord');
    const btnModalSave = document.getElementById('btn-modal-save-pin');

    let isSingleTab = true;

    if (btnOpenCoordModal && coordModalBackdrop) {
      btnOpenCoordModal.addEventListener('click', () => {
        coordModalBackdrop.classList.remove('hidden');
        if (inputModalRaw) setTimeout(() => inputModalRaw.focus(), 50);
      });
    }

    if (closeCoordModal && coordModalBackdrop) {
      closeCoordModal.addEventListener('click', () => {
        coordModalBackdrop.classList.add('hidden');
      });
      coordModalBackdrop.addEventListener('click', (e) => {
        if (e.target === coordModalBackdrop) {
          coordModalBackdrop.classList.add('hidden');
        }
      });
    }

    if (tabCoordSingle && tabCoordFields) {
      tabCoordSingle.addEventListener('click', () => {
        isSingleTab = true;
        tabCoordSingle.style.background = 'var(--teal)';
        tabCoordSingle.style.color = '#050a12';
        tabCoordFields.style.background = 'transparent';
        tabCoordFields.style.color = 'var(--text-muted)';
        panelCoordSingle.classList.remove('hidden');
        panelCoordFields.classList.add('hidden');
      });

      tabCoordFields.addEventListener('click', () => {
        isSingleTab = false;
        tabCoordFields.style.background = 'var(--teal)';
        tabCoordFields.style.color = '#050a12';
        tabCoordSingle.style.background = 'transparent';
        tabCoordSingle.style.color = 'var(--text-muted)';
        panelCoordFields.classList.remove('hidden');
        panelCoordSingle.classList.add('hidden');
      });
    }

    const getModalCoordinates = () => {
      if (isSingleTab) {
        const raw = inputModalRaw ? inputModalRaw.value.trim() : '';
        return GeoParser.parseCoordinates(raw);
      } else {
        const latNum = parseFloat(inputModalLat ? inputModalLat.value : NaN);
        const lonNum = parseFloat(inputModalLon ? inputModalLon.value : NaN);
        const latMult = parseFloat(selectLatHem ? selectLatHem.value : 1);
        const lonMult = parseFloat(selectLonHem ? selectLonHem.value : 1);

        if (isNaN(latNum) || isNaN(lonNum)) return null;
        const lat = Math.abs(latNum) * latMult;
        const lon = Math.abs(lonNum) * lonMult;
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon };
        }
        return null;
      }
    };

    if (btnModalFly) {
      btnModalFly.addEventListener('click', () => {
        const coords = getModalCoordinates();
        if (coords) {
          uiManager.app.layerManager.setSearchPin(coords.lat, coords.lon);
          uiManager.app.controls.flyToCoordinates(coords.lat, coords.lon);
          uiManager.showCityPopup({ name: `${coords.lat.toFixed(4)}°, ${coords.lon.toFixed(4)}°`, country: '', lat: coords.lat, lon: coords.lon, pop: '' });
          coordModalBackdrop.classList.add('hidden');
        } else {
          alert('Por favor ingresa coordenadas válidas.\nEjemplo: 16° 55\' 27" N, 96° 21\' 34" O\no en decimal: 16.9242, -96.3594');
        }
      });
    }

    if (btnModalSave) {
      btnModalSave.addEventListener('click', () => {
        const coords = getModalCoordinates();
        if (coords) {
          const name = (inputModalName && inputModalName.value.trim()) || `Punto (${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°)`;
          uiManager.app.layerManager.addCustomPlace(name, coords.lat, coords.lon);
          uiManager.renderSavedPlacesList();
          uiManager.app.controls.flyToCoordinates(coords.lat, coords.lon);
          coordModalBackdrop.classList.add('hidden');
          if (inputModalName) inputModalName.value = '';
          const featureInfo = document.getElementById('feature-hover-info');
          if (featureInfo) featureInfo.textContent = `📍 Marcador guardado: ${name}`;
        } else {
          alert('Por favor ingresa coordenadas válidas para guardar el marcador.');
        }
      });
    }
  }
}

window.CoordModal = CoordModal;
