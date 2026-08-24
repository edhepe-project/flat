# 📜 Registro de Auditoría y Cambios (Changelog) · TerraPlana 3D Pro

**Proyecto:** Simulador Astronómico y Geométrico Azimutal Equidistante 3D  
**Fecha:** 22 de Agosto de 2026  
**Objetivo:** Auditoría integral de arquitectura, corrección de bugs críticos, optimización de rendimiento, seguridad, modularización y portabilidad del proyecto.

---

## 📌 Resumen Ejecutivo de la Auditoría

Se realizó una auditoría completa del código fuente original identificando:
- **3 problemas críticos de GPU y memoria** (Memory leaks al eliminar marcadores, bloqueo de 3-8s en hilo UI durante el cálculo del DEM y fecha astronómica desfasada).
- **Sobrecarga de red en arranque** (Descarga inicial obligatoria de 14.6 MB de GeoJSON de fronteras).
- **Código muerto y clases CSS huérfanas** (~170 líneas de código inalcanzable).
- **Duplicación de código en la lógica de búsqueda universal y medición**.
- **Dependencias CDN desactualizadas** (Three.js r128 de 2021).
- **Falta de portabilidad para arranque en un solo clic** en PCs sin herramientas de desarrollo.

---

## 🛠️ Detalle de Cambios Realizados por Módulo

### 1. [`js/main.js`](file:///c:/Proyectos/TerraPlana_3D_Project/js/main.js) — Sincronización Temporal
- **Corrección de fecha fija:** Se eliminó el parámetro fijo `this.tDays = 155.0` (que forzaba siempre la fecha al 22 de agosto) y se reemplazó por el cálculo dinámico basado en `new Date()` y el equinoccio de marzo (`dia_del_año - 79`).
- **Sincronización inicial:** El Sol y la Luna ahora arrancan en sus posiciones astronómicas reales del día en curso.

---

### 2. [`js/layers.js`](file:///c:/Proyectos/TerraPlana_3D_Project/js/layers.js) — Fugas de Memoria GPU & Lazy Loading
- **Memory Leaks en Marcadores (WebGL Context Loss):**
  - Implementada liberación recursiva (`traverse`) de `geometry.dispose()`, `material.dispose()` y `material.map.dispose()` en:
    - `removeCustomPlace(placeId)`
    - `removeSearchPinById(pinId)`
    - `clearSearchPin()`
- **Lazy Loading de Fronteras Políticas (`countries.geojson`):**
  - Se dividió `initCountriesAndBorders()` en una inicialización ligera y el método asíncrono en demanda `_fetchAndBuildCountries()`.
  - El archivo de **14.6 MB** ya no se descarga al inicio del simulador; únicamente se transfiere si el usuario activa el toggle de fronteras políticas.
- **Corrección de referencias de animación:**
  - Se aseguró la referencia directa `ring2Mat: ring2.material` en `pinObj` para la animación pulsante del anillo exterior.

---

