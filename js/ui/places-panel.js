/**
 * PlacesPanel: Panel de Lugares Guardados y marcador manual de coordenadas.
 */

class PlacesPanel {
  static init(ui) {
    const { layerManager, controls } = ui.app;

    const btnAddPinMap     = document.getElementById('btn-add-pin-map');
    const customPinName    = document.getElementById('custom-pin-name');
    const manualCoordsInput= document.getElementById('manual-coords-input');
    const btnSaveCoords    = document.getElementById('btn-save-coords');

    // Añadir marcador haciendo clic en el mapa
    if (btnAddPinMap) {
      btnAddPinMap.addEventListener('click', () => {
        controls.isAddingPin = true;
        controls.pendingPinName = customPinName ? customPinName.value.trim() : '';
        btnAddPinMap.classList.add('btn-secondary');
        const hoverInfo = document.getElementById('feature-hover-info');
        if (hoverInfo) hoverInfo.textContent = 'Haz clic sobre el mapa para colocar el marcador...';
      });
    }

    // Guardar coordenada manual
    if (btnSaveCoords && manualCoordsInput) {
      btnSaveCoords.addEventListener('click', () => {
        const raw = manualCoordsInput.value.trim();
        const parsed = GeoParser.parseCoordinates(raw);
        if (parsed) {
          const { lat, lon } = parsed;
          const name = (customPinName && customPinName.value.trim()) || `Punto (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
          layerManager.addCustomPlace(name, lat, lon);
          ui.renderSavedPlacesList();
          controls.flyToCoordinates(lat, lon);
          manualCoordsInput.value = '';
          if (customPinName) customPinName.value = '';
        } else {
          alert('Formato de coordenadas no reconocido.');
        }
      });
    }
  }
}

window.PlacesPanel = PlacesPanel;
