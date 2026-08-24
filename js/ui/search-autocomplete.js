/**
 * SearchAutocomplete: Constructor de autocompletado y búsqueda predictiva universal.
 * Integra 34,000+ ciudades, vecindarios/colonias, lugares guardados y parser de coordenadas.
 */

class SearchAutocomplete {
  static build(inputEl, resultsEl, onSelect, layerManager, options = {}) {
    if (!inputEl || !resultsEl) return;

    const maxResults = options.maxResults || 20;
    const showIcons = options.showIcons !== false;
    const fullDetails = options.fullDetails !== false;

    inputEl.addEventListener('input', (e) => {
      const raw = e.target.value.trim();
      const query = raw.toLowerCase();
      if (!query) {
        resultsEl.classList.add('hidden');
        return;
      }

      resultsEl.innerHTML = '';
      let hasResults = false;

      // 1. Detección Inteligente de Coordenadas
      const parsed = GeoParser.parseCoordinates(raw);
      if (parsed) {
        hasResults = true;
        const item = document.createElement('div');
        item.className = 'search-item';
        const lat = parsed.lat;
        const lon = parsed.lon;
        const mainTxt = fullDetails ? 'Coordenadas detectadas' : 'Coordenada exacta';
        const subTxt = `${lat.toFixed(4)}${lat >= 0 ? '°N' : '°S'} ${Math.abs(lon).toFixed(4)}${lon >= 0 ? '°E' : '°O'}`;
        const arrowHtml = showIcons ? '<i class="fa-solid fa-arrow-right" style="color: var(--teal); font-size: 11px; flex-shrink: 0;"></i>' : '';

        item.innerHTML = `
          <div class="search-item-info">
            <div class="search-item-main"><i class="fa-solid fa-crosshairs" style="color: var(--teal); margin-right: 6px;"></i>${mainTxt}</div>
            <div class="search-item-sub">${subTxt}</div>
          </div>
          ${arrowHtml}
        `;
        item.addEventListener('click', () => {
          onSelect({
            isCoordinate: true,
            name: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
            lat,
            lon
          });
          resultsEl.classList.add('hidden');
        });
        resultsEl.appendChild(item);
      }

      // 2. Búsqueda en Lugares Guardados por el Usuario
      if (layerManager && layerManager.customPlaces && layerManager.customPlaces.length > 0) {
        const customMatches = layerManager.customPlaces.filter(p => p.name.toLowerCase().includes(query));
        customMatches.forEach((place) => {
          hasResults = true;
          const item = document.createElement('div');
          item.className = 'search-item';
          const arrowHtml = showIcons ? '<i class="fa-solid fa-location-arrow" style="color: var(--sun-gold); font-size: 11px; flex-shrink: 0;"></i>' : '';
          item.innerHTML = `
            <div class="search-item-info">
              <div class="search-item-main"><i class="fa-solid fa-bookmark" style="color: var(--sun-gold); margin-right: 6px;"></i></div>
              <div class="search-item-sub">📌 ${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°</div>
            </div>
            ${arrowHtml}
          `;
          const mainTitleNode = item.querySelector('.search-item-main');
          if (mainTitleNode) mainTitleNode.appendChild(document.createTextNode(place.name));

          item.addEventListener('click', () => {
            onSelect({
              isCustom: true,
              id: place.id,
              name: place.name,
              lat: place.lat,
              lon: place.lon
            });
            resultsEl.classList.add('hidden');
          });
          resultsEl.appendChild(item);
        });
      }

      // 3. Búsqueda en Vecindarios / Colonias
      if (layerManager && layerManager.neighborhoodsData && layerManager.neighborhoodsData.length > 0 && query.length >= 3) {
        const nhNormQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nhMatched = [];
        for (let i = 0; i < layerManager.neighborhoodsData.length && nhMatched.length < 5; i++) {
          const nh = layerManager.neighborhoodsData[i];
          const nhNorm = (nh.a || nh.n || nh.name || '').toLowerCase();
          if (nhNorm.includes(nhNormQuery)) {
            nhMatched.push(nh);
          }
        }

        nhMatched.forEach((nh) => {
          hasResults = true;
          const nhName       = nh.n || nh.name;
          const nhCity       = nh.c || nh.city || '';
          const nhMunicip    = nh.m || nh.municipality || '';
          const nhLat        = nh.lt !== undefined ? nh.lt : (nh.lat !== undefined ? nh.lat : 0);
          const nhLon        = nh.ln !== undefined ? nh.ln : (nh.lon !== undefined ? nh.lon : 0);

          const item = document.createElement('div');
          item.className = 'search-item';
          const arrowHtml = showIcons ? '<i class="fa-solid fa-location-arrow" style="color: #c084fc; font-size: 11px; flex-shrink: 0;"></i>' : '';
          item.innerHTML = `
            <div class="search-item-info">
              <div class="search-item-main"><i class="fa-solid fa-house-chimney-window" style="color: #c084fc; margin-right: 6px;"></i></div>
              <div class="search-item-sub">Colonia · ${nhCity}${nhMunicip ? ' (' + nhMunicip + ')' : ''} · ${nhLat.toFixed(4)}°, ${nhLon.toFixed(4)}°</div>
            </div>
            ${arrowHtml}
          `;
          const mainTitleNode = item.querySelector('.search-item-main');
          if (mainTitleNode) mainTitleNode.appendChild(document.createTextNode(nhName));

          item.addEventListener('click', () => {
            onSelect({
              isNeighborhood: true,
              name: nhCity ? `${nhName} (${nhCity})` : nhName,
              lat: nhLat,
              lon: nhLon
            });
            resultsEl.classList.add('hidden');
          });
          resultsEl.appendChild(item);
        });
      }

      // 4. Búsqueda en Base Global de Ciudades (+34,000)
      if (layerManager) {
        const allList = (layerManager.allCities && layerManager.allCities.length > 0)
          ? layerManager.allCities
          : (layerManager.citiesData || []).map(c => ({ n: c.name, a: c.name, lt: c.lat, ln: c.lon, c: c.country, p: 0 }));

        const normQuery = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matched = [];
        for (let i = 0; i < allList.length && matched.length < maxResults; i++) {
          const c = allList[i];
          const nNorm = (c.a || c.n || '').toLowerCase();
          if (nNorm.includes(normQuery) || (c.n && c.n.toLowerCase().includes(query))) {
            matched.push(c);
          }
        }

        if (matched.length > 0) {
          hasResults = true;
          matched.forEach((c) => {
            const cName = c.n || c.name;
            const cCountry = c.c || c.country || '';
            const cLat = c.lt !== undefined ? c.lt : c.lat;
            const cLon = c.ln !== undefined ? c.ln : c.lon;
            const popLabel = (c.p && fullDetails)
              ? (c.p >= 1000000 ? ` · ${(c.p/1e6).toFixed(1)}M` : c.p >= 1000 ? ` · ${(c.p/1000).toFixed(0)}k` : '')
              : '';

            const item = document.createElement('div');
            item.className = 'search-item';
            const arrowHtml = showIcons ? '<i class="fa-solid fa-location-arrow" style="color: var(--teal); font-size: 11px; flex-shrink: 0;"></i>' : '';
            item.innerHTML = `
              <div class="search-item-info">
                <div class="search-item-main"><i class="fa-solid fa-city" style="color: #38bdf8; margin-right: 6px;"></i></div>
                <div class="search-item-sub"></div>
              </div>
              ${arrowHtml}
            `;
            const mainTitleNode = item.querySelector('.search-item-main');
            const subTitleNode = item.querySelector('.search-item-sub');
            if (mainTitleNode) mainTitleNode.appendChild(document.createTextNode(cName));
            if (subTitleNode) {
              subTitleNode.textContent = `${cCountry}${popLabel} · ${cLat.toFixed(2)}°, ${cLon.toFixed(2)}°`;
            }

            item.addEventListener('click', () => {
              onSelect({
                isCity: true,
                name: fullDetails ? cName : `${cName} (${cCountry})`,
                country: cCountry,
                lat: cLat,
                lon: cLon,
                pop: c.p || 0
              });
              resultsEl.classList.add('hidden');
            });
            resultsEl.appendChild(item);
          });
        }
      }

      if (hasResults) {
        resultsEl.classList.remove('hidden');
      } else {
        resultsEl.innerHTML = '<div style="padding: 9px 12px; color: var(--text-muted); font-size: 11.5px;"><i class="fa-solid fa-circle-xmark" style="margin-right:6px;"></i>No se encontraron coincidencias</div>';
        resultsEl.classList.remove('hidden');
      }
    });
  }
}

window.SearchAutocomplete = SearchAutocomplete;
