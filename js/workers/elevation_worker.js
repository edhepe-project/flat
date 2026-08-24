/**
 * Web Worker: Reproyeccion azimutal equidistante del mapa de elevacion DEM.
 *
 * Recibe los pixeles fuente (equirectangular) y los transforma al sistema de
 * coordenadas del disco plano. El loop es O(n^2) con n=4096 (~16.7M iteraciones).
 * Al correr en un Worker separado, el hilo principal permanece libre y la UI
 * no se congela.
 *
 * Protocolo:
 *   INPUT  -> { srcBuffer: ArrayBuffer, srcW, srcH, size, cx, cy, discRadius }
 *   OUTPUT -> { dstBuffer: ArrayBuffer }  (transferido en zero-copy)
 */
self.onmessage = function (e) {
  const { srcBuffer, srcW, srcH, size, cx, cy, discRadius } = e.data;

  const srcData = new Uint8ClampedArray(srcBuffer);
  const dstData = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dstIdx = (y * size + x) * 4;
      const dx = -(x - cx);
      const dy = cy - y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r <= discRadius) {
        // Convertir coordenadas del disco -> lat/lon
        const lat = 90 - (r / discRadius) * 180;
        let lon = (Math.atan2(dy, dx) * 180 / Math.PI) - 90;
        while (lon < -180) lon += 360;
        while (lon >  180) lon -= 360;

        // Mapear lat/lon -> UV de la imagen fuente equirectangular
        const u = (lon + 180) / 360;
        const v = (90 - lat) / 180;

        const srcX = Math.min(srcW - 1, Math.max(0, Math.floor(u * srcW)));
        const srcY = Math.min(srcH - 1, Math.max(0, Math.floor(v * srcH)));
        const srcIdx = (srcY * srcW + srcX) * 4;

        // Escala de grises: canal R como valor de elevacion
        const h = srcData[srcIdx];
        dstData[dstIdx]     = h;
        dstData[dstIdx + 1] = h;
        dstData[dstIdx + 2] = h;
        dstData[dstIdx + 3] = 255;
      } else {
        // Fuera del disco -> negro opaco (sin relieve)
        dstData[dstIdx]     = 0;
        dstData[dstIdx + 1] = 0;
        dstData[dstIdx + 2] = 0;
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  // Transferir resultado al hilo principal en zero-copy
  self.postMessage({ dstBuffer: dstData.buffer }, [dstData.buffer]);
};
