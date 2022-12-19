import * as THREE from 'three';
import {
  StreetLineGeometry,
} from '../geometries/StreetGeometry.js';

export class PathMesh extends THREE.Mesh {
  constructor(splinePoints) {

    let geometry;
    let material;
    const hasPoints = splinePoints.length > 0;
    if (hasPoints) {
      const curve = new THREE.CatmullRomCurve3(splinePoints);
      const numPoints = splinePoints.length;
      geometry = new StreetLineGeometry(
        curve, // path
        numPoints, // tubularSegments
        0.05, // radiusX
        0, // radiusY
      );

      const map = new THREE.Texture();
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      (async () => {
        const img = await new Promise((accept, reject) => {
          const img = new Image();
          img.onload = () => {
            accept(img);
          };
          img.onerror = err => {
            reject(err);
          };
          img.src = '/images/arrowtail.png';
        });
        map.image = img;
        map.needsUpdate = true;
      })();
      material = new THREE.MeshBasicMaterial({
        // color: 0xFF0000,
        // flatShading: true,
        map,
        side: THREE.DoubleSide,
      });
    } else {
      geometry = new THREE.BufferGeometry();
      material = new THREE.MeshBasicMaterial({
        color: 0xFF0000,
        // flatShading: true,
      });
    }
    super(geometry, material);

    this.visible = hasPoints;
  }
}