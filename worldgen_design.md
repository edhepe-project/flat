# Sistema Planetario de Generación de Ecosistemas Físicos Realistas (TerraPlana WorldGen Engine)

## 1. Visión y Objetivos del Sistema
Crear un generador de mundos de nivel profesional basado en leyes de **climatología física, geología, placas tectónicas, termodinámica y ecología de biomas reales** (Modelos de Whittaker, Holdridge y Köppen), adaptado a la geometría de disco plano con luminarias orbitales locales.

---

## 2. Parámetros Físicos Solicitados al Usuario (El "Panel Génesis")

### A. Geología & Tectónica
1. **Densidad y Número de Placas Tectónicas** (2 a 16 placas): Determina los puntos de choque (orogénesis, cordilleras escarpadas) y dorsales de separación (fosas abisales, islas volcánicas).
2. **Nivel del Mar / Porcentaje de Océano** (15% a 85%): De mundos desérticos súper áridos a mundos oceánicos de archipiélagos.
3. **Erosión Hidráulica y Térmica** (0 a 100 iteraciones): Cañones fluviales, deltas de ríos y sedimentación costera natural.

### B. Astrofísica & Radiación Lumínica
4. **Número de Soles (0 a 4)** y su espectro (Sol Amarillo Clásico, Enana Roja, Gigante Azul, Sol Ámbar).
5. **Altitud y Radio de Órbita de los Soles**: Determina los cinturones de insolación y las zonas de sombra perpetua.
6. **Número de Lunas (0 a 4)**: Influye en las mareas oceánicas y la caída de temperatura nocturna.

### C. Dinámica Atmosférica & Clima
7. **Presión Atmosférica & Densidad del Aire**: Influye en la retención de calor (efecto invernadero) y dispersión Rayleigh.
8. **Humedad Global y Celdas de Viento (Hadley / Ferrel en Plano)**: Crea corrientes de viento dominantes que chocan contra las cordilleras (Efecto Foehn / Sombra de Lluvia).

---

## 3. Matriz Científica de 16 Biomas Reales (Matriz de Whittaker / Köppen)

| Temperatura / Humedad | **Hiper-Árido (<15%)** | **Semiárido (15-35%)** | **Subhúmedo (35-65%)** | **Húmedo / Saturado (>65%)** |
| :--- | :--- | :--- | :--- | :--- |
| **Muy Caliente (>30°C)** | Desierto de Dunas de Salitre | Sabana Árida & Cañones | Bosque Tropical Seco | Selva Lluviosa Tropical / Manglares |
| **Cálido (20°C - 30°C)** | Estepa Rocosa / Chaparral | Pradera Templada | Bosque Mixto Templado | Bosque Nuboso / Pantanos |
| **Templado (10°C - 20°C)** | Páramo Frío Seco | Taiga / Coníferas Bajas | Bosque Boreal Denso | Turberas & Humedales Fríos |
| **Glaciar (<0°C)** | Desierto Polar de Roca | Tundra Permafrost | Glaciares Alpinos | Banquisa Ártica / Hielo Perpetuo |

---

## 4. Pipeline de Simulación Física por Capas

```
[1. Tectónica & Elevación DEM] ──> [2. Radiación Solar por Píxel] ──> [3. Celdas de Viento & Lluvia]
                                                                                  │
[6. Mapa de Ecosistemas Final] <── [5. Matriz Biomas Whittaker] <─── [4. Efecto Sombra de Lluvia]
```

1. **Simulación de Radiación Solar Acumulada**: Cada celda del disco calcula cuánta radiación recibe a lo largo de un ciclo orbital completo según el paso de los soles.
2. **Mapa de Presión y Vientos Dominantes**: El aire caliente asciende bajo el paso solar, generando frentes de vientos ciclónicos hacia la periferia.
3. **Sombra Pluvial (Rain Shadow Effect)**: El viento cargado de humedad marina choca con las montañas; al ascender condensa (lluvia torrencial en la ladera expuesta) y al descender por el otro lado genera un desierto seco.
4. **Asignación de Bioma Celular y Detalle Micro-Ecológico**: Con la altitud, temperatura y humedad exacta calculadas, se asigna el bioma exacto con degradados de color botánicos naturales, bosques, ríos y deltas.

---

## 5. Módulos de Interfaz e Interactividad

1. **Panel de Inspección Ecológica por Cursor**: Al pasar el ratón por cualquier punto del mapa, ver:
   * Nombre del Bioma exacto.
   * Altitud (metros sobre el nivel del mar).
   * Temperatura media (°C).
   * Precipitación anual (mm/año).
   * Vegetación y fauna dominante.
2. **Generador Paramétrico "Génesis"**: Sliders precisos para ajustar tectónica, humedad, radiación y atmósfera con previsualización en tiempo real.
3. **Exportación Científica**:
   * Descarga del **Mapa de Biomas en Alta Resolución (2048×2048)**.
   * Descarga del **Mapa de Elevación DEM (Heightmap escala de grises)**.
   * Descarga del **Mapa de Temperatura y Humedad Térmica**.
