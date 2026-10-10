/** Supported motion only. The engine is the single authority for visible position. */
import { safePath } from "./path";
import { planTraversal, type TravelLeg } from "./planner";
export type Pose =
  | "SWING_SHORT"
  | "SWING_LONG"
  | "WEB_PULL"
  | "ROPE_SLIDE"
  | "WEB_RAPPEL"
  | "JUMP_SHORT"
  | "JUMP_LONG"
  | "FLIP_SIDE"
  | "FLIP_FORWARD"
  | "FLIP_BACKWARD"
  | "ROLL_LANDING"
  | "CRAWL_EDGE"
  | "HANG_IDLE"
  | "CROUCH_IDLE"
  | "PERCH"
  | "SHOULDER_PERCH";
export type State =
  | "INTRO_WAVING"
  | "NAVBAR_WEB_ATTACHING"
  | "SCROLL_RAPPELLING"
  | "SCROLL_SETTLING"
  | "NAVBAR_DETACH"
  | "SCROLL_STOP_EXIT"
  | "ENTERING"
  | "IDLE"
  | "PERCHED"
  | "CROUCHING"
  | "HANGING"
  | "SWINGING"
  | "WEB_PULL"
  | "ROPE_SLIDING"
  | "RAPPELLING"
  | "JUMPING"
  | "FLIPPING"
  | "ROLLING"
  | "LANDING"
  | "CRAWLING"
  | "PAUSED_FOR_CURSOR"
  | "SHOULDER_PERCH"
  | "AI_LISTENING"
  | "AI_THINKING"
  | "AI_RESPONSE"
  | "NAVIGATING"
  | "HIDDEN";
export type AnchorRole =
  | "REST_ANCHOR"
  | "WEB_ANCHOR"
  | "TRAVEL_ANCHOR"
  | "PERCH_ANCHOR"
  | "HANG_ANCHOR"
  | "INTERACTION_ANCHOR";
export interface Point {
  x: number;
  y: number;
}
export interface Target extends Point {
  id: string;
  objectId: string;
  section: string;
  elementType: string;
  roles: AnchorRole[];
  attachment: Point;
  verified: boolean;
  poses: Pose[];
  priority: number;
  visibility: number;
  mobileEnabled: boolean;
  offset: Point;
  width: number;
  height: number;
}
export interface MotionInput {
  width: number;
  height: number;
  now: number;
  section: string;
  scrollVelocity: number;
  scrolling: boolean;
  cursor: Point;
  cursorActive: boolean;
  ai: "closed" | "listening" | "thinking" | "response";
  targets: Target[];
  navbar?: Target | null;
  escapingNavbar?: boolean;
  recentWebAnchors?: string[];
  mobile: boolean;
  reduced: boolean;
  shoulderUsed: boolean;
  safe: (p: Point, shoulder?: boolean) => boolean;
}
export interface Route {
  from: Point;
  target: Target;
  progress: number;
  duration: number;
  pose: Pose;
  phase: string;
  webId: string | null;
  steps: string[];
  path: Point[];
  index: number;
  clock: number;
  swingReleaseIndex?: number;
}
const clamp = (n: number, l: number, h: number) => Math.max(l, Math.min(h, n));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const footOffset = (mobile: boolean, crouch = 0) => {
  void mobile; // Both responsive layouts use the same 47px principal model.
  const a = 1.4 * crouch,
    c = Math.cos(a),
    s = Math.sin(a);
  return 47 * (0.57 + 0.57 * c - 0.07 * s + Math.hypot(0.085 * c, 0.21 * s));
};
export function supportedPosition(
  t: Target,
  mobile: boolean,
  crouch = t.elementType === "shoulder" ? 0.75 : 0,
): Point {
  return {
    x: t.attachment.x,
    y:
      t.attachment.y +
      (t.roles.includes("HANG_ANCHOR") ? 95 : -footOffset(mobile, crouch)),
  };
}
export class CompanionEngine {
  state: State = "ENTERING";
  previousState: State = "ENTERING";
  pausedState: State | null = null;
  position: Point;
  velocity: Point = { x: 0, y: 0 };
  look = { x: 0, y: 0 };
  rotation = 0;
  crouch = 0;
  web = { visible: false, extension: 0, anchor: { x: 0, y: 0 } };
  navigationTarget: Target | null = null;
  supportAnchor: Target | null = null;
  activeWebAnchor: Target | null = null;
  route: Route | null = null;
  previousRoute: Route | null = null;
  remainingRoute: TravelLeg[] = [];
  previousRemainingRoute: TravelLeg[] = [];
  previousTarget: Target | null = null;
  previousAnimationProgress = 0;
  previousWebAnchor: Target | null = null;
  recent: Pose[] = [];
  idleAction = "LOOK_AROUND";
  landedAt = 0;
  recentObjects: string[] = [];
  recentWebAnchors: string[] = [];
  transitions: string[] = [];
  private lastWave = -120;
  private introElapsed = 0;
  private trace(event: string) {
    if (this.transitions.at(-1) !== event)
      this.transitions = [...this.transitions.slice(-15), event];
  }

