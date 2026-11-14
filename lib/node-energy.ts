import { defaultNodeGrowth, type NodeGrowth } from './node-growth';

/** Presentation values only; the renderer applies the user's reduced-motion preference. */
export interface NodeEnergy {
  /** Saturating activity intensity, from 0 for an isolated note to 1 for a dense hub. */
  strength: number;
  /** Seconds per breathing pulse. */
  pulseDuration: number;
  /** Seconds per orbit. */
  orbitDuration: number;
  /** Glow opacity, always visible but below full opacity. */
  glow: number;
  /** Seconds for a light signal to travel along a connection. */
  signalDuration: number;
}

/**
 * Size and activity share topology-derived mass, so incoming links, outgoing links,
 * task relationships and nested work all make a note feel more alive. The curve
 * makes early connections noticeable without turning large hubs into flashing lights.
 */
export function nodeEnergy(growth: Pick<NodeGrowth, 'mass'> = defaultNodeGrowth): NodeEnergy {
  const mass = Number.isNaN(growth.mass) ? 0 : Math.max(0, growth.mass);
  const strength = 1 - Math.exp(-Math.sqrt(mass) / 3.5);
  return {
    strength,
    pulseDuration: 5.6 - 3 * strength,
    orbitDuration: 16 - 9 * strength,
    glow: 0.24 + 0.52 * strength,
    signalDuration: 6.2 - 3.4 * strength,
  };
}
