import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Particle-based pour stream that appears when the bottle is tilting and pouring.
 *
 * Operates in **world space** (placed outside the rotating bottle group) so that
 * particles fall straight down after being emitted from the bottle mouth,
 * regardless of how the bottle is rotated.
 */

const PARTICLE_COUNT = 150;
const SPAWN_RATE = 50; // particles per second
const PARTICLE_LIFETIME = 1.5; // seconds
const GRAVITY = -8;

/** Y-offset of the bottle group from world origin */
const GROUP_Y = -1.5;
/** Height of the bottle mouth in the bottle's local space */
const MOUTH_Y = 2.95;

interface PourStreamProps {
  active: boolean;
  /** Current tilt angle in radians (0 = upright, ~1.74 = fully tilted) */
  tiltAngle: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  alive: boolean;
}

/**
 * Compute the world-space position of the bottle mouth given the tilt angle.
 * The bottle group is at (0, GROUP_Y, 0) and rotates around its local origin
 * (the bottle base) via rotation.z = -tiltAngle.
 */
function getMouthWorldPos(tiltAngle: number): [number, number] {
  const x = MOUTH_Y * Math.sin(tiltAngle);
  const y = GROUP_Y + MOUTH_Y * Math.cos(tiltAngle);
  return [x, y];
}

/**
 * Update particle simulation and write results into the position/size buffers.
 * Extracted as a plain function so the React Compiler does not flag typed-array
 * mutations as violations (the buffers are GPU data, not React state).
 */
function updateParticles(
  particles: Particle[],
  posAttr: THREE.BufferAttribute,
  sizeAttr: THREE.BufferAttribute,
  delta: number,
  active: boolean,
  tiltAngle: number,
  spawnTimer: { value: number }
) {
  const [mouthX, mouthY] = getMouthWorldPos(tiltAngle);

  // Spawn new particles when active and bottle is tilted enough
  if (active && tiltAngle > 0.15) {
    spawnTimer.value += delta;
    const spawnInterval = 1 / SPAWN_RATE;

    while (spawnTimer.value >= spawnInterval) {
      spawnTimer.value -= spawnInterval;

      const p = particles.find((p) => !p.alive);
      if (p) {
        p.alive = true;
        p.life = 0;
        p.maxLife = PARTICLE_LIFETIME * (0.7 + Math.random() * 0.6);

        // Spawn at the mouth position with slight random spread
        p.position.set(
          mouthX + (Math.random() - 0.5) * 0.06,
          mouthY + (Math.random() - 0.5) * 0.06,
          (Math.random() - 0.5) * 0.06
        );

        // Velocity: pour outward in the direction the bottle is tilting,
        // plus a slight downward component. The horizontal speed scales
        // with how far the bottle is tilted.
        const pourSpeed = 0.8 + Math.random() * 0.4;
        const horizontalFactor = Math.min(tiltAngle / 1.2, 1);
        p.velocity.set(
          pourSpeed * horizontalFactor + (Math.random() - 0.5) * 0.15,
          pourSpeed * 0.3 * (1 - horizontalFactor) +
            (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.15
        );
      }
    }
  } else {
    spawnTimer.value = 0;
  }

  // Update all particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = particles[i];

    if (p.alive) {
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.alive = false;
        posAttr.setXYZ(i, 0, -100, 0);
        sizeAttr.setX(i, 0);
        continue;
      }

      // Apply gravity
      p.velocity.y += GRAVITY * delta;

      // Update position
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;

      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);

      // Size: starts full, shrinks slightly toward end of life
      const lifeFrac = p.life / p.maxLife;
      sizeAttr.setX(i, (1 - lifeFrac * 0.4) * 0.15);
    } else {
      posAttr.setXYZ(i, 0, -100, 0);
      sizeAttr.setX(i, 0);
    }
  }

  posAttr.needsUpdate = true;
  sizeAttr.needsUpdate = true;
}

export function PourStream({ active, tiltAngle }: PourStreamProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const spawnTimerRef = useRef({ value: 0 });
  const posAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const sizeAttrRef = useRef<THREE.BufferAttribute | null>(null);

  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: PARTICLE_LIFETIME,
      alive: false,
    }))
  );

  // Create buffer attributes once imperatively
  useEffect(() => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Initialize all particles offscreen
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    const posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const sizeAttr = new THREE.BufferAttribute(sizes, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);

    geom.setAttribute("position", posAttr);
    geom.setAttribute("size", sizeAttr);

    posAttrRef.current = posAttr;
    sizeAttrRef.current = sizeAttr;
  }, []);

  // Solid circle sprite for cartoon-style particles
  const particleTexture = useMemo(() => {
    const res = 64;
    const canvas = document.createElement("canvas");
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext("2d")!;

    const gradient = ctx.createRadialGradient(
      res / 2,
      res / 2,
      0,
      res / 2,
      res / 2,
      res / 2
    );
    gradient.addColorStop(0, "rgba(245, 180, 40, 1)");
    gradient.addColorStop(0.5, "rgba(240, 165, 30, 1)");
    gradient.addColorStop(0.8, "rgba(230, 150, 20, 0.8)");
    gradient.addColorStop(1, "rgba(220, 130, 10, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, res, res);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame((_, delta) => {
    if (!posAttrRef.current || !sizeAttrRef.current) return;

    updateParticles(
      particles.current,
      posAttrRef.current,
      sizeAttrRef.current,
      delta,
      active,
      tiltAngle,
      spawnTimerRef.current
    );
  });

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={3}>
      <bufferGeometry />
      <pointsMaterial
        color="#f5a623"
        size={0.15}
        sizeAttenuation
        transparent
        opacity={1}
        map={particleTexture}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