  idleTime = 0;
  shoulderDone = false;
  suspended = false;
  initialized = false;
  safeStop: "NONE" | "REQUEST_SAFE_STOP" | "MOVE_TO_SAFE_ANCHOR" | "SUPPORTED" =
    "NONE";
  recentAnchors: string[] = [];
  recentRegions: string[] = [];
  impact = { x: 0, y: 0 };
  introDone = false;
  private navbarMode = false;
  private navbarClock = 0;
  private scrollStoppedAt = 0;
  private ropeY = 0;
  region(i: Pick<MotionInput, "width" | "height">, p = this.position) {
    return `${Math.min(2, Math.floor((p.x / i.width) * 3))}:${Math.min(2, Math.floor((p.y / i.height) * 3))}`;
  }
  dismissIntro() {
    this.introDone = true;
  }
  previewIntroduction() {
    this.introDone = false;
    this.introElapsed = -8; // Extended inspection time, invoked only by the development UI.
    this.landedAt = this.idleTime;
  }
  private pauseUntil = 0;
  private nextAction = 5;
  private userUntil = 0;
  private section = "";
  private serial = 0;
  private routeAttemptAfter = 0;
  constructor(width: number, height: number) {
    this.position = { x: width / 2, y: height / 2 };
  }
  private airborne(dt: number, i: MotionInput) {
    this.velocity.y += 500 * dt;
    const speed = i.mobile ? 350 : 650,
      length = Math.hypot(this.velocity.x, this.velocity.y);
    if (length > speed) {
      this.velocity.x *= speed / length;
      this.velocity.y *= speed / length;
    }
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }
  get animationProgress() {
    return this.route?.progress ?? 0;
  }
  userAction(now: number) {
    this.userUntil = now + 0.5;
  }
  navigate(section: string) {
    this.introDone = true;
    if (section) this.section = "";
    this.nextAction = 0;
  }
  private valid(t: Target) {
    return t.verified && t.visibility > 0.25;
  }
  private supports(i: MotionInput) {
    return i.targets.filter(
      (t) =>
        this.valid(t) &&
        t.roles.some((r) => r === "PERCH_ANCHOR" || r === "HANG_ANCHOR") &&
        (!i.mobile || t.mobileEnabled) &&
        i.safe(supportedPosition(t, i.mobile), t.elementType === "shoulder"),
    );
  }
  private choose(i: MotionInput) {
    const all = this.supports(i).filter(
      (t) =>
        t.id !== this.supportAnchor?.id &&
        (!this.shoulderDone || t.elementType !== "shoulder"),
    );
    const local = all.filter((t) => t.elementType !== "navbar");
    const candidates = local.length ? local : all;
    const weighted = candidates.map((t) => {
      const region = this.region(i, supportedPosition(t, i.mobile));
      const history =
        (this.recentAnchors.includes(t.id) ? 0.06 : 1) *
        (this.recentObjects.includes(t.objectId) ? 0.3 : 1);
      const diversity = this.recentRegions.includes(region) ? 0.25 : 3;
      const distance = dist(this.position, t);
      const size = Math.min(2, Math.sqrt(t.width * t.height) / 120 + 0.5);
      const shoulder =
        t.elementType === "shoulder" && !this.shoulderDone ? 12 : 1;
      return {
        t,
        weight:
          (history *
            diversity *
            size *
            shoulder *
            t.visibility *
            (t.section === i.section ? 1.4 : 1)) /
          (1 + distance / 900),
      };
    });
    let draw = Math.random() * weighted.reduce((n, c) => n + c.weight, 0);
    return weighted.find((c) => (draw -= c.weight) <= 0)?.t ?? null;
  }
  /** A fixed header owns scrolling. No object route or cursor writer runs concurrently. */
  private scrollMotion(dt: number, i: MotionInput) {
    const anchor = i.navbar;
    if (!anchor?.verified || anchor.visibility < 0.25) return false;
    if (!this.navbarMode) {
      this.navbarMode = true;
      this.recentWebAnchors = [...this.recentWebAnchors.slice(-4), anchor.id];
      this.navbarClock = 0;
      this.ropeY = this.position.y;
      this.route = null;
      this.remainingRoute = [];
      this.supportAnchor = null;
      this.velocity = { x: 0, y: 0 };
    }
    this.navbarClock += dt;
    this.activeWebAnchor = anchor;
    this.web.anchor = { ...anchor.attachment };
    this.web.visible = true;
    this.web.extension = Math.min(1, this.navbarClock / 0.22);
    this.suspended = this.web.extension === 1;
    this.state = this.suspended ? "SCROLL_RAPPELLING" : "NAVBAR_WEB_ATTACHING";
    const low = anchor.y + 115,
      high = Math.max(low, i.height - 145);
    if (i.scrolling) {
      this.scrollStoppedAt = i.now;
      this.ropeY += clamp(i.scrollVelocity * 0.12, -190, 190) * dt;
    }
    this.ropeY = clamp(this.ropeY, low, high);
    this.move({ x: anchor.x, y: this.ropeY }, dt, i);
    this.rotation +=
      ((this.suspended ? Math.PI : 0) - this.rotation) *
      (1 - Math.exp(-dt * 7));
    this.look.x *= Math.exp(-dt * 10);
    this.look.y *= Math.exp(-dt * 10);
    this.pauseUntil = 0;
    if (!i.scrolling) {
      this.state = "SCROLL_SETTLING";
      if (this.transitions.at(-1) !== "ANCHOR_SELECTION")
        this.trace("SCROLL_STOP");
    }
    if (
      !i.scrolling &&
      i.ai === "closed" &&
      i.now - this.scrollStoppedAt > 1.2
    ) {
      this.trace("ANCHOR_SELECTION");
      const candidates = this.supports(i)
        .filter((t) => t.elementType !== "navbar")
        .sort((a, b) => dist(this.position, a) - dist(this.position, b));
      for (const target of candidates) {
        if (this.plan(target, { ...i, escapingNavbar: true })) {
          this.navbarMode = false;
          this.state = "NAVBAR_DETACH";
          this.trace("NAVBAR_DETACH");
          this.routeAttemptAfter = i.now + 0.4;
          break;
        }
      }
    }
    return true;
  }

