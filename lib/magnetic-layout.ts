/** Personal, bounded force layout. All coordinates are node centers in world units. */
export interface MagneticSettings {
  enabled: boolean;
  attraction: number;
  repulsion: number;
  center: number;
  distance: number;
}
export const DEFAULT_MAGNETIC_SETTINGS: Readonly<MagneticSettings> = Object.freeze({
  enabled: false, attraction: .45, repulsion: .55, center: .12, distance: 180,
});
export function normalizeMagneticSettings(value: unknown): MagneticSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const number = (key: 'attraction' | 'repulsion' | 'center' | 'distance', min: number, max: number) => {
    const input = source[key];
    return typeof input === 'number' && Number.isFinite(input) ? clamp(input, min, max) : DEFAULT_MAGNETIC_SETTINGS[key];
  };
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_MAGNETIC_SETTINGS.enabled,
    attraction: number('attraction', 0, 1), repulsion: number('repulsion', 0, 1),
    center: number('center', 0, 1), distance: number('distance', 60, 420),
  };
}

export interface MagneticPoint { id: string; x: number; y: number; radius: number; mass?: number; }
export interface MagneticLink { sourceId: string; targetId: string; }
export interface MagneticBody { id: string; x: number; y: number; vx: number; vy: number; radius: number; mass: number; }
interface Body extends MagneticBody { index: number; charge: number; }
interface Spring { source: number; target: number; }
interface Quad {
  x: number; y: number; size: number; mass: number; cx: number; cy: number; radius: number;
  items: Body[] | null; children: Quad[] | null;
}
interface Point { x: number; y: number; }
export interface MagneticDiagnostics {
  treeCells: number;
  forceVisits: number;
  collisionVisits: number;
  collisionPairs: number;
  maxOverlap: number;
}
export interface MagneticSimulation {
  /** Mutable view positions; never contains the caller's input objects. */
  bodies: Map<string, MagneticBody>;
  settings: MagneticSettings;
  active: boolean;
  iteration: number;
  elapsedMs: number;
  energy: number;
  diagnostics: MagneticDiagnostics;
  /** Fixed center of this simulation burst, not the viewport/camera center. */
  center: Point;
  /** Internal reusable data. Consumers should use bodies and the functions below. */
  _nodes: Body[];
  _links: Spring[];
  _fx: Float64Array;
  _fy: Float64Array;
  _quiet: number;
  _pins: Set<string>;
}

const FRAME_MS = 1000 / 60;
const MAX_BURST_MS = 8000;
const MAX_SPEED = 22;
const MAX_COORDINATE = 1e7;
const COLLISION_GAP = 12;
const FORCE_VISIT_LIMIT = 64;
const COLLISION_VISIT_LIMIT = 112;
const COLLISION_PAIR_LIMIT = 32;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const coordinate = (value: number) => clamp(finite(value), -MAX_COORDINATE, MAX_COORDINATE);
const diagnostics = (): MagneticDiagnostics => ({ treeCells: 0, forceVisits: 0, collisionVisits: 0, collisionPairs: 0, maxOverlap: 0 });
const hash = (value: string) => { let result = 2166136261; for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619); return result >>> 0; };
function direction(id: string): Point { const angle = hash(id) / 4294967296 * Math.PI * 2; return { x: Math.cos(angle), y: Math.sin(angle) }; }

