/** Route graph: every leg ends on a real supported object, never a clearance waypoint. */
import { safePath } from "./path";
import {
  supportedPosition,
  type MotionInput,
  type Point,
  type Target,
  type Pose,
} from "./engine";
export interface TravelLeg {
  target: Target;
  path: Point[];
  webId: string | null;
  pose: Pose;
  steps: string[];
  duration: number;
  swingReleaseIndex?: number;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function edge(
  from: Point,
  target: Target,
  i: MotionInput,
  allowDetour = true,
): TravelLeg | null {
  const end = supportedPosition(target, i.mobile),
    d = distance(from, end);
  if (d > 600) return null;
  const safe = (p: Point) =>
    i.safe(p, target.elementType === "shoulder") ||
    (!!i.escapingNavbar &&
      distance(from, p) < 80 &&
      p.y > 75 &&
      p.y < i.height - 75);
  if (!i.safe(end, target.elementType === "shoulder")) return null;
  const duration = Math.max(0.65, Math.min(3.5, d / (i.mobile ? 180 : 280))),
    arc = Math.min(70, d * 0.16);
  const jump = Array.from({ length: 31 }, (_, n) => {
    const u = n / 30;
    return {
      x: from.x + (end.x - from.x) * u,
      y: from.y + (end.y - from.y) * u - 4 * arc * u * (1 - u),
    };
  });
  const clearJump = jump.every(safe),
    hang = target.roles.includes("HANG_ANCHOR");
  // Hanging targets must expose a verified web edge themselves. Travel webs are always actual objects above the route.
  const samples = Math.max(2, Math.ceil(d / 4));
  const straight = Array.from({ length: samples }, (_, n) => {
    const u = n / (samples - 1);
    return {
      x: from.x + (end.x - from.x) * u,
      y: from.y + (end.y - from.y) * u,
    };
  });
  // A crawl requires one continuous, painted edge; never crawl across a gap or glyphs.
  const startSupport = i.targets.find(
    (t) =>
      t.objectId === target.objectId &&
      t.roles.includes("PERCH_ANCHOR") &&
      distance(supportedPosition(t, i.mobile), from) < 3,
  );
  if (
    !hang &&
    startSupport &&
    target.elementType === "card" &&
    Math.abs(from.y - end.y) < 2 &&
    d <= 300 &&
    straight.every(safe)
  ) {
    return {
      target,
      path: straight,
      webId: null,
      pose: "CRAWL_EDGE",
      steps: ["CROUCH", "CRAWL", "PERCH"],
      duration: Math.max(1, d / 80),
    };
  }
  if (!hang && clearJump && d <= 250)
    return {
      target,
      path: jump,
      webId: null,
      pose: "JUMP_SHORT",
      steps: ["CROUCH", "JUMP", "LAND"],
      duration,
    };
  const corridor = straight.every(safe)
    ? [from, end]
    : allowDetour
      ? safePath(from, end, i.width, i.height, safe)
      : null;
  const anchor = hang
    ? target
    : i.targets
        .filter(
          (t) =>
            t.verified &&
            t.visibility > 0.25 &&
            t.roles.includes("WEB_ANCHOR") &&
            distance(t.attachment, from) <
              Math.min(700, Math.max(160, d * 1.8)) &&
            (!i.recentWebAnchors?.includes(t.id) || t.elementType !== "navbar"),
        )
        .filter((t) => corridor?.every((p) => p.y > t.attachment.y + 15))
        .sort(
          (a, b) =>
            (a.elementType === "navbar" ? 1000 : 0) -
            (b.elementType === "navbar" ? 1000 : 0) +
            distance(from, a) +
            distance(end, a) -
            distance(from, b) -
            distance(end, b),
        )[0];
  const webId =
    anchor?.roles.includes("WEB_ANCHOR") && anchor.verified ? anchor.id : null;
  if (hang && !webId) return null;
  if (webId && anchor && !hang && !i.mobile && !i.reduced && d > 180) {
    const origin = anchor.attachment,
      rope = distance(from, origin);
    const a0 = Math.atan2(from.x - origin.x, from.y - origin.y),
      a1 = Math.atan2(end.x - origin.x, end.y - origin.y);
    const span = Math.max(-1.1, Math.min(1.1, a1 - a0));
    const swing = Array.from({ length: 19 }, (_, n) => {
      const a = a0 + (span * n) / 18;
      return {
        x: origin.x + Math.sin(a) * rope,
        y: origin.y + Math.cos(a) * rope,
      };
    });
    const release = swing.at(-1)!,
      landingArc = Math.min(45, distance(release, end) * 0.12);
    const landing = Array.from({ length: 17 }, (_, n) => {
      const u = (n + 1) / 17;
      return {
        x: release.x + (end.x - release.x) * u,
        y: release.y + (end.y - release.y) * u - 4 * landingArc * u * (1 - u),
      };
    });
    const trajectory = [...swing, ...landing];
    if (Math.abs(span) > 0.2 && trajectory.every(safe))
      return {
        target,
        path: trajectory,
        webId,
        pose: d > 350 ? "SWING_LONG" : "SWING_SHORT",
        steps: [
          "AIM",
          "WEB_SHOOT",
          "ATTACH",
          "SWING",
          "RELEASE",
          "JUMP",
          "LAND",
        ],
        duration,
        swingReleaseIndex: 18,
      };
  }
  if (webId && corridor)
    return {
      target,
      path: corridor,
      webId,
      pose:
        anchor &&
        corridor.length === 2 &&
        end.y > from.y + 60 &&
        Math.abs(
          (from.x - anchor.x) * (end.y - anchor.y) -
            (end.x - anchor.x) * (from.y - anchor.y),
        ) /
          Math.max(1, distance(anchor, end)) <
          12
          ? "ROPE_SLIDE"
          : "WEB_PULL",
      steps: ["AIM", "WEB_SHOOT", "ATTACH", "WEB_PULL", "LAND"],
      duration,
    };
  if (!hang && clearJump)
    return {
      target,
      path: jump,
      webId: null,
      pose: d > 250 ? "JUMP_LONG" : "JUMP_SHORT",
      steps: ["CROUCH", "JUMP", "LAND"],
      duration,
    };
  return null;
}
export function planTraversal(
  from: Point,
  target: Target,
  i: MotionInput,
): TravelLeg[] | null {
  if (!target.verified || target.visibility <= 0.25) return null;
  const direct = edge(from, target, i);
  if (direct) return [direct];
  const objects = i.targets
    .filter(
      (t) =>
        t.verified &&
        t.visibility > 0.25 &&
        (!i.mobile || t.mobileEnabled) &&
        t.id !== target.id &&
        t.elementType !== "shoulder" &&
        t.roles.some((r) => r === "PERCH_ANCHOR" || r === "HANG_ANCHOR"),
    )
    .sort(
      (a, b) =>
        distance(from, supportedPosition(a, i.mobile)) +
        distance(
          supportedPosition(a, i.mobile),
          supportedPosition(target, i.mobile),
        ) -
        distance(from, supportedPosition(b, i.mobile)) -
        distance(
          supportedPosition(b, i.mobile),
          supportedPosition(target, i.mobile),
        ),
    )
    .slice(0, 20);
  const nodes: [Point, Target | null][] = [
    [from, null],
    ...objects.map(
      (t) => [supportedPosition(t, i.mobile), t] as [Point, Target],
    ),
    [supportedPosition(target, i.mobile), target],
  ];
  const end = nodes.length - 1,
    cost = new Map<number, number>([[0, 0]]),
    previous = new Map<number, { at: number; leg: TravelLeg }>(),
    open = new Set([0]);
  const cache = new Map<string, TravelLeg | null>();
  while (open.size) {
    const at = [...open].sort((a, b) => cost.get(a)! - cost.get(b)!)[0];
    open.delete(at);
    if (at === end) {
      const legs: TravelLeg[] = [];
      let n = end;
      while (n !== 0) {
        const p = previous.get(n)!;
        legs.unshift(p.leg);
        n = p.at;
      }
      return legs;
    }
    for (let n = 1; n < nodes.length; n++) {
      if (n === at || distance(nodes[at][0], nodes[n][0]) > 600) continue;
      const key = `${at}:${n}`;
      if (!cache.has(key))
        cache.set(key, edge(nodes[at][0], nodes[n][1]!, i, false));
      const leg = cache.get(key);
      if (!leg) continue;
      const next = cost.get(at)! + distance(nodes[at][0], nodes[n][0]) + 80;
      if (next < (cost.get(n) ?? Infinity)) {
        cost.set(n, next);
        previous.set(n, { at, leg });
        open.add(n);
      }
    }
  }
  return null;
}
