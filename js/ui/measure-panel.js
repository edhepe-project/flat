/**
 * MeasurePanel: Panel del medidor de distancias A→B.
 * Tabs (Búsqueda / Clic), autocompletado doble, calcular, modo clic y limpiar.
 */

class MeasurePanel {
  static init(ui) {
    const { layerManager, controls } = ui.app;

    const tabMeasureSearch  = document.getElementById('tab-measure-search');
    const tabMeasureClick   = document.getElementById('tab-measure-click');
    const panelMeasureSearch= document.getElementById('panel-measure-search');
    const panelMeasureClick = document.getElementById('panel-measure-click');
    const inputMeasureA     = document.getElementById('measure-input-a');
    const inputMeasureB     = document.getElementById('measure-input-b');
    const resultsMeasureA   = document.getElementById('measure-results-a');
    const resultsMeasureB   = document.getElementById('measure-results-b');
    const btnCalcMeasure    = document.getElementById('btn-calc-search-measure');
    const btnMeasure        = document.getElementById('btn-measure-tool');
    const btnClearMeasure   = document.getElementById('btn-clear-measure');

    let pointA = null;
    let pointB = null;

    // Tabs
    if (tabMeasureSearch && tabMeasureClick) {
      tabMeasureSearch.addEventListener('click', () => {
        tabMeasureSearch.style.background = 'var(--teal)';
        tabMeasureSearch.style.color = '#050a12';
        tabMeasureSearch.style.fontWeight = '600';
        tabMeasureClick.style.background = 'transparent';
        tabMeasureClick.style.color = 'var(--text-muted)';
        if (panelMeasureSearch) panelMeasureSearch.classList.remove('hidden');
        if (panelMeasureClick)  panelMeasureClick.classList.add('hidden');
        controls.isMeasuring = false;
        if (btnMeasure) btnMeasure.classList.remove('btn-secondary');
      });

      tabMeasureClick.addEventListener('click', () => {
        tabMeasureClick.style.background = 'var(--teal)';
        tabMeasureClick.style.color = '#050a12';
        tabMeasureClick.style.fontWeight = '600';
        tabMeasureSearch.style.background = 'transparent';
        tabMeasureSearch.style.color = 'var(--text-muted)';
        if (panelMeasureClick)  panelMeasureClick.classList.remove('hidden');
        if (panelMeasureSearch) panelMeasureSearch.classList.add('hidden');
        if (resultsMeasureA) resultsMeasureA.classList.add('hidden');
        if (resultsMeasureB) resultsMeasureB.classList.add('hidden');
      });
    }

    // Autocompletado A
    if (inputMeasureA && resultsMeasureA) {
      SearchAutocomplete.build(inputMeasureA, resultsMeasureA, (p) => {
        pointA = { name: p.name, lat: p.lat, lon: p.lon };
        inputMeasureA.value = p.name;
      }, layerManager, { maxResults: 15, showIcons: true, fullDetails: false });
    }

    // Autocompletado B
    if (inputMeasureB && resultsMeasureB) {
      SearchAutocomplete.build(inputMeasureB, resultsMeasureB, (p) => {
        pointB = { name: p.name, lat: p.lat, lon: p.lon };
        inputMeasureB.value = p.name;
      }, layerManager, { maxResults: 15, showIcons: true, fullDetails: false });
    }

    // Calcular por búsqueda
    if (btnCalcMeasure) {
      btnCalcMeasure.addEventListener('click', () => {
        if (!pointA && inputMeasureA && inputMeasureA.value.trim()) {
          const parsed = GeoParser.parseCoordinates(inputMeasureA.value.trim());
          if (parsed) pointA = { name: `${parsed.lat.toFixed(4)}°, ${parsed.lon.toFixed(4)}°`, lat: parsed.lat, lon: parsed.lon };
        }
        if (!pointB && inputMeasureB && inputMeasureB.value.trim()) {
          const parsed = GeoParser.parseCoordinates(inputMeasureB.value.trim());
          if (parsed) pointB = { name: `${parsed.lat.toFixed(4)}°, ${parsed.lon.toFixed(4)}°`, lat: parsed.lat, lon: parsed.lon };
        }
        if (!pointA || !pointB) {
          alert('Por favor ingresa o selecciona dos puntos válidos (Punto A y Punto B).');
          return;
        }
        const p1 = layerManager.latLonToFlatVector(pointA.lat, pointA.lon, 0);
        const p2 = layerManager.latLonToFlatVector(pointB.lat, pointB.lon, 0);
        layerManager.setMeasureLine(p1, p2);
        const dists = layerManager.calculateDistances(pointA.lat, pointA.lon, pointB.lat, pointB.lon);
        const routeTitle = document.getElementById('measure-route-title');
        if (routeTitle) routeTitle.textContent = `${pointA.name}  ➔  ${pointB.name}`;
        ui.displayMeasureResult(dists);
        controls.flyToCoordinates((pointA.lat + pointB.lat) / 2, (pointA.lon + pointB.lon) / 2, 240);
      });
    }

    // Herramienta de clic en mapa
    if (btnMeasure) {
      btnMeasure.addEventListener('click', () => {
        controls.isMeasuring = true;
        controls.measureStep = 0;
        layerManager.clearMeasure();
        const measureResult = document.getElementById('measure-result');
        if (measureResult) measureResult.classList.add('hidden');
        const hoverInfo = document.getElementById('feature-hover-info');
        if (hoverInfo) hoverInfo.textContent = 'Medición interactiva: Haz clic en el 1er punto sobre el mapa...';
        btnMeasure.classList.add('btn-secondary');
      });
    }

    // Limpiar
    if (btnClearMeasure) {
      btnClearMeasure.addEventListener('click', () => {
        layerManager.clearMeasure();
        pointA = null; pointB = null;
        if (inputMeasureA) inputMeasureA.value = '';
        if (inputMeasureB) inputMeasureB.value = '';
        const measureResult = document.getElementById('measure-result');
        if (measureResult) measureResult.classList.add('hidden');
        const hoverInfo = document.getElementById('feature-hover-info');
        if (hoverInfo) hoverInfo.textContent = 'Sol 24h00m · Luna 24h50m · Ecuación del Tiempo Activa';
        if (btnMeasure) btnMeasure.classList.remove('btn-secondary');
      });
    }
  }
}

window.MeasurePanel = MeasurePanel;
