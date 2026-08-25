/**
 * HUDManager: Gestión del popup estilo Google Earth, lecturas astronómicas en tiempo real y telescopio PiP lunar.
 */

class HUDManager {
  constructor(uiManager) {
    this.ui = uiManager;
    this.app = uiManager.app;
    this._hudTimer = null;
  }

  showCityPopup(city) {
    const hud = document.getElementById('city-hud');
    if (!hud) return;

    const nameEl = document.getElementById('city-hud-name');
    const subEl  = document.getElementById('city-hud-sub');

    if (nameEl) nameEl.textContent = city.name + (city.country ? `, ${city.country}` : '');

    const latStr = city.lat != null ? `${parseFloat(city.lat).toFixed(4)}${city.lat >= 0 ? '°N' : '°S'}` : '';
    const lonStr = city.lon != null ? ` ${Math.abs(parseFloat(city.lon)).toFixed(4)}${city.lon >= 0 ? '°E' : '°O'}` : '';
    const popStr = city.pop && city.pop !== 'N/A' ? ` · ${city.pop} hab.` : '';
    if (subEl) subEl.textContent = `${latStr}${lonStr}${popStr}`;

    hud.classList.remove('hidden');
    hud.style.opacity = '0';
    hud.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(() => { hud.style.opacity = '1'; });

    if (this._hudTimer) clearTimeout(this._hudTimer);
    this._hudTimer = setTimeout(() => this.hideCityHUD(), 7000);

    const closeBtn = document.getElementById('close-city-hud');
    if (closeBtn) {
      closeBtn.onclick = () => this.hideCityHUD();
    }
  }

  hideCityHUD() {
    const hud = document.getElementById('city-hud');
    if (!hud) return;
    hud.style.opacity = '0';
    setTimeout(() => hud.classList.add('hidden'), 400);
  }

