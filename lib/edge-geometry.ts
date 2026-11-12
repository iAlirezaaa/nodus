export interface EdgePoint { x: number; y: number; }
export interface EdgeRectangle extends EdgePoint { width: number; height: number; }
export interface EdgeGeometryOptions { route?: 'curve' | 'straight' | 'elbow'; bend?: EdgePoint | null; }
export interface EdgeGeometry {
  ax: number; ay: number; bx: number; by: number;
  d: string;
  midpoint: EdgePoint;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** World-space paths. Bounds include control points so viewport culling is conservative. */
export function connectionGeometry(source: EdgeRectangle, target: EdgeRectangle, options: EdgeGeometryOptions = {}): EdgeGeometry {
  const dx = target.x + target.width / 2 - source.x - source.width / 2;
  const dy = target.y + target.height / 2 - source.y - source.height / 2;
  const horizontal = Math.abs(dx) > Math.abs(dy) * .7;
  const direction = (horizontal ? dx : dy) >= 0 ? 1 : -1;
  const a = horizontal
    ? { x: source.x + (direction > 0 ? source.width : 0), y: source.y + source.height / 2 }
    : { x: source.x + source.width / 2, y: source.y + (direction > 0 ? source.height : 0) };
  const b = horizontal
    ? { x: target.x + (direction > 0 ? 0 : target.width), y: target.y + target.height / 2 }
    : { x: target.x + target.width / 2, y: target.y + (direction > 0 ? 0 : target.height) };
  const bend = options.bend && Number.isFinite(options.bend.x) && Number.isFinite(options.bend.y) ? options.bend : null;
  const midpoint = bend ? { ...bend } : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const points: EdgePoint[] = [a, b];
  let d = `M ${a.x} ${a.y}`;

  if (options.route === 'straight') {
    if (bend) { d += ` L ${bend.x} ${bend.y}`; points.push(bend); }
    d += ` L ${b.x} ${b.y}`;
  } else if (options.route === 'elbow') {
    const turns: EdgePoint[] = bend
      ? horizontal
        ? [
            { x: (a.x + bend.x) / 2, y: a.y }, { x: (a.x + bend.x) / 2, y: bend.y }, bend,
            { x: (bend.x + b.x) / 2, y: bend.y }, { x: (bend.x + b.x) / 2, y: b.y },
          ]
        : [
            { x: a.x, y: (a.y + bend.y) / 2 }, { x: bend.x, y: (a.y + bend.y) / 2 }, bend,
            { x: bend.x, y: (bend.y + b.y) / 2 }, { x: b.x, y: (bend.y + b.y) / 2 },
          ]
      : horizontal
        ? [{ x: midpoint.x, y: a.y }, { x: midpoint.x, y: b.y }]
        : [{ x: a.x, y: midpoint.y }, { x: b.x, y: midpoint.y }];
    points.push(...turns);
    d += [...turns, b].map(point => ` L ${point.x} ${point.y}`).join('');
  } else if (bend) {
    // Two cubics pass through the handle with a shared tangent, avoiding a kink.
    const lengthA = Math.hypot(bend.x - a.x, bend.y - a.y);
    const lengthB = Math.hypot(b.x - bend.x, b.y - bend.y);
    const span = Math.hypot(b.x - a.x, b.y - a.y);
    const tangent = span > 0 ? { x: (b.x - a.x) / span, y: (b.y - a.y) / span } : { x: horizontal ? direction : 0, y: horizontal ? 0 : direction };
    const first = horizontal ? { x: a.x + direction * lengthA * .45, y: a.y } : { x: a.x, y: a.y + direction * lengthA * .45 };
    const before = { x: bend.x - tangent.x * lengthA * .3, y: bend.y - tangent.y * lengthA * .3 };
    const after = { x: bend.x + tangent.x * lengthB * .3, y: bend.y + tangent.y * lengthB * .3 };
    const last = horizontal ? { x: b.x - direction * lengthB * .45, y: b.y } : { x: b.x, y: b.y - direction * lengthB * .45 };
    points.push(first, before, bend, after, last);
    d += ` C ${first.x} ${first.y}, ${before.x} ${before.y}, ${bend.x} ${bend.y} C ${after.x} ${after.y}, ${last.x} ${last.y}, ${b.x} ${b.y}`;
  } else {
    const offset = Math.max(horizontal ? 70 : 60, Math.abs(horizontal ? b.x - a.x : b.y - a.y) * .5) * direction;
    const first = horizontal ? { x: a.x + offset, y: a.y } : { x: a.x, y: a.y + offset };
    const last = horizontal ? { x: b.x - offset, y: b.y } : { x: b.x, y: b.y - offset };
    points.push(first, last);
    d += ` C ${first.x} ${first.y}, ${last.x} ${last.y}, ${b.x} ${b.y}`;
  }

  return {
    ax: a.x, ay: a.y, bx: b.x, by: b.y, d, midpoint,
    bounds: {
      minX: Math.min(...points.map(point => point.x)), minY: Math.min(...points.map(point => point.y)),
      maxX: Math.max(...points.map(point => point.x)), maxY: Math.max(...points.map(point => point.y)),
    },
  };
}