export function createMagneticSimulation(points: readonly MagneticPoint[], links: readonly MagneticLink[], settings: MagneticSettings = { ...DEFAULT_MAGNETIC_SETTINGS }): MagneticSimulation {
  const nodes: Body[] = [], bodies = new Map<string, MagneticBody>();
  // Stable order also makes force approximation independent of document array order.
  for (const point of [...points].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (!point.id || bodies.has(point.id)) continue;
    const mass = clamp(finite(point.mass ?? 1, 1), .25, 12);
    const body: Body = { id: point.id, x: coordinate(point.x), y: coordinate(point.y), radius: clamp(finite(point.radius, 12), 1, 1000), mass,
      vx: 0, vy: 0, index: nodes.length, charge: Math.sqrt(mass) };
    nodes.push(body); bodies.set(body.id, body);
  }
  const indices = new Map(nodes.map(body => [body.id, body.index])), known = new Set<string>(), springs: Spring[] = [];
  for (const link of links) {
    const a = indices.get(link.sourceId), b = indices.get(link.targetId);
    if (a === undefined || b === undefined || a === b) continue;
    const source = Math.min(a, b), target = Math.max(a, b), key = `${source}:${target}`;
    if (known.has(key)) continue;
    known.add(key); springs.push({ source, target });
  }
  springs.sort((a, b) => a.source - b.source || a.target - b.target);
  const normalized = normalizeMagneticSettings(settings);
  const center = nodes.length ? { x: nodes.reduce((sum, body) => sum + body.x / nodes.length, 0), y: nodes.reduce((sum, body) => sum + body.y / nodes.length, 0) } : { x: 0, y: 0 };
  return { bodies, settings: normalized, active: normalized.enabled && nodes.length > 1, iteration: 0, elapsedMs: 0, energy: 0, center,
    diagnostics: diagnostics(), _nodes: nodes, _links: springs, _fx: new Float64Array(nodes.length), _fy: new Float64Array(nodes.length), _quiet: 0, _pins: new Set() };
}

export function reheatMagneticSimulation(simulation: MagneticSimulation): void {
  simulation.active = simulation.settings.enabled && simulation._nodes.length > 1;
  simulation.iteration = 0; simulation.elapsedMs = 0; simulation._quiet = 0;
}
export function updateMagneticSettings(simulation: MagneticSimulation, value: MagneticSettings): void {
  const next = normalizeMagneticSettings(value), previous = simulation.settings;
  if (next.enabled === previous.enabled && next.attraction === previous.attraction && next.repulsion === previous.repulsion && next.center === previous.center && next.distance === previous.distance) return;
  simulation.settings = next;
  if (next.enabled) reheatMagneticSimulation(simulation);
  else stop(simulation);
}
function stop(simulation: MagneticSimulation) {
  simulation.active = false; simulation.energy = 0;
  for (const body of simulation._nodes) { body.vx = 0; body.vy = 0; }
}

/** An adaptive tree caps recursion for coincident points; degenerate leaves stay aggregate. */
function buildTree(nodes: Body[], stats: MagneticDiagnostics): Quad | null {
  if (!nodes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) { minX = Math.min(minX, node.x); maxX = Math.max(maxX, node.x); minY = Math.min(minY, node.y); maxY = Math.max(maxY, node.y); }
  const make = (items: Body[], x: number, y: number, size: number, depth: number): Quad => {
    let mass = 0, cx = 0, cy = 0, radius = 0;
    for (const body of items) { mass += body.charge; cx += body.x * body.charge; cy += body.y * body.charge; radius = Math.max(radius, body.radius); }
    const quad: Quad = { x, y, size, mass, cx: cx / mass, cy: cy / mass, radius, items, children: null };
    stats.treeCells++;
    if (items.length <= 4 || depth >= 20 || size <= .01) return quad;
    const half = size / 2, groups: Body[][] = [[], [], [], []];
    for (const body of items) groups[(body.x >= x + half ? 1 : 0) + (body.y >= y + half ? 2 : 0)].push(body);
    // Fully coincident points never become a pathological linked-list tree.
    if (groups.some(group => group.length === items.length) && items.every(body => body.x === items[0].x && body.y === items[0].y)) return quad;
    quad.items = null; quad.children = [];
    for (let i = 0; i < 4; i++) if (groups[i].length) quad.children.push(make(groups[i], x + (i % 2) * half, y + (i >= 2 ? half : 0), half, depth + 1));
    return quad;
  };
  return make(nodes, minX - .01, minY - .01, Math.max(1, maxX - minX, maxY - minY) + .02, 0);
}