  updateAstronomicalUI() {
    if (!this.app.celestial) return;
    const data = this.app.celestial.getAstronomicalReadouts();
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setTxt('rSunDay', `${data.t.toFixed(1)} (${data.sunYearPct.toFixed(1)}%)`);
    setTxt('rMoonDay', `${(data.t + this.app.celestial.moonOffsetDays).toFixed(1)} (${data.moonMonthPct.toFixed(1)}%)`);
    setTxt('rSunDec', `${data.sunDec.toFixed(2)}°`);
    setTxt('rMoonDec', `${data.moonDec.toFixed(2)}°`);
    setTxt('rEot', `${data.eotMinutes >= 0 ? '+' : ''}${data.eotMinutes.toFixed(1)} min`);
    setTxt('rMoonEnv', `${data.moonMaxDec.toFixed(2)}°`);

    setTxt('sun-status', `${data.sunDec.toFixed(2)}°`);
    setTxt('moon-status', `${data.moonDec.toFixed(2)}°`);
    setTxt('top-moon-phase-val', `${data.moonPhaseName} (${(data.moonReflection * 100).toFixed(0)}%)`);

    const dtEl = document.getElementById('current-datetime-display');
    if (dtEl) {
      const dt = this.app.celestial.tToDate(data.t);
      const mm = String(dt.month).padStart(2, '0');
      const dd = String(dt.day).padStart(2, '0');
      const hh = String(dt.hours).padStart(2, '0');
      const min = String(dt.mins).padStart(2, '0');
      dtEl.textContent = `${dt.year}-${mm}-${dd} ${hh}:${min} UTC`;
    }

    const elPhase = document.getElementById('rMoonPhase');
    if (elPhase) {
      elPhase.textContent = `${data.moonPhaseName} (${(data.moonReflection * 100).toFixed(0)}%)`;
      if (data.eclipse && data.eclipse.isLunarEclipse) {
        elPhase.style.color = '#ef4444';
        elPhase.style.fontWeight = '700';
      } else if (data.eclipse && data.eclipse.isSolarEclipse) {
        elPhase.style.color = '#f59e0b';
        elPhase.style.fontWeight = '700';
      } else {
        elPhase.style.color = '';
        elPhase.style.fontWeight = '';
      }
    }
    const elAngle = document.getElementById('rMoonAngle');
    if (elAngle) {
      elAngle.textContent = `${data.moonPhaseAngleDeg.toFixed(1)}°`;
    }

    const fmtH = (h) => {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return `${hh}h ${String(mm).padStart(2,'0')}min`;
    };
    const elMx = document.getElementById('rDaylightMexico');
    if (elMx) elMx.textContent = fmtH(data.daylightMexico);
    const elEq = document.getElementById('rDaylightEquator');
    if (elEq) elEq.textContent = fmtH(data.daylightEquator);
    const elArc = document.getElementById('rDaylightArctic');
    if (elArc) elArc.textContent = fmtH(data.daylightArctic);

    const dayInput = document.getElementById('input-day');
    const dayVal = document.getElementById('day-val');
    if (dayInput && document.activeElement !== dayInput) {
      dayInput.value = data.t.toFixed(1);
    }
    if (dayVal) {
      dayVal.textContent = data.t.toFixed(1);
    }

    // Actualizar visibilidad de constelaciones en el panel "Cielo Esta Noche"
    if (this.app.earthDisc?.celestialSphere?.updateVisibility) {
      const sunRaDeg = (((data.t / (this.app.celestial?.TY || 365.24219)) * 360) % 360 + 360) % 360;
      this.app.earthDisc.celestialSphere.updateVisibility(sunRaDeg);
    }

    // Telescopio PiP
    if (this.app.isMoonPipActive && this.app.controls && this.app.controls.observerPosition) {
      const pipCoords = document.getElementById('moon-pip-coords');
      const pipPhase = document.getElementById('moon-pip-phase');
      const pipAlert = document.getElementById('moon-pip-eclipse-alert');
      const pipAltAzim = document.getElementById('moon-pip-alt-azim');

      if (this.app.controls.observerLatLon && pipCoords) {
        pipCoords.textContent = `${this.app.controls.observerLatLon.lat.toFixed(2)}°, ${this.app.controls.observerLatLon.lon.toFixed(2)}°`;
      }
      if (pipPhase) {
        pipPhase.textContent = `${data.moonPhaseName} (${(data.moonReflection * 100).toFixed(0)}%)`;
      }
      if (pipAlert) {
        if (data.eclipse && data.eclipse.isLunarEclipse) {
          pipAlert.classList.remove('hidden');
          if (data.eclipse.eclipsePhaseType === 'total' || data.eclipse.lunarEclipseFactor > 0.65) {
            pipAlert.textContent = '🔴 ECLIPSE LUNAR TOTAL (LUNA DE SANGRE)';
            pipAlert.style.color = '#ef4444';
          } else if (data.eclipse.eclipsePhaseType === 'partial' || data.eclipse.lunarEclipseFactor > 0.25) {
            pipAlert.textContent = '🌘 ECLIPSE LUNAR PARCIAL (UMBRA)';
            pipAlert.style.color = '#f97316';
          } else {
            pipAlert.textContent = '🌑 ECLIPSE LUNAR PENUMBRAL';
            pipAlert.style.color = '#cbd5e1';
          }
        } else {
          pipAlert.classList.add('hidden');
        }
      }
      if (pipAltAzim && this.app.celestial && this.app.celestial.moonGroup) {
        const obs = this.app.controls.observerPosition;
        const moon = this.app.celestial.moonGroup.position;
        const dx = moon.x - obs.x;
        const dy = moon.y - obs.y;
        const dz = moon.z - obs.z;
        const distHoriz = Math.sqrt(dx * dx + dz * dz);
        const altDeg = Math.atan2(dy, distHoriz) * (180 / Math.PI);
        let azimDeg = Math.atan2(dx, dz) * (180 / Math.PI);
        if (azimDeg < 0) azimDeg += 360;
        pipAltAzim.textContent = `Alt: ${altDeg.toFixed(1)}° · Az: ${azimDeg.toFixed(1)}°`;
      }
    }
  }
}

window.HUDManager = HUDManager;