  /** Travel graph stops only on actual objects. Cursor interruptions preserve remaining legs. */
  private plan(t: Target, i: MotionInput) {
    const legs = planTraversal(this.position, t, {
      ...i,
      recentWebAnchors: this.recentWebAnchors,
    });
    if (!legs?.length) return false;
    this.remainingRoute = legs.slice(1);
    this.startLeg(legs[0]);
    this.navigationTarget = t;
    return true;
  }
  private startLeg(leg: TravelLeg) {
    this.route = {
      ...leg,
      from: { ...this.position },
      progress: 0,
      phase: "aim",
      index: 1,
      clock: 0,
    };
    if (!leg.webId && leg.pose === "JUMP_LONG") {
      const options: Pose[] = [
        "JUMP_LONG",
        "FLIP_FORWARD",
        "FLIP_BACKWARD",
        "FLIP_SIDE",
      ];
      this.route.pose = options[this.serial % options.length];
    }
    if (leg.webId)
      this.recentWebAnchors = [...this.recentWebAnchors.slice(-4), leg.webId];
    this.serial++;
    this.recent = [...this.recent.slice(-4), this.route.pose];
  }
  /** Bounded acceleration plus bounded frame displacement; scroll never assigns position. */
  private move(goal: Point, dt: number, i: MotionInput) {
    const d = dist(this.position, goal),
      speed = i.mobile ? 350 : 650,
      accel = 1900;
    const desired = {
      x:
        ((goal.x - this.position.x) / Math.max(0.01, d)) *
        Math.min(speed, Math.sqrt(2 * accel * d), d / dt),
      y:
        ((goal.y - this.position.y) / Math.max(0.01, d)) *
        Math.min(speed, Math.sqrt(2 * accel * d), d / dt),
    };
    const dv = dist(this.velocity, desired),
      f = Math.min(1, (accel * dt) / Math.max(0.01, dv));
    this.velocity.x += (desired.x - this.velocity.x) * f;
    this.velocity.y += (desired.y - this.velocity.y) * f;
    const dx = this.velocity.x * dt,
      dy = this.velocity.y * dt;
    const toward =
      (goal.x - this.position.x) * dx + (goal.y - this.position.y) * dy;
    if (d <= Math.hypot(dx, dy) && toward > 0) {
      this.position.x += goal.x - this.position.x;
      this.position.y += goal.y - this.position.y;
    } else {
      this.position.x += dx;
      this.position.y += dy;
    }
  }
  tick(raw: number, i: MotionInput) {
    const dt = clamp(raw, 0.001, 0.04),
      damp = 1 - Math.exp(-dt * 9);
    this.idleTime += dt;
    this.shoulderDone ||= i.shoulderUsed;
    if (!this.initialized) {
      const available = this.supports(i),
        t =
          available.find(
            (t) =>
              t.elementType !== "shoulder" && t.roles.includes("PERCH_ANCHOR"),
          ) ?? available.find((t) => t.roles.includes("HANG_ANCHOR"));
      if (!t) {
        this.state = "HIDDEN";
        return;
      }
      // The only direct relocation occurs before first visibility. A hanging entry shoots during continuous falling flight.
      const point = supportedPosition(t, i.mobile);
      this.position = {
        x: point.x,
        y: point.y - (t.roles.includes("HANG_ANCHOR") ? 40 : 0),
      };
      this.initialized = true;
      if (t.roles.includes("HANG_ANCHOR")) {
        this.state = "JUMPING";
        this.navigationTarget = t;
        this.route = {
          from: { ...this.position },
          target: t,
          progress: 0,
          duration: 0.8,
          pose: "WEB_PULL",
          phase: "aim",
          webId: t.id,
          steps: ["FALL", "AIM", "WEB_SHOOT", "ATTACH", "WEB_PULL", "HANG"],
          path: [{ ...this.position }, point],
          index: 1,
          clock: 0,
        };
      } else {
        this.supportAnchor = t;
        this.state = "PERCHED";
      }
    }

    if (
      (i.scrolling ||
        this.navbarMode ||
        (!this.supportAnchor && i.ai !== "closed")) &&
      this.scrollMotion(dt, i)
    )
      return;
    const find = (id: string) =>
      i.targets.find((t) => t.id === id && this.valid(t));
    if (this.activeWebAnchor) {
      this.activeWebAnchor = find(this.activeWebAnchor.id) ?? null;
      if (this.activeWebAnchor)
        this.web.anchor = { ...this.activeWebAnchor.attachment };
      else this.web.visible = false;
    }
    if (this.supportAnchor) {
      const support = find(this.supportAnchor.id),
        point = support
          ? supportedPosition(support, i.mobile, this.crouch)
          : null;
      if (
        !support ||
        !point ||
        dist(this.position, point) > 2 ||
        !i.safe(point, support.elementType === "shoulder")
      ) {
        this.supportAnchor = null;
        this.suspended = false;
        if (!this.route) this.state = "JUMPING";
      } else {
        this.supportAnchor = support;
        this.move(point, dt, i);
      }
    }
    if (
      !this.introDone &&
      !this.suspended &&
      this.supportAnchor &&
      !this.route &&
      i.ai === "closed" &&
      !i.scrolling
    ) {
      this.state = "INTRO_WAVING";
      if (this.introElapsed === 0) this.landedAt = this.idleTime;
      this.introElapsed += dt;
      if (this.introElapsed < (i.reduced ? 2 : 3.2)) return;
      this.lastWave = this.idleTime;
      this.introDone = true;
    }
    if (i.cursorActive) this.pauseUntil = i.now + 0.85;
    const interrupt =
      i.ai !== "closed" ||
      i.now < this.userUntil ||
      (!i.scrolling && i.now < this.pauseUntil);
    if (interrupt && this.safeStop === "NONE") {
      this.previousState = this.state;
      this.previousRoute = this.route;
      this.previousRemainingRoute = [...this.remainingRoute];
      this.previousTarget = this.navigationTarget;
      this.previousAnimationProgress = this.animationProgress;
      this.previousWebAnchor = this.activeWebAnchor;
      this.safeStop = "REQUEST_SAFE_STOP";
    }
    if (interrupt && this.supportAnchor && !this.route) {
      this.safeStop = "SUPPORTED";
      this.pausedState = this.previousState;
      this.state =
        i.ai === "thinking"
          ? "AI_THINKING"
          : i.ai === "response"
            ? "AI_RESPONSE"
            : i.ai === "listening"
              ? "AI_LISTENING"
              : "PAUSED_FOR_CURSOR";
      this.look.x +=
        (clamp((i.cursor.x - this.position.x) / 280, -0.55, 0.55) -
          this.look.x) *
        damp;
      this.look.y +=
        (clamp((i.cursor.y - this.position.y) / 340, -0.35, 0.35) -
          this.look.y) *
        damp;
      this.velocity = { x: 0, y: 0 };
      return;
    }
    if (!interrupt) {
      this.safeStop = "NONE";
      this.pausedState = null;
      this.look.x *= 1 - damp;
      this.look.y *= 1 - damp;
    }
    if (interrupt && !this.supportAnchor) this.safeStop = "MOVE_TO_SAFE_ANCHOR";
    if (
      !interrupt &&
      !this.route &&
      this.supportAnchor &&
      this.remainingRoute.length
    ) {
      const queued = this.remainingRoute[0],
        current = i.targets.find(
          (t) => t.id === queued.target.id && this.valid(t),
        );
      const replacement = current
        ? planTraversal(this.position, current, i)
        : null;
      if (replacement?.length) {
        this.remainingRoute = [
          ...replacement.slice(1),
          ...this.remainingRoute.slice(1),
        ];
        this.startLeg(replacement[0]);
      } else this.remainingRoute = [];
    }
    if (
      !this.route &&
      i.now >= this.routeAttemptAfter &&
      (!this.supportAnchor ||
        (!interrupt &&
          !i.reduced &&
          ((i.scrolling && this.section !== i.section) ||
            this.idleTime > this.nextAction)))
    ) {
      this.routeAttemptAfter = i.now + 0.4;
      const preferred = this.choose(i);
      const candidates = [
        preferred,
        ...this.supports(i).sort(
          (a, b) =>
            dist(this.position, supportedPosition(a, i.mobile)) -
            Math.sign(i.scrollVelocity) * (a.y - this.position.y) * 0.2 -
            (dist(this.position, supportedPosition(b, i.mobile)) -
              Math.sign(i.scrollVelocity) * (b.y - this.position.y) * 0.2),
        ),
      ].filter((t): t is Target => !!t && t.id !== this.supportAnchor?.id);
      for (const t of candidates)
        if (this.plan(t, i)) {
          this.section = i.section;
          this.nextAction = this.idleTime + 7;
          break;
        }
      if (!this.route && !this.supportAnchor && preferred) {
        // Recovery remains visible continuous flight, aiming at an actual edge. Never make an airborne position a support.
        const catchWeb = preferred.roles.includes("HANG_ANCHOR");
        this.route = {
          from: { ...this.position },
          target: preferred,
          progress: 0,
          duration: 2,
          pose: catchWeb ? "WEB_PULL" : "JUMP_LONG",
          phase: catchWeb ? "aim" : "travel",
          webId: catchWeb ? preferred.id : null,
          steps: catchWeb
            ? ["AIM", "WEB_SHOOT", "ATTACH", "WEB_PULL", "LAND"]
            : ["FALL", "LAND"],
          path: [{ ...this.position }, supportedPosition(preferred, i.mobile)],
          index: 1,
          clock: catchWeb ? 0 : 0.4,
        };
      }
    }
    const r = this.route;
    if (r) {
      const t = find(r.target.id);
      if (!t) {
        this.route = null;
        this.web.visible = false;
        this.activeWebAnchor = null;
      } else {
        r.target = t;
        r.clock += dt;
        const anchor = r.webId ? find(r.webId) : null;
        if (r.webId && !anchor) {
          this.route = null;
          this.web.visible = false;
          this.activeWebAnchor = null;
        } else if (r.clock < 0.4) {
          r.phase =
            r.clock < 0.12 ? "aim" : r.clock < 0.34 ? "shoot" : "attach";
          this.state = this.supportAnchor ? "CROUCHING" : "JUMPING";
          this.look.x = clamp((t.x - this.position.x) / 280, -0.55, 0.55);
          this.look.y = clamp((t.y - this.position.y) / 340, -0.35, 0.35);
          if (!this.supportAnchor && !this.activeWebAnchor) {
            this.airborne(dt, i);
          }
          if (anchor) {
            this.activeWebAnchor = anchor;
            this.web.anchor = { ...anchor.attachment };
            this.web.visible = r.clock >= 0.12;
            this.web.extension = clamp((r.clock - 0.12) / 0.22, 0, 1);
          }
        } else {
          this.supportAnchor = null;
          this.crouch = 0;
          this.suspended = false;
          r.phase = "travel";
          this.trace("MOVE");
          const swinging =
            r.swingReleaseIndex !== undefined && r.index <= r.swingReleaseIndex;
          const released = r.swingReleaseIndex !== undefined && !swinging;
          this.state =
            r.pose === "CRAWL_EDGE"
              ? "CRAWLING"
              : swinging
                ? "SWINGING"
                : r.webId && !released
                  ? r.pose === "ROPE_SLIDE"
                    ? "ROPE_SLIDING"
                    : "WEB_PULL"
                  : "JUMPING";
          if (swinging && anchor)
            this.rotation = clamp(
              -Math.atan2(
                this.position.x - anchor.attachment.x,
                this.position.y - anchor.attachment.y,
              ) * 0.4,
              -0.45,
              0.45,
            );
          else if (r.pose === "FLIP_SIDE") {
            const progress = (r.index - 1) / Math.max(1, r.path.length - 1);
            this.rotation = progress * Math.PI * 2;
          } else this.rotation += (0 - this.rotation) * damp;
          if (anchor && !released) {
            this.activeWebAnchor = anchor;
            this.web.visible = true;
            this.web.extension = 1;
            this.web.anchor = { ...anchor.attachment };
          } else {
            if (this.web.visible) this.trace("WEB_RELEASE");
            this.web.visible = false;
            this.activeWebAnchor = null;
          }
          // Recompute final destination from the current object. Intermediate points remain clearance geometry.
          const goal = supportedPosition(t, i.mobile),
            previousGoal = r.path[r.path.length - 1];
          if (dist(previousGoal, goal) > 12) {
            const replacement = safePath(
              this.position,
              goal,
              i.width,
              i.height,
              (p) => i.safe(p, t.elementType === "shoulder"),
            );
            if (replacement) {
              r.path = replacement;
              r.index = 1;
              r.swingReleaseIndex = undefined;
              r.pose = r.webId ? "WEB_PULL" : "JUMP_LONG";
            }
            // Scroll changes only the destination; it never moves the character or erases momentum.
          }
          r.path[r.path.length - 1] = goal;
          const waypoint = r.path[r.index];
          if (r.pose === "CRAWL_EDGE") {
            const step = Math.min(
              1,
              (80 * dt) / Math.max(0.001, dist(this.position, waypoint)),
            );
            this.velocity = {
              x: ((waypoint.x - this.position.x) * step) / dt,
              y: ((waypoint.y - this.position.y) * step) / dt,
            };
            this.position.x += this.velocity.x * dt;
            this.position.y += this.velocity.y * dt;
          } else this.move(waypoint, dt, i);
          r.progress = Math.max(
            r.progress,
            clamp((r.clock - 0.4) / r.duration, 0, 0.99),
          );
          if (dist(this.position, waypoint) < 1) {
            r.index++;
            r.progress = (r.index - 1) / (r.path.length - 1);
          }
          if (r.index >= r.path.length) {
            this.supportAnchor = t;
            this.crouch = t.elementType === "shoulder" ? 0.75 : 0;
            this.route = null;
            const idleActions = [
              "LOOK_AROUND",
              "INSPECT",
              "HEAD_TILT",
              "CELEBRATE",
              "DODGE",
            ];
            this.landedAt = this.idleTime;
            this.trace("LAND");
            this.trace("ROAM");
            this.recentObjects = [...this.recentObjects.slice(-5), t.objectId];
            this.idleAction = idleActions[this.serial % idleActions.length];
            if (
              !i.reduced &&
              !t.roles.includes("HANG_ANCHOR") &&
              this.idleTime - this.lastWave > 120 &&
              Math.random() < 0.08
            ) {
              this.idleAction = "WAVE";
              this.lastWave = this.idleTime;
            }
            this.impact = { ...this.velocity };
            this.velocity = { x: 0, y: 0 };
            this.nextAction =
              this.idleTime +
              (t.elementType === "shoulder" ? 4 : 3 + Math.random() * 3);
            this.recentAnchors = [...this.recentAnchors.slice(-8), t.id];
            this.recentRegions = [
              ...this.recentRegions.slice(-5),
              this.region(i),
            ];
            this.suspended = t.roles.includes("HANG_ANCHOR");
            this.rotation = this.suspended ? Math.PI : 0;
            this.state = this.suspended
              ? "HANGING"
              : t.elementType === "shoulder"
                ? "SHOULDER_PERCH"
                : "PERCHED";
            if (t.elementType === "shoulder") this.shoulderDone = true;
            this.web.visible = this.suspended;
            this.web.extension = this.suspended ? 1 : 0;
            this.activeWebAnchor = this.suspended ? t : null;
          }
        }
      }
    }
    if (!this.route && !this.supportAnchor) {
      // Unsupported flight never becomes an idle pose. Gravity continues until a valid route can be acquired.
      this.state = "JUMPING";
      this.airborne(dt, i);
    }
    if (this.supportAnchor && !this.route) {
      this.suspended = this.supportAnchor.roles.includes("HANG_ANCHOR");
      this.rotation = this.suspended ? Math.PI : 0;
      this.web.visible = this.suspended;
      this.activeWebAnchor = this.suspended ? this.supportAnchor : null;
      if (this.suspended)
        this.web.anchor = { ...this.supportAnchor.attachment };
    }
  }
}