function repel(simulation: MagneticSimulation, tree: Quad, alpha: number) {
  const strength = 9200 * simulation.settings.repulsion * alpha;
  if (!strength) return;
  const stack: Quad[] = [];
  for (const body of simulation._nodes) {
    let visits = 0; stack.push(tree);
    while (stack.length) {
      const quad = stack.pop()!; visits++;
      const contains = body.x >= quad.x && body.x < quad.x + quad.size && body.y >= quad.y && body.y < quad.y + quad.size;
      const dx = body.x - quad.cx, dy = body.y - quad.cy, d2 = dx * dx + dy * dy;
      const far = !contains && (quad.size * quad.size < d2 * 1.21 || visits >= FORCE_VISIT_LIMIT);
      if (quad.children && !far) { for (const child of quad.children) stack.push(child); continue; }
      if (quad.items && quad.items.length <= 4) {
        for (const other of quad.items) {
          if (other === body) continue;
          let x = body.x - other.x, y = body.y - other.y, distance = Math.sqrt(x * x + y * y);
          if (distance < .001) { const axis = direction(body.index < other.index ? `${body.id}:${other.id}` : `${other.id}:${body.id}`), sign = body.index < other.index ? 1 : -1; x = axis.x * sign; y = axis.y * sign; distance = 1; }
          const softened = Math.max(distance * distance, 64, (body.radius + other.radius) ** 2 * .16);
          const force = strength * other.charge / softened;
          simulation._fx[body.index] += x / distance * force; simulation._fy[body.index] += y / distance * force;
        }
      } else {
        const mass = quad.mass - (contains ? body.charge : 0);
        if (mass <= 0) continue;
        const cx = contains ? (quad.cx * quad.mass - body.x * body.charge) / mass : quad.cx;
        const cy = contains ? (quad.cy * quad.mass - body.y * body.charge) / mass : quad.cy;
        let x = body.x - cx, y = body.y - cy, distance = Math.sqrt(x * x + y * y);
        if (distance < .001) { const axis = direction(body.id); x = axis.x; y = axis.y; distance = 1; }
        const softened = Math.max(distance * distance, 64, (body.radius + quad.radius) ** 2 * .16);
        const force = strength * mass / softened;
        simulation._fx[body.index] += x / distance * force; simulation._fy[body.index] += y / distance * force;
      }
    }
    simulation.diagnostics.forceVisits += visits;
  }
}

function collide(simulation: MagneticSimulation, tree: Quad) {
  const stack: Quad[] = [], stats = simulation.diagnostics;
  for (const body of simulation._nodes) {
    let visits = 0, pairs = 0; stack.push(tree);
    while (stack.length && visits < COLLISION_VISIT_LIMIT && pairs < COLLISION_PAIR_LIMIT) {
      const quad = stack.pop()!; visits++;
      const reach = body.radius + quad.radius + COLLISION_GAP;
      if (body.x + reach < quad.x || body.x - reach > quad.x + quad.size || body.y + reach < quad.y || body.y - reach > quad.y + quad.size) continue;
      if (quad.children) { for (const child of quad.children) stack.push(child); continue; }
      const items = quad.items!;
      // Rotate a bounded sample for pathological coincident buckets; never all pairs.
      const sample = Math.min(items.length, COLLISION_PAIR_LIMIT - pairs), start = items.length > sample ? (body.index * 13 + simulation.iteration * 17) % items.length : 0;
      for (let offset = 0; offset < sample && pairs < COLLISION_PAIR_LIMIT; offset++) {
        const other = items[(start + offset) % items.length];
        if (other.index <= body.index) continue;
        pairs++;
        let x = other.x - body.x, y = other.y - body.y;
        const minimum = body.radius + other.radius + COLLISION_GAP, squared = x * x + y * y;
        if (squared >= minimum * minimum) continue;
        let distance = Math.sqrt(squared);
        const overlap = minimum - distance;
        stats.maxOverlap = Math.max(stats.maxOverlap, overlap); stats.collisionPairs++;
        if (distance < .001) { const axis = direction(`${body.id}:${other.id}`); x = axis.x; y = axis.y; distance = 1; }
        const force = Math.min(36, overlap * .36), fx = x / distance * force, fy = y / distance * force;
        simulation._fx[body.index] -= fx; simulation._fy[body.index] -= fy;
        simulation._fx[other.index] += fx; simulation._fy[other.index] += fy;
      }
    }
    stats.collisionVisits += visits; stack.length = 0;
  }
}

