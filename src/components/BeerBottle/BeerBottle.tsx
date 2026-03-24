import { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Bottle } from "./Bottle";
import { Liquid } from "./Liquid";
import { PourStream } from "./PourStream";

// -- Configuration --
/** Seconds to fully drain the bottle */
const POUR_DURATION = 6;
/** Rate per second (level goes from 1 → 0) */
const POUR_RATE = 1 / POUR_DURATION;
/** Max tilt angle in radians (~100 degrees) */
const MAX_TILT = (100 * Math.PI) / 180;
/** Lerp speed for tilting (higher = snappier) */
const TILT_SPEED = 4;

// ─── Inner scene component (runs inside Canvas) ─────────────────────

interface SceneProps {
  onEmpty: () => void;
}

function Scene({ onEmpty }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isPouringRef = useRef(false);
  const beerLevel = useRef(1);
  const currentTilt = useRef(0);
  const emptyCalled = useRef(false);

  // React state for values that drive child component re-renders
  const [displayLevel, setDisplayLevel] = useState(1);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [pouring, setPouring] = useState(false);

  // ── Global pointer-up listener ──
  // Ensures pouring stops even when the pointer is released outside the
  // bottle mesh or outside the canvas entirely.
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isPouringRef.current = false;
      setPouring(false);
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // ── Pour logic ──
    if (isPouringRef.current && beerLevel.current > 0) {
      beerLevel.current = Math.max(0, beerLevel.current - POUR_RATE * delta);

      // Update display level in quantized steps for fewer re-renders
      // (~2% steps, or snap to 0 when empty)
      const quantized = Math.round(beerLevel.current * 50) / 50;
      if (
        Math.abs(quantized - displayLevel) > 0.01 ||
        beerLevel.current <= 0
      ) {
        setDisplayLevel(beerLevel.current <= 0 ? 0 : quantized);
      }

      // Fire callback once when empty
      if (beerLevel.current <= 0 && !emptyCalled.current) {
        emptyCalled.current = true;
        // Stop pouring since bottle is empty
        isPouringRef.current = false;
        setPouring(false);
        onEmpty();
      }
    }

    // ── Tilt animation ──
    const targetTilt =
      isPouringRef.current && beerLevel.current > 0 ? MAX_TILT : 0;
    currentTilt.current = THREE.MathUtils.lerp(
      currentTilt.current,
      targetTilt,
      1 - Math.exp(-TILT_SPEED * delta)
    );

    // Snap to target when very close (avoid endless micro-lerp)
    if (Math.abs(currentTilt.current - targetTilt) < 0.001) {
      currentTilt.current = targetTilt;
    }

    groupRef.current.rotation.z = -currentTilt.current;

    // Update tilt angle state for PourStream (quantize to reduce re-renders)
    const newTiltAngle =
      Math.round(currentTilt.current * 20) / 20;
    if (Math.abs(newTiltAngle - tiltAngle) > 0.04) {
      setTiltAngle(newTiltAngle);
    }
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (beerLevel.current > 0) {
      isPouringRef.current = true;
      setPouring(true);
    }
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      <directionalLight
        position={[-2, 3, -2]}
        intensity={0.3}
        color="#ffeedd"
      />

      {/* Bottle group — rotates around its base when pouring */}
      <group
        ref={groupRef}
        position={[0, -1.5, 0]}
        onPointerDown={handlePointerDown}
      >
        <Bottle />
        <Liquid level={displayLevel} />
      </group>

      {/* Pour stream in world space (outside the rotating group) */}
      <PourStream active={pouring} tiltAngle={tiltAngle} />
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────

export interface BeerBottleProps {
  /** Called once when the bottle has been fully emptied */
  onEmpty: () => void;
  /** Optional inline style for the container div */
  style?: React.CSSProperties;
  /** Optional className for the container div */
  className?: string;
}

export function BeerBottle({ onEmpty, style, className }: BeerBottleProps) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        cursor: "pointer",
        touchAction: "none",
        ...style,
      }}
    >
      <Canvas
        camera={{ position: [0, 1, 10], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <Scene onEmpty={onEmpty} />
      </Canvas>
    </div>
  );
}
