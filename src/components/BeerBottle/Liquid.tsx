import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The beer liquid inside the bottle.
 *
 * Uses a LatheGeometry that mirrors the bottle's inner profile but whose
 * height is driven by `level` (1 = full, 0 = empty). The geometry is
 * reconstructed whenever the level changes in meaningful steps, while the
 * mesh's scale.y is smoothly interpolated every frame for fluid animation.
 */

// Inner radius is slightly smaller than the bottle wall at each height
// Profile: flat bottom disk → cylindrical body → taper at shoulder
// We only fill up to the shoulder (y ≈ 1.6) at level=1; the neck stays empty.
const BODY_RADIUS = 0.50; // slightly inset from bottle's 0.55
const BODY_TOP = 1.58; // max fill height (just below shoulder start)
const BODY_BOTTOM = 0.05;

interface LiquidProps {
  level: number; // 0..1
}

export function Liquid({ level }: LiquidProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentScaleY = useRef(1);

  const clampedLevel = Math.max(0, Math.min(1, level));
  const fillHeight = BODY_BOTTOM + clampedLevel * (BODY_TOP - BODY_BOTTOM);

  const geometry = useMemo(() => {
    if (clampedLevel <= 0) return null;

    const points: THREE.Vector2[] = [
      // Bottom center
      new THREE.Vector2(0, BODY_BOTTOM),
      // Bottom edge
      new THREE.Vector2(BODY_RADIUS, BODY_BOTTOM),
      // Side wall up to fill height
      new THREE.Vector2(BODY_RADIUS, fillHeight),
      // Top surface back to center
      new THREE.Vector2(0, fillHeight),
    ];

    const geom = new THREE.LatheGeometry(points, 32);
    geom.computeVertexNormals();
    return geom;
  }, [clampedLevel, fillHeight]);

  // Toon gradient for cartoon liquid look
  const gradientMap = useMemo(() => {
    const colors = new Uint8Array([80, 160, 230]);
    const texture = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Smooth scale animation
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = clampedLevel > 0 ? 1 : 0;
    currentScaleY.current = THREE.MathUtils.lerp(
      currentScaleY.current,
      target,
      1 - Math.pow(0.001, delta)
    );
    meshRef.current.scale.y = currentScaleY.current;
  });

  if (!geometry || clampedLevel <= 0) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={1}>
      <meshToonMaterial
        color={"#ffa000"}
        gradientMap={gradientMap}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