/** Return true while another animation frame is useful. No DOM, timers, random, or IO. */
export function stepMagneticSimulation(simulation: MagneticSimulation, deltaMs: number, pins: ReadonlyMap<string, Point> = new Map()): boolean {
  let pinsChanged = false;
  const nextPins = new Set<string>();
  for (const [id, pin] of pins) {
    const body = simulation.bodies.get(id); if (!body || !Number.isFinite(pin.x) || !Number.isFinite(pin.y)) continue;
    const x = coordinate(pin.x), y = coordinate(pin.y); nextPins.add(id);
    if (body.x !== x || body.y !== y || !simulation._pins.has(id)) pinsChanged = true;
    body.x = x; body.y = y; body.vx = 0; body.vy = 0;
  }
  for (const id of simulation._pins) if (!nextPins.has(id)) pinsChanged = true;
  simulation._pins = nextPins;
  if (pinsChanged) reheatMagneticSimulation(simulation);
  if (!simulation.settings.enabled || !simulation.active || !simulation._nodes.length) return false;
  if (Number.isFinite(deltaMs) && deltaMs <= 0) return simulation.active;
  const duration = clamp(finite(deltaMs, FRAME_MS), 1, 50), steps = Math.ceil(duration / FRAME_MS), unit = duration / steps / FRAME_MS;
  simulation.diagnostics = diagnostics();
  for (let step = 0; step < steps; step++) {
    simulation._fx.fill(0); simulation._fy.fill(0);
    // Position sanitization also protects against a stale consumer-held body being moved.
    for (const body of simulation._nodes) { body.x = coordinate(body.x); body.y = coordinate(body.y); body.vx = finite(body.vx); body.vy = finite(body.vy); }
    const alpha = Math.max(.018, Math.exp(-simulation.elapsedMs / 1550));
    const tree = buildTree(simulation._nodes, simulation.diagnostics)!;
    repel(simulation, tree, alpha);
    const linkStrength = simulation.settings.attraction * .027 * alpha;
    if (linkStrength) for (const spring of simulation._links) {
      const source = simulation._nodes[spring.source], target = simulation._nodes[spring.target];
      let dx = target.x - source.x, dy = target.y - source.y, distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < .001) { const axis = direction(`${source.id}:${target.id}`); dx = axis.x; dy = axis.y; distance = 1; }
      const rest = simulation.settings.distance + source.radius + target.radius;
      const force = clamp((distance - rest) * linkStrength, -20, 20), fx = dx / distance * force, fy = dy / distance * force;
      simulation._fx[source.index] += fx; simulation._fy[source.index] += fy;
      simulation._fx[target.index] -= fx; simulation._fy[target.index] -= fy;
    }
    collide(simulation, tree);
    const gravity = simulation.settings.center * .0019 * alpha, drag = Math.pow(.76, unit);
    let totalEnergy = 0, maxSpeed = 0, movable = 0;
    for (const body of simulation._nodes) {
      if (nextPins.has(body.id)) { body.vx = 0; body.vy = 0; continue; }
      let ax = simulation._fx[body.index] / body.mass + (simulation.center.x - body.x) * gravity;
      let ay = simulation._fy[body.index] / body.mass + (simulation.center.y - body.y) * gravity;
      const squaredAcceleration = ax * ax + ay * ay;
      if (squaredAcceleration > 6400) { const scale = 80 / Math.sqrt(squaredAcceleration); ax *= scale; ay *= scale; }
      body.vx = (body.vx + ax * unit) * drag; body.vy = (body.vy + ay * unit) * drag;
      const squaredSpeed = body.vx * body.vx + body.vy * body.vy;
      if (squaredSpeed > MAX_SPEED * MAX_SPEED) { const scale = MAX_SPEED / Math.sqrt(squaredSpeed); body.vx *= scale; body.vy *= scale; }
      body.x = coordinate(body.x + body.vx * unit); body.y = coordinate(body.y + body.vy * unit);
      const energy = body.vx * body.vx + body.vy * body.vy;
      totalEnergy += energy; maxSpeed = Math.max(maxSpeed, energy); movable++;
    }
    simulation.energy = movable ? totalEnergy / movable : 0;
    simulation.elapsedMs += duration / steps; simulation.iteration++;
    const quiet = simulation.energy < .0025 && maxSpeed < .018 && simulation.diagnostics.maxOverlap < .75;
    simulation._quiet = quiet ? simulation._quiet + unit : 0;
    if (!movable || simulation._quiet >= 15 || simulation.elapsedMs >= MAX_BURST_MS) { stop(simulation); break; }
  }
  return simulation.active;
}
