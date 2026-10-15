import { supportedPosition, type MotionInput, type Point, type Target } from "./engine";
import type { TravelLeg } from "./planner";

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function eligibleWebClick(event: MouseEvent, mobile: boolean, reduced: boolean) {
  if (mobile || reduced || event.button !== 0 || event.detail === 0) return false;
  if (document.getSelection()?.toString() || document.querySelector(".assistant-panel") || document.documentElement.classList.contains("spidey-hiding")) return false;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("main")) return false;
  if (target.closest('a,button,input,textarea,select,label,summary,[role="button"],[contenteditable],.navigation,.companion-controls,.assistant-panel,dialog,.spider-react,[data-spidey-exclusion]')) return false;
  if (target.closest("p,h1,h2,h3,h4,li,span,strong,em,small,svg,img,.tags,.portrait-shell,.architecture-map,.skill-node,.timeline-node")) return false;
  return event.clientX > 45 && event.clientX < innerWidth - 45 && event.clientY > 125 && event.clientY < innerHeight - 75;
}

/** The impact is an overhead fixed point. Only supported existing anchors can end the route. */
export function planClickSwing(from: Point, anchor: Target, input: MotionInput): TravelLeg | null {
  if (!anchor.verified || anchor.visibility <= 0.25 || anchor.attachment.y > from.y - 35) return null;
  const length = distance(from, anchor.attachment);
  if (length < 90 || length > 520) return null;
  const candidates = input.targets
    .filter(t => t.id !== anchor.id && t.verified && t.visibility > 0.25 && t.roles.includes("PERCH_ANCHOR") && (!input.mobile || t.mobileEnabled))
    .filter(t => distance(from, supportedPosition(t, input.mobile)) > 80)
    .sort((a, b) => distance(a, anchor) - distance(b, anchor));
  const initial = Math.atan2(from.x - anchor.x, from.y - anchor.y);
  for (const target of candidates) {
    const end = supportedPosition(target, input.mobile);
    if (!input.safe(end, target.elementType === "shoulder")) continue;
    const direction = Math.sign(anchor.x - from.x) || Math.sign(end.x - from.x) || 1;
    const final = clamp(initial + direction * 0.95, -1.15, 1.15);
    if (Math.abs(final - initial) < 0.32) continue;
    const swing = Array.from({ length: 25 }, (_, index) => {
      const u = index / 24;
      const angle = initial + (final - initial) * (u * u * (3 - 2 * u));
      return { x: anchor.x + Math.sin(angle) * length, y: anchor.y + Math.cos(angle) * length };
    });
    if (!swing.slice(3).every(p => input.safe(p))) continue;
    const release = swing.at(-1)!;
    const lift = Math.min(55, distance(release, end) * 0.13);
    const landing = Array.from({ length: 21 }, (_, index) => {
      const u = (index + 1) / 21;
      return { x: release.x + (end.x - release.x) * u, y: release.y + (end.y - release.y) * u - 4 * lift * u * (1 - u) };
    });
    if (!landing.every(p => input.safe(p, target.elementType === "shoulder"))) continue;
    return {
      target, path: [...swing, ...landing], webId: anchor.id,
      pose: "SWING_SHORT", steps: ["AIM", "WEB_SHOOT", "ATTACH", "SWING", "RELEASE", "LAND"],
      duration: 2.2, swingReleaseIndex: swing.length - 1,
    };
  }
  return null;
}
