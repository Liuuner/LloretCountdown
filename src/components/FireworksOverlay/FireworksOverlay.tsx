import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './styles.module.css';
import {
  Projectile,
  ProjectileType,
  StartSide,
  FireworksConfig,
  DEFAULT_CONFIG,
  PROJECTILE_CONTENT,
} from './types';

interface FireworksOverlayProps {
  config?: Partial<FireworksConfig>;
  disabled?: boolean;
}

// Generate unique ID for projectiles
const generateId = (): string => `projectile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Get random number in range
const randomInRange = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// Get random projectile type
const randomProjectileType = (): ProjectileType => 
  Math.random() > 0.5 ? 'bomb' : 'rocket';

// Get random start side
const randomStartSide = (): StartSide => 
  Math.random() > 0.5 ? 'left' : 'right';

const FireworksOverlay: React.FC<FireworksOverlayProps> = ({ 
  config: configOverride,
  disabled = false 
}) => {
  const config: FireworksConfig = { ...DEFAULT_CONFIG, ...configOverride };
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [explosions, setExplosions] = useState<{ id: string; x: number; y: number }[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Spawn a new projectile
  const spawnProjectile = useCallback(() => {
    if (disabled) return;

    setProjectiles(prev => {
      // Limit concurrent projectiles
      if (prev.length >= config.maxConcurrentProjectiles) {
        return prev;
      }

      const newProjectile: Projectile = {
        id: generateId(),
        type: randomProjectileType(),
        startSide: randomStartSide(),
        startY: randomInRange(15, 70), // Keep within visible area
        isExploding: false,
      };

      return [...prev, newProjectile];
    });
  }, [config.maxConcurrentProjectiles, disabled]);

  // Handle projectile flight end -> trigger explosion
  const handleFlightEnd = useCallback((projectile: Projectile, element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    const explosionX = rect.left + rect.width / 2;
    const explosionY = rect.top + rect.height / 2;

    // Add explosion at projectile's final position
    setExplosions(prev => [...prev, { 
      id: projectile.id, 
      x: explosionX, 
      y: explosionY 
    }]);

    // Remove projectile
    setProjectiles(prev => prev.filter(p => p.id !== projectile.id));

    // Remove explosion after animation completes
    setTimeout(() => {
      setExplosions(prev => prev.filter(e => e.id !== projectile.id));
    }, config.explosionDuration + 100);
  }, [config.explosionDuration]);

  // Schedule next spawn with random interval
  const scheduleNextSpawn = useCallback(() => {
    if (disabled) return;

    const interval = randomInRange(config.minInterval, config.maxInterval);
    timeoutRef.current = setTimeout(() => {
      spawnProjectile();
      scheduleNextSpawn();
    }, interval);
  }, [config.minInterval, config.maxInterval, spawnProjectile, disabled]);

  // Start spawning on mount
  useEffect(() => {
    if (disabled) return;

    // Spawn first one after a short delay
    const initialDelay = setTimeout(() => {
      spawnProjectile();
      scheduleNextSpawn();
    }, 3000);

    return () => {
      clearTimeout(initialDelay);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scheduleNextSpawn, spawnProjectile, disabled]);

  // Generate explosion particles
  const renderExplosionParticles = (count: number = 12): React.ReactNode[] => {
    const particles: React.ReactNode[] = [];
    for (let i = 0; i < count; i++) {
      const angleRad = ((360 / count) * i * Math.PI) / 180;
      const distance = randomInRange(60, 120);
      const delay = randomInRange(0, 100);
      const endX = Math.cos(angleRad) * distance;
      const endY = Math.sin(angleRad) * distance;
      
      particles.push(
        <div
          key={`particle-${i}`}
          className={styles.explosionParticle}
          style={{
            '--end-x': `${endX}px`,
            '--end-y': `${endY}px`,
            animationDelay: `${delay}ms`,
            left: 0,
            top: 0,
          } as React.CSSProperties}
        />
      );
    }
    return particles;
  };

  // Generate sparks
  const renderSparks = (count: number = 8): React.ReactNode[] => {
    const sparks: React.ReactNode[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = randomInRange(80, 150);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const delay = randomInRange(0, 150);

      sparks.push(
        <div
          key={`spark-${i}`}
          className={styles.spark}
          style={{
            '--spark-x': x,
            '--spark-y': y,
            '--spark-delay': `${delay}ms`,
            animationDelay: `${delay}ms`,
          } as React.CSSProperties}
        />
      );
    }
    return sparks;
  };

  if (disabled) return null;

  return (
    <div className={styles.overlay}>
      {/* Render flying projectiles */}
      {projectiles.map(projectile => (
        <div
          key={projectile.id}
          className={`${styles.projectile} ${
            projectile.startSide === 'left' ? styles.fromLeft : styles.fromRight
          }`}
          style={{
            top: `${projectile.startY}%`,
            '--flight-duration': `${config.flightDuration}ms`,
          } as React.CSSProperties}
          onAnimationEnd={(e) => {
            handleFlightEnd(projectile, e.currentTarget);
          }}
        >
          <span className={`${styles.projectileIcon} ${styles[projectile.type]}`}>
            {PROJECTILE_CONTENT[projectile.type]}
          </span>
        </div>
      ))}

      {/* Render explosions */}
      {explosions.map(explosion => (
        <div
          key={explosion.id}
          className={styles.explosion}
          style={{
            left: explosion.x,
            top: explosion.y,
            '--explosion-duration': `${config.explosionDuration}ms`,
          } as React.CSSProperties}
        >
          <div className={styles.explosionCenter} />
          <div className={styles.smokeRing} />
          {renderExplosionParticles()}
          {renderSparks()}
        </div>
      ))}
    </div>
  );
};

export default FireworksOverlay;
