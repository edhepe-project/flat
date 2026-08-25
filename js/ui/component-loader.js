/**
 * ComponentLoader: Carga e inyecta dinámicamente los componentes HTML
 * (header, sidebar, widgets) antes de inicializar la aplicación.
 */

async function loadHTMLComponent(containerId, componentUrl) {
  try {
    const res = await fetch(componentUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${componentUrl}`);
    const html = await res.text();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = html;
    }
  } catch (err) {
    console.error(`[ComponentLoader] Error cargando ${componentUrl}:`, err);
  }
}

async function bootstrapAppComponents() {
  await Promise.all([
    loadHTMLComponent('header-root', 'components/header.html'),
    loadHTMLComponent('sidebar-root', 'components/sidebar.html'),
    loadHTMLComponent('widgets-root', 'components/widgets.html')
  ]);
  console.log('[ComponentLoader] Todos los componentes HTML cargados.');
  
  // Instanciar la app principal una vez que todo el DOM está listo
  window.app = new FlatEarthApp();
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrapAppComponents();
});