### 3. [`js/earth-disc.js`](file:///c:/Proyectos/TerraPlana_3D_Project/js/earth-disc.js) & [`js/workers/elevation_worker.js`](file:///c:/Proyectos/TerraPlana_3D_Project/js/workers/elevation_worker.js) — Desacople a Web Worker
- **Eliminación del bloqueo de interfaz (UI Freeze):**
  - El bucle $O(n^2)$ con $n=4096$ (~16.7 millones de operaciones matemáticas de reproyección azimutal equidistante) se extrajo del hilo principal de JavaScript.
  - Se creó el Web Worker [`elevation_worker.js`](file:///c:/Proyectos/TerraPlana_3D_Project/js/workers/elevation_worker.js) que recibe los buffers en *zero-copy* (`Transferable Objects`), realiza el cálculo en paralelo en segundo plano y devuelve la textura sin congelar la animación 3D.
- **Eliminación de código muerto:**
  - Se eliminó el método inactivo `loadGleasonTexture()` (122 líneas de código) que había sido reemplazado por el mapa satelital Ultra HD.

---

### 4. [`js/ui.js`](file:///c:/Proyectos/TerraPlana_3D_Project/js/ui.js) — Desduplicación y Sanitización XSS
- **Unificación del Buscador Universal:**
  - Se creó el método modular reutilizable `buildSearchAutocomplete(inputEl, resultsEl, onSelect, options)`.
  - Se eliminaron ~120 líneas duplicadas entre el buscador del header y el medidor de distancias A ➔ B (`setupMeasureAutocomplete`).
- **Mitigación de Vulnerabilidades XSS:**
  - Se reemplazó la concatenación de cadenas directas en `innerHTML` por nodos DOM seguros (`document.createTextNode` / `textContent`) al renderizar nombres de ciudades y marcadores personalizados guardados por el usuario.
- **Control de Altura del Domo:**
  - Se enlazó el slider de altura del domo (`0.3x` a `2.0x`) con `setDomeHeightScale()` en `EarthDisc`.

---

### 5. [`css/styles.css`](file:///c:/Proyectos/TerraPlana_3D_Project/css/styles.css) — Limpieza y Modularización
- **Eliminación de clases huérfanas:**
  - Se borraron las clases `.place-popup`, `.close-popup-btn`, `.popup-content`, `.popup-actions` y `.btn-sm`.
- **Nuevas clases componentes:**
  - `.city-hud-panel`, `.city-hud-icon`, `.city-hud-name`, `.city-hud-sub`, `.btn-icon-close`
  - `.modal-backdrop`, `.modal-dialog`, `.modal-icon-badge`, `.tab-pill-group`, `.tab-pill-btn`
  - `.sidebar-dock-tab`

---

### 6. [`index.html`](file:///c:/Proyectos/TerraPlana_3D_Project/index.html) — Seguridad, SEO, Accesibilidad y Modernización
- **Actualización de Librerías Core:**
  - Three.js: `r128` (2021) ➔ `0.160.0`
  - OrbitControls: `r128` ➔ `0.160.0`
  - Tween.js: `18.6.4` ➔ `20.0.0`
- **Content Security Policy (CSP):**
  - Añadida cabecera restrictiva `<meta http-equiv="Content-Security-Policy">` que permite CDNs verificadas, Workers locales y Canvas data-URIs.
- **SEO & Accesibilidad:**
  - `<meta name="description">` y `<meta name="keywords">`.
  - Favicon SVG embebido inline.
  - Atributos `aria-label` y `role="toolbar"` para soporte de lectores de pantalla en controles interactivos 3D.
- **Migración de estilos inline:**
  - Reemplazo de bloques de estilos inline extensos por las nuevas clases de `styles.css`.

---

### 7. Portabilidad y Arranque Universal ([`start.bat`](file:///c:/Proyectos/TerraPlana_3D_Project/start.bat) & `TerraPlana 3D Pro.lnk`)
- **Arranque en 1 clic para cualquier computadora:**
  - **Nivel 1:** Si detecta Python, usa `python -m http.server 8080`.
  - **Nivel 2:** Si detecta Node.js, usa `npx serve`.
  - **Nivel 3 (Nativo Windows):** Si la computadora no tiene instalado ningún entorno de desarrollo, levanta un servidor HTTP nativo mediante PowerShell y .NET `HttpListener` con soporte de tipos MIME y CORS.
- **Acceso directo:** Generado `TerraPlana 3D Pro.lnk` con icono para ejecutar sin abrir consolas.

---

## 🧪 Pruebas y Validación Realizadas

1. **Pruebas de Sintaxis:**
   - Todos los archivos `.js` validados con `node -c`.
2. **Pruebas Unitarias de Fórmulas Astronómicas:**
   - Declinación solar en solsticio ($23.44^\circ$) y equinoccio ($0.00^\circ$).
   - Ecuación del tiempo en rango físico $[-16\,\text{min}, +18\,\text{min}]$.
   - Fases e iluminación lunar en $[0.0, 1.0]$.
   - Horas de luz ecuatoriales con refracción atmosférica ($12.11\,\text{h}$).

---

*Registro generado para control de versiones y traspaso entre equipos.*
