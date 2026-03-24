import { useMemo } from "react";
import * as THREE from "three";

/**
 * Bottle profile points (x = radius, y = height).
 * Rotated around the Y axis via LatheGeometry to form the bottle shape.
 *
 * Profile (bottom to top):
 *   - Flat bottom
 *   - Cylindrical body
 *   - Shoulder curve tapering inward
 *   - Narrow neck
 *   - Slight flare at the lip
 */
const BOTTLE_PROFILE: [number, number][] = [
  // Bottom cap (flat base)
  [0.0, 0.0],
  [0.55, 0.0],
  [0.55, 0.02],
  // Body
  [0.55, 0.05],
  [0.55, 1.6],
  // Shoulder (curves inward)
  [0.54, 1.7],
  [0.50, 1.8],
  [0.42, 1.9],
  [0.30, 2.0],
  [0.22, 2.1],
  // Neck
  [0.18, 2.2],
  [0.17, 2.5],
  [0.17, 2.8],
  // Lip (slight flare outward)
  [0.19, 2.85],
  [0.20, 2.88],
  [0.20, 2.92],
  [0.18, 2.95],
  // Top inner edge
  [0.15, 2.95],
  [0.15, 2.88],
];

const SEGMENTS = 32;

export function Bottle() {
  const geometry = useMemo(() => {
    const points = BOTTLE_PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
    const geom = new THREE.LatheGeometry(points, SEGMENTS);
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Toon gradient for the cartoon look: 3 discrete brightness steps
  const gradientMap = useMemo(() => {
    const colors = new Uint8Array([60, 120, 200]);
    const texture = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshToonMaterial
        color="#7a4a1a"
        gradientMap={gradientMap}
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
}
