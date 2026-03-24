export type ProjectileType = 'bomb' | 'rocket';
export type StartSide = 'left' | 'right';

export interface Projectile {
  id: string;
  type: ProjectileType;
  startSide: StartSide;
  startY: number; // percentage from top (0-100)
  isExploding: boolean;
}

export interface ExplosionParticle {
  id: string;
  angle: number;
  distance: number;
  delay: number;
}

// Configuration for easy customization
export interface FireworksConfig {
  minInterval: number; // minimum ms between spawns
  maxInterval: number; // maximum ms between spawns
  flightDuration: number; // ms for projectile to cross screen
  explosionDuration: number; // ms for explosion animation
  maxConcurrentProjectiles: number;
}

export const DEFAULT_CONFIG: FireworksConfig = {
  minInterval: 15000,
  maxInterval: 20000,
  flightDuration: 3000,
  explosionDuration: 800,
  maxConcurrentProjectiles: 3,
};

// Projectile content - easy to replace with SVG components later
export const PROJECTILE_CONTENT: Record<ProjectileType, string> = {
  bomb: '💣',
  rocket: '🚀',
};
