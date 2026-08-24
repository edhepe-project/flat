/**
 * SimControls: Controles de la simulación astronómica.
 * Play/Pause, velocidad, analema, estelas y oscuridad nocturna.
 */

class SimControls {
  static init(ui) {
    const { celestial } = ui.app;

    // Play / Pause
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        ui.app.isLiveSim = !ui.app.isLiveSim;
        btnPlay.classList.toggle('active', ui.app.isLiveSim);
        btnPlay.innerHTML = ui.app.isLiveSim
          ? '<i class="fa-solid fa-pause"></i> En Vivo'
          : '<i class="fa-solid fa-play"></i> Reproducir';
      });
    }

    // Reset tiempo
    const btnResetTime = document.getElementById('btn-reset-time');
    if (btnResetTime) {
      btnResetTime.addEventListener('click', () => {
        ui.app.tDays = 0;
        celestial.setTimeInDays(0);
        celestial.clearTrails();
        ui.updateAstronomicalUI();
      });
    }

    // Velocidad de simulación
    const sliderSpeed = document.getElementById('slider-speed');
    const speedVal    = document.getElementById('speed-val');
    const presetBtns  = document.querySelectorAll('.btn-preset');

    const formatSpeedLabel = (val) => {
      if (Math.abs(val - 0.00001157407) < 0.000005) return '1s = 1s (Real)';
      if (Math.abs(val - 0.000694444)   < 0.0001)   return '1 min / s';
      if (Math.abs(val - 0.0416666)     < 0.005)    return '1 hora / s';
      if (val < 0.1) return `${(val * 24).toFixed(1)} h/s`;
      return `${val.toFixed(2)} d/s`;
    };

    const updateSpeed = (val) => {
      ui.app.speedDaysPerSec = val;
      if (sliderSpeed) sliderSpeed.value = val;
      if (speedVal) speedVal.textContent = formatSpeedLabel(val);
      presetBtns.forEach(btn => {
        const btnSpeed = parseFloat(btn.dataset.speed);
        btn.classList.toggle('active', Math.abs(btnSpeed - val) < (btnSpeed * 0.1 || 0.01));
      });
    };

    if (sliderSpeed) sliderSpeed.addEventListener('input', (e) => updateSpeed(parseFloat(e.target.value)));
    presetBtns.forEach(btn => btn.addEventListener('click', () => updateSpeed(parseFloat(btn.dataset.speed))));

    // Slider de día
    const inputDay = document.getElementById('input-day');
    const dayVal   = document.getElementById('day-val');
    if (inputDay) {
      inputDay.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        ui.app.tDays = val;
        if (dayVal) dayVal.textContent = val.toFixed(1);
        celestial.setTimeInDays(val);
        ui.updateAstronomicalUI();
      });
    }

    // Iluminación nocturna
    const sliderDarkness = document.getElementById('slider-darkness');
    const darknessVal    = document.getElementById('darkness-val');
    const nightToggle    = document.getElementById('toggle-night-realistic');

    const getDarknessLabel = (v) => {
      if (v < 0.3)  return '☀️ Diurna';
      if (v < 0.7)  return '🌆 Crepúsculo';
      if (v < 1.15) return '✦ Estándar';
      if (v < 1.6)  return '🌙 Oscura';
      return '🌑 Fotométrica';
    };

    if (sliderDarkness) {
      sliderDarkness.addEventListener('input', (e) => {
        if (nightToggle && nightToggle.checked) return;
        const val = parseFloat(e.target.value);
        if (darknessVal) darknessVal.textContent = getDarknessLabel(val);
        celestial.setNightDarkness(val);
      });
    }

    if (nightToggle) {
      const switchWrap = document.getElementById('night-mode-switch-wrap');
      if (switchWrap) {
        switchWrap.addEventListener('click', () => {
          nightToggle.checked = !nightToggle.checked;
          nightToggle.dispatchEvent(new Event('change'));
        });
      }
      nightToggle.addEventListener('change', (e) => {
        const on = e.target.checked;
        celestial.setRealisticNightMode(on);
        if (on) {
          if (sliderDarkness) { sliderDarkness.value = 2; sliderDarkness.disabled = true; sliderDarkness.style.opacity = '0.35'; }
          if (darknessVal) darknessVal.textContent = '🌑 Fotométrica';
        } else {
          if (sliderDarkness) { sliderDarkness.disabled = false; sliderDarkness.style.opacity = '1'; }
          const restored = sliderDarkness ? parseFloat(sliderDarkness.value) : 1.0;
          if (darknessVal) darknessVal.textContent = getDarknessLabel(restored);
          celestial.setNightDarkness(restored);
        }
      });
    }

    // Analema y Estelas
    const sliderAnalemaHour = document.getElementById('slider-analema-hour');
    const analemaHourVal    = document.getElementById('analema-hour-val');
    if (sliderAnalemaHour) {
      sliderAnalemaHour.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const hh  = Math.floor(val);
        const mm  = Math.round((val - hh) * 60);
        if (analemaHourVal) analemaHourVal.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
        celestial.setAnalemaHour(val);
      });
    }

    const checkAnalema  = document.getElementById('check-show-analema');
    const checkSunTrail = document.getElementById('check-sun-trail');
    const checkMoonTrail= document.getElementById('check-moon-trail');
    const btnClearTrails= document.getElementById('btn-clear-trails');

    if (checkAnalema)   checkAnalema.addEventListener('change',   (e) => celestial.toggleAnalema(e.target.checked));
    if (checkSunTrail)  checkSunTrail.addEventListener('change',  (e) => celestial.toggleSunTrail(e.target.checked));
    if (checkMoonTrail) checkMoonTrail.addEventListener('change', (e) => celestial.toggleMoonTrail(e.target.checked));
    if (btnClearTrails) btnClearTrails.addEventListener('click',  ()  => celestial.clearTrails());
  }
}

window.SimControls = SimControls;
