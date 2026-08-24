/**
 * EnvironmentLayers: Gestión de Retícula de Coordenadas, Corredores Marítimos, Rutas de Vuelo y Nubes Dinámicas.
 */

class EnvironmentLayers {
  constructor(layerManager) {
    this.layerManager = layerManager;

    this.gridGroup = new THREE.Group();
    this.flightsGroup = new THREE.Group();
    this.trafficGroup = new THREE.Group();
    this.weatherGroup = new THREE.Group();

    this.layerManager.group.add(this.gridGroup);
    this.layerManager.group.add(this.flightsGroup);
    this.layerManager.group.add(this.trafficGroup);
    this.layerManager.group.add(this.weatherGroup);

    this.cloudMeshes = [];

    this.initCoordinateGrid();
    this.initTrafficCorridors();
    this.initWeatherLayer();

    this.gridGroup.visible = false;
    this.flightsGroup.visible = false;
    this.trafficGroup.visible = false;
    this.weatherGroup.visible = false;
  }

  initCoordinateGrid() {
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.25
    });

    const maxR = this.layerManager.earthDisc.radius - 25;

    // Paralelos
    for (let lat = -80; lat <= 80; lat += 15) {
      const r = (90 - lat) / 180 * maxR;
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(theta) * r, 6.1, Math.sin(theta) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(geo, gridMat));
    }

    // Meridianos — usando la misma convención que latLonToFlatVector:
    // x = sin(lon_rad)*r, z = +cos(lon_rad)*r  (NO negativo)
    for (let lon = -180; lon < 180; lon += 30) {
      const rad = (lon * Math.PI) / 180;
      const pts = [
        new THREE.Vector3(0, 6.1, 0),
        new THREE.Vector3(Math.sin(rad) * maxR, 6.1, Math.cos(rad) * maxR)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.gridGroup.add(new THREE.Line(geo, gridMat));
    }
  }

  initFlightRoutes(citiesData) {
    if (!citiesData) return;
    const flightRoutes = [
      { from: "London", to: "New York", color: 0x38bdf8 },
      { from: "Tokyo", to: "Los Angeles", color: 0x38bdf8 },
      { from: "Dubai", to: "Sydney", color: 0xf59e0b },
      { from: "Paris", to: "Tokyo", color: 0x38bdf8 },
      { from: "Santiago", to: "Sydney", color: 0xef4444 },
      { from: "Johannesburg", to: "Perth", color: 0xef4444 }
    ];

    const cityMap = {};
    citiesData.forEach((c) => { cityMap[c.name] = c; });

    flightRoutes.forEach((route) => {
      const c1 = cityMap[route.from];
      const c2 = cityMap[route.to];
      if (!c1 || !c2) return;

      const p1 = this.layerManager.latLonToFlatVector(c1.lat, c1.lon, 6.5);
      const p2 = this.layerManager.latLonToFlatVector(c2.lat, c2.lon, 6.5);

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      mid.y += Math.min(60, dist * 0.18);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(50);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineDashedMaterial({
        color: route.color,
        dashSize: 4,
        gapSize: 2,
        transparent: true,
        opacity: 0.8
      });

      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      this.flightsGroup.add(line);
    });
  }

  initTrafficCorridors() {
    const shippingLanes = [
      [[9.0, -79.5], [15.0, -120.0], [25.0, -160.0], [35.0, 140.0]],
      [[30.0, 32.5], [12.0, 45.0], [6.0, 80.0], [1.3, 103.8], [22.0, 114.0]],
      [[40.7, -74.0], [45.0, -40.0], [50.0, -10.0], [51.5, 0.0]],
      [[1.3, 103.8], [-5.0, 85.0], [-20.0, 60.0], [-34.0, 18.5]],
      [[-33.8, 151.2], [-35.0, -170.0], [-33.4, -70.6]]
    ];

    shippingLanes.forEach((lane) => {
      const pts = [];
      for (let i = 0; i < lane.length - 1; i++) {
        const p1 = this.layerManager.latLonToFlatVector(lane[i][0], lane[i][1], 6.3);
        const p2 = this.layerManager.latLonToFlatVector(lane[i+1][0], lane[i+1][1], 6.3);
        pts.push(p1, p2);
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.75,
        linewidth: 2
      });
      const line = new THREE.LineSegments(geo, mat);
      this.trafficGroup.add(line);

      lane.forEach((pt) => {
        const pos = this.layerManager.latLonToFlatVector(pt[0], pt[1], 6.5);
        const node = new THREE.Mesh(
          new THREE.SphereGeometry(1.4, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        node.position.copy(pos);
        this.trafficGroup.add(node);
      });
    });
  }

  initWeatherLayer() {
    const cloudCount = 180;
    const cloudGeo = new THREE.DodecahedronGeometry(12, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.9,
      metalness: 0.0
    });

    for (let i = 0; i < cloudCount; i++) {
      const lat = (Math.random() * 140) - 70;
      const lon = (Math.random() * 360) - 180;
      const alt = 25 + Math.random() * 15;

      const pos = this.layerManager.latLonToFlatVector(lat, lon, alt);
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.copy(pos);
      cloud.scale.set(
        1.5 + Math.random() * 2,
        0.4 + Math.random() * 0.4,
        1.5 + Math.random() * 2
      );
      cloud.userData = {
        speed: 0.0003 + Math.random() * 0.0006,
        radius: Math.sqrt(pos.x * pos.x + pos.z * pos.z),
        angle: Math.atan2(pos.z, pos.x),
        altitude: alt
      };
      this.weatherGroup.add(cloud);
      this.cloudMeshes.push(cloud);
    }
  }

  update(deltaSec) {
    if (this.weatherGroup.visible && this.cloudMeshes) {
      this.cloudMeshes.forEach((cloud) => {
        cloud.userData.angle += cloud.userData.speed;
        cloud.position.x = Math.cos(cloud.userData.angle) * cloud.userData.radius;
        cloud.position.z = Math.sin(cloud.userData.angle) * cloud.userData.radius;
      });
    }
  }
}

window.EnvironmentLayers = EnvironmentLayers;
