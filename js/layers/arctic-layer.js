/**
 * ArcticLayer: Gestión del Continente Ártico Septentrional (Islas de Mercator) y su relieve topográfico 3D.
 */

class ArcticLayer {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.arcticIslandsGroup = new THREE.Group();
    this.layerManager.group.add(this.arcticIslandsGroup);

    this.arcticIslandsMesh = null;
    this.arcticDisplacementTexture = null;
    this.arcticIslandsGroup.visible = false;

    this.init();
  }

  init() {
    const loader = new THREE.TextureLoader();
    loader.load('textures/mercator_islands_cropped.png', (texture) => {
      texture.anisotropy = 8;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;

      const size = 45.675;
      const geo = new THREE.PlaneGeometry(size, size, 128, 128);

      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.12,
        opacity: 1.0,
        roughness: 0.68,
        metalness: 0.12,
        side: THREE.DoubleSide,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        displacementScale: 0,
        displacementBias: 0
      });

      loader.load('textures/mercator_islands_elevation.png', (elevTex) => {
        elevTex.anisotropy = 8;
        elevTex.minFilter = THREE.LinearMipmapLinearFilter;
        elevTex.magFilter = THREE.LinearFilter;
        mat.displacementMap = elevTex;
        mat.bumpMap = elevTex;
        mat.bumpScale = 0;
        this.arcticDisplacementTexture = elevTex;
        mat.needsUpdate = true;
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -THREE.MathUtils.degToRad(7);
      mesh.position.set(0, 6.015, 0);
      mesh.name = 'mercator-arctic-islands-overlay';
      this.arcticIslandsMesh = mesh;
      this.arcticIslandsGroup.add(mesh);
    }, undefined, (err) => {
      console.warn('[ArcticLayer] No se pudo cargar textures/mercator_islands_cropped.png:', err);
    });
  }

  toggle(visible) {
    this.arcticIslandsGroup.visible = visible;
  }

  toggleRelief(enabled, scale = 8.0) {
    if (!this.arcticIslandsMesh || !this.arcticIslandsMesh.material) return;
    const mat = this.arcticIslandsMesh.material;
    if (enabled) {
      const arcticScale = Math.min(2.5, scale * 0.22);
      mat.displacementScale = arcticScale;
      mat.bumpScale = Math.min(1.5, scale * 0.12);
    } else {
      mat.displacementScale = 0;
      mat.bumpScale = 0;
    }
    mat.needsUpdate = true;
  }

  setReliefScale(scale) {
    if (!this.arcticIslandsMesh || !this.arcticIslandsMesh.material) return;
    const mat = this.arcticIslandsMesh.material;
    const arcticScale = scale > 0 ? Math.min(2.5, scale * 0.22) : 0;
    mat.displacementScale = arcticScale;
    mat.bumpScale = scale > 0 ? Math.min(1.5, scale * 0.12) : 0;
    mat.needsUpdate = true;
  }
}

window.ArcticLayer = ArcticLayer;
