/**
 * CelestialTrails: Estelas orbitales del Sol y la Luna + Analema (curva en 8).
 * Módulo independiente delegado por CelestialSystem.
 */

class CelestialTrails {
  constructor(celestialSystem) {
    this.cs = celestialSystem;
    this.trailMax = 1460;

    this.sunTrailPts  = [];
    this.moonTrailPts = [];
    this.showSunTrail  = false;
    this.showMoonTrail = false;
    this.showAnalema   = false;
    this.analemaHour   = 12;

    this.sunTrailLine  = null;
    this.moonTrailLine = null;
    this.analemaGroup  = null;
    this.analemaLine   = null;

    this._initTrails();
    this._initAnalema();
  }

  _initTrails() {
    const cs = this.cs;

    this.sunTrailLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xe7b24b, transparent: true, opacity: 0.85, linewidth: 2 })
    );
    this.sunTrailLine.visible = false;
    cs.group.add(this.sunTrailLine);

    this.moonTrailLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xafcbe0, transparent: true, opacity: 0.75, linewidth: 2 })
    );
    this.moonTrailLine.visible = false;
    cs.group.add(this.moonTrailLine);
  }

  _initAnalema() {
    const cs = this.cs;
    this.analemaGroup = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, linewidth: 2 });
    this.analemaLine = new THREE.Line(geo, mat);
    this.analemaGroup.add(this.analemaLine);
    this.rebuild();
    this.analemaGroup.visible = false;
    cs.group.add(this.analemaGroup);
  }

  rebuild() {
    const cs = this.cs;
    const pts = [];
    const nDays = Math.round(cs.TY);
    for (let i = 0; i <= nDays; i++) {
      const tt = i + this.analemaHour / 24;
      const dS = cs.decSun(tt);
      const aS = cs.angleSun(tt);
      const r  = cs.radiusForDec(dS);
      pts.push(new THREE.Vector3(Math.cos(aS) * r, cs.sunAltitude, Math.sin(aS) * r));
    }
    this.analemaLine.geometry.setFromPoints(pts);
  }

  push(sx, sy, sz, mx, my, mz) {
    const newPtSun  = new THREE.Vector3(sx, sy, sz);
    const newPtMoon = new THREE.Vector3(mx, my, mz);

    if (this.sunTrailPts.length > 0) {
      const last = this.sunTrailPts[this.sunTrailPts.length - 1];
      if (last.distanceTo(newPtSun) < 0.5) return;
    }

    this.sunTrailPts.push(newPtSun);
    this.moonTrailPts.push(newPtMoon);

    if (this.sunTrailPts.length  > this.trailMax) this.sunTrailPts.shift();
    if (this.moonTrailPts.length > this.trailMax) this.moonTrailPts.shift();

    if (this.sunTrailLine  && this.showSunTrail)  this.sunTrailLine.geometry.setFromPoints(this.sunTrailPts);
    if (this.moonTrailLine && this.showMoonTrail) this.moonTrailLine.geometry.setFromPoints(this.moonTrailPts);
  }

  clear() {
    this.sunTrailPts  = [];
    this.moonTrailPts = [];
    if (this.sunTrailLine)  this.sunTrailLine.geometry.setFromPoints([]);
    if (this.moonTrailLine) this.moonTrailLine.geometry.setFromPoints([]);
  }

  toggleSun(visible)    { this.showSunTrail  = visible; if (this.sunTrailLine)  this.sunTrailLine.visible  = visible; }
  toggleMoon(visible)   { this.showMoonTrail = visible; if (this.moonTrailLine) this.moonTrailLine.visible = visible; }
  toggleAnalema(visible){ this.showAnalema   = visible; if (this.analemaGroup)  this.analemaGroup.visible  = visible; }

  setAnalemaHour(hour) {
    this.analemaHour = hour;
    this.rebuild();
  }
}

window.CelestialTrails = CelestialTrails;
