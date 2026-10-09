import type { Point } from "./engine";
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** Small visibility graph built only when a traversal meets protected content. */
export function safePath(
  from: Point,
  to: Point,
  width: number,
  height: number,
  safe: (p: Point) => boolean,
): Point[] | null {
  const clear = (a: Point, b: Point) => {
    const steps = Math.ceil(dist(a, b) / 4);
    for (let i = 1; i <= steps; i++) {
      const p = {
        x: a.x + ((b.x - a.x) * i) / steps,
        y: a.y + ((b.y - a.y) * i) / steps,
      };
      if (!safe(p)) return false;
      // Extra clearance at intermediate samples prevents diagonal corner cuts.
      if (
        i < steps &&
        [
          { x: p.x - 3, y: p.y },
          { x: p.x + 3, y: p.y },
          { x: p.x, y: p.y - 3 },
          { x: p.x, y: p.y + 3 },
        ].some((q) => !safe(q))
      )
        return false;
    }
    return true;
  };
  if (clear(from, to)) return [from, to];
  const points: Point[] = [from, to],
    step = Math.max(80, Math.sqrt((width * height) / 240));
  for (let x = 43; x < width - 35; x += step)
    for (let y = 165; y < height - 80; y += step)
      if (safe({ x, y })) points.push({ x, y });
  // Include the right border even when it does not coincide with the grid.
  for (let y = 165; y < height - 80; y += step)
    if (safe({ x: width - 43, y })) points.push({ x: width - 43, y });
  const cost = new Map<number, number>([[0, 0]]),
    previous = new Map<number, number>(),
    open = new Set([0]);
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const score = cost.get(id)! + dist(points[id], to);
      if (score < best) {
        best = score;
        current = id;
      }
    }
    if (current === 1) {
      const path = [to];
      while (current !== 0) {
        current = previous.get(current)!;
        path.unshift(points[current]);
      }
      // Remove redundant grid corners only when the complete shortcut is safe.
      const result = [path[0]];
      let at = 0;
      while (at < path.length - 1) {
        let next = path.length - 1;
        while (next > at + 1 && !clear(path[at], path[next])) next--;
        result.push(path[next]);
        at = next;
      }
      return result;
    }
    open.delete(current);
    for (let id = 1; id < points.length; id++) {
      const d = dist(points[current], points[id]);
      if (
        id === current ||
        d > (id === 1 || current === 0 ? step * 2.4 : step * 1.45) ||
        !clear(points[current], points[id])
      )
        continue;
      const candidate = cost.get(current)! + d;
      if (candidate < (cost.get(id) ?? Infinity)) {
        cost.set(id, candidate);
        previous.set(id, current);
        open.add(id);
      }
    }
  }
  return null;
}
