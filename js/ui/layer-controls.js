/**
 * LayerControls: Gestión de todos los toggles y sliders del panel de capas de mapa.
 * Satélite, Relieve, Ártico, Ice Wall, Domo, Grid, Países, Vuelos, Tráfico, Clima.
 */

class LayerControls {
  static init(ui) {
    const { earthDisc, layerManager } = ui.app;

    // Satélite
    const elSatellite = document.getElementById('layer-satellite');
    if (elSatellite) {
      elSatellite.addEventListener('change', (e) => {
        earthDisc.setMapStyle(e.target.checked ? 'satellite' : 'dark');
      });
    }

    // Relieve + slider
    const elRelief       = document.getElementById('layer-relief');
    const sliderRelief   = document.getElementById('slider-relief');
    const reliefVal      = document.getElementById('relief-val');
    const reliefContainer= document.getElementById('relief-slider-container');

    if (elRelief) {
      elRelief.addEventListener('change', (e) => {
        earthDisc.toggleRelief(e.target.checked);
        if (layerManager && layerManager.toggleArcticRelief) {
          const scale = sliderRelief ? parseFloat(sliderRelief.value) : 8.0;
          layerManager.toggleArcticRelief(e.target.checked, scale);
        }
        if (reliefContainer) {
          reliefContainer.style.opacity = e.target.checked ? '1' : '0.4';
          reliefContainer.style.pointerEvents = e.target.checked ? 'auto' : 'none';
        }
      });
    }
    if (sliderRelief && reliefVal) {
      sliderRelief.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        reliefVal.textContent = val.toFixed(1) + 'x';
        earthDisc.setReliefScale(val);
        if (layerManager && layerManager.setArcticReliefScale) layerManager.setArcticReliefScale(val);
      });
    }

    // Ártico
    const elArctic = document.getElementById('layer-arctic-islands');
    if (elArctic) {
      elArctic.addEventListener('change', (e) => {
        if (layerManager && layerManager.toggleArcticIslands) layerManager.toggleArcticIslands(e.target.checked);
      });
    }

    // Ice Wall
    const elIcewall = document.getElementById('layer-icewall');
    if (elIcewall) elIcewall.addEventListener('change', (e) => earthDisc.toggleIceWall(e.target.checked));

    // Domo + slider altura
    const elDome          = document.getElementById('layer-dome');
    const sliderDomeHeight= document.getElementById('slider-dome-height');
    const domeHeightVal   = document.getElementById('dome-height-val');
    const domeContainer   = document.getElementById('dome-slider-container');

    if (elDome) {
      elDome.addEventListener('change', (e) => {
        earthDisc.toggleDome(e.target.checked);
        if (domeContainer) {
          domeContainer.style.opacity = e.target.checked ? '1' : '0.4';
          domeContainer.style.pointerEvents = e.target.checked ? 'auto' : 'none';
        }
      });
    }
    if (sliderDomeHeight && domeHeightVal) {
      sliderDomeHeight.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        domeHeightVal.textContent = val.toFixed(2) + 'x';
        earthDisc.setDomeHeightScale(val);
      });
    }

    // Grid, Países, Vuelos, Tráfico, Clima
    const elGrid = document.getElementById('layer-grid');
    if (elGrid) elGrid.addEventListener('change', (e) => layerManager.toggleGrid(e.target.checked));

    const elCountries = document.getElementById('layer-countries');
    if (elCountries) elCountries.addEventListener('change', (e) => layerManager.toggleCountries(e.target.checked));

    const elFlights = document.getElementById('layer-flights');
    if (elFlights) elFlights.addEventListener('change', (e) => layerManager.toggleFlights(e.target.checked));

    const elTraffic = document.getElementById('layer-traffic');
    if (elTraffic) elTraffic.addEventListener('change', (e) => layerManager.toggleTraffic(e.target.checked));

    const elWeather = document.getElementById('layer-weather');
    if (elWeather) elWeather.addEventListener('change', (e) => layerManager.toggleWeather(e.target.checked));

    // Luces Urbanas Nocturnas
    const elCityLights = document.getElementById('layer-city-lights');
    if (elCityLights) {
      elCityLights.addEventListener('change', (e) => earthDisc.toggleNightCityLights(e.target.checked));
    }

    // Aplicar estado inicial de capas según los checkboxes
    if (elCountries && elCountries.checked) {
      layerManager.toggleCountries(true);
    }
  }
}

window.LayerControls = LayerControls;
