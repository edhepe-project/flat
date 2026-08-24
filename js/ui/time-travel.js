/**
 * TimeTravel: Selector de fecha/hora y viaje en el tiempo astronómico.
 * Input fecha/hora, Aplicar, Ahora, Steps, Presets de eclipses.
 */

class TimeTravel {
  static init(ui) {
    const { celestial } = ui.app;

    const btnOpenTimeMenu = document.getElementById('btn-open-time-menu');
    const timeDropdown    = document.getElementById('time-travel-dropdown');
    const dateInput       = document.getElementById('time-input-date');
    const timeInput       = document.getElementById('time-input-time');
    const btnApplyDate    = document.getElementById('btn-apply-custom-date');
    const btnTimeNow      = document.getElementById('btn-time-now');

    if (btnOpenTimeMenu && timeDropdown) {
      btnOpenTimeMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        timeDropdown.classList.toggle('hidden');
        if (!timeDropdown.classList.contains('hidden')) {
          const cur = celestial.tToDate(ui.app.tDays);
          if (dateInput) {
            const mm = String(cur.month).padStart(2, '0');
            const dd = String(cur.day).padStart(2, '0');
            dateInput.value = `${cur.year}-${mm}-${dd}`;
          }
          if (timeInput) {
            const hh  = String(cur.hours).padStart(2, '0');
            const min = String(cur.mins).padStart(2, '0');
            timeInput.value = `${hh}:${min}`;
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-open-time-menu') && !e.target.closest('#time-travel-dropdown')) {
          timeDropdown.classList.add('hidden');
        }
      });
    }

    const setTimeByDate = (year, month, day, hour = 12, min = 0) => {
      const newT = celestial.dateToT(year, month, day, hour, min);
      ui.app.tDays = newT;
      celestial.setTimeInDays(newT);
      celestial.clearTrails();
      ui.updateAstronomicalUI();
    };

    if (btnApplyDate && dateInput) {
      btnApplyDate.addEventListener('click', () => {
        const dVal = dateInput.value;
        if (!dVal) return;
        const [y, m, d] = dVal.split('-').map(Number);
        let h = 12, min = 0;
        if (timeInput && timeInput.value) {
          const [th, tm] = timeInput.value.split(':').map(Number);
          h = isNaN(th) ? 12 : th;
          min = isNaN(tm) ? 0 : tm;
        }
        setTimeByDate(y, m, d, h, min);
        if (timeDropdown) timeDropdown.classList.add('hidden');
      });
    }

    if (btnTimeNow) {
      btnTimeNow.addEventListener('click', () => {
        const now = new Date();
        setTimeByDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes());
        if (timeDropdown) timeDropdown.classList.add('hidden');
      });
    }

    document.querySelectorAll('.btn-time-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseFloat(btn.dataset.step);
        ui.app.tDays += step;
        celestial.setTimeInDays(ui.app.tDays);
        ui.updateAstronomicalUI();
      });
    });

    document.querySelectorAll('.btn-time-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = new Date(btn.dataset.date);
        setTimeByDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
        if (timeDropdown) timeDropdown.classList.add('hidden');
      });
    });
  }
}

window.TimeTravel = TimeTravel;
