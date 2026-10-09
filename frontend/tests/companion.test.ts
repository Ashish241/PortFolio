import test from "node:test";
import assert from "node:assert/strict";
import {
  CompanionEngine,
  supportedPosition,
  type MotionInput,
  type Target,
} from "../src/companion/engine";
import { NAV_ITEMS } from "../src/companion/events";
import { safePath } from "../src/companion/path";
import { shoulderPosition } from "../src/companion/portrait";
const target = (id: string, x: number, y: number, hang = false): Target => ({
  id,
  objectId: id,
  section: "projects",
  elementType: "card",
  roles: hang ? ["HANG_ANCHOR", "WEB_ANCHOR"] : ["PERCH_ANCHOR", "REST_ANCHOR"],
  attachment: { x, y },
  verified: true,
  x,
  y,
  poses: hang ? ["HANG_IDLE"] : ["PERCH"],
  priority: 2,
  visibility: 1,
  mobileEnabled: true,
  offset: { x: 0, y: 0 },
  width: 300,
  height: 200,
});
const a = target("a", 150, 450),
  b = target("b", 650, 450),
  web: Target = { ...target("nav-edge", 400, 90), roles: ["WEB_ANCHOR"] };
const input = (overrides: Partial<MotionInput> = {}): MotionInput => ({
  width: 1440,
  height: 1000,
  now: 0,
  section: "projects",
  scrollVelocity: 0,
  scrolling: false,
  cursor: { x: 700, y: 250 },
  cursorActive: false,
  ai: "closed",
  targets: [a, b, web],
  mobile: false,
  reduced: false,
  shoulderUsed: false,
  safe: () => true,
  ...overrides,
});
function advance(
  e: CompanionEngine,
  start: number,
  seconds: number,
  overrides: Partial<MotionInput> = {},
) {
  for (let n = 0; n < seconds / 0.02; n++)
    e.tick(0.02, input({ now: start + n * 0.02, ...overrides }));
}
test("navigation order follows the page", () =>
  assert.deepEqual(
    NAV_ITEMS.map((x) => x[0]),
    [
      "home",
      "about",
      "projects",
      "experience",
      "skills",
      "open-source",
      "contact",
    ],
  ));
test("no valid support means no character initialization or fake web", () => {
  const e = new CompanionEngine(1440, 1000);
  advance(e, 0, 3, { targets: [{ ...a, verified: false }] });
  assert.equal(e.initialized, false);
  assert.equal(e.state, "HIDDEN");
  assert.equal(e.web.visible, false);
});
test("perch centre aligns feet with an actual attachment", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  assert.deepEqual(e.position, supportedPosition(a, false));
  assert.equal(e.supportAnchor?.id, a.id);
  assert.equal(e.web.visible, false);
});
test("cursor interruption completes a supported stop instead of freezing mid-flight", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  e.navigate("projects");
  advance(e, 0.02, 0.8);
  assert.ok(e.route);
  assert.equal(e.supportAnchor, null);
  const before = { ...e.position },
    r = e.route;
  e.tick(0.02, input({ now: 0.9, cursorActive: true }));
  assert.equal(e.safeStop, "MOVE_TO_SAFE_ANCHOR");
  assert.notDeepEqual(e.position, before);
  assert.notEqual(e.state, "PAUSED_FOR_CURSOR");
  assert.equal(e.previousRoute, r);
  advance(e, 1, 8, { cursorActive: true });
  assert.equal(e.state, "PAUSED_FOR_CURSOR");
  assert.ok(e.supportAnchor);
  assert.ok(e.previousTarget);
  assert.ok(e.previousAnimationProgress > 0);
  advance(e, 9, 2);
  assert.equal(e.safeStop, "NONE");
  assert.notEqual(e.state, "PAUSED_FOR_CURSOR");
});
test("AI waits for support and keeps the valid hanging web when paused", () => {
  const h = target("card-bottom", 600, 230, true),
    e = new CompanionEngine(1440, 1000),
    targets = [a, h, web];
  e.tick(0.02, input({ targets }));
  e.navigate("projects");
  advance(e, 0.02, 0.8, { targets });
  assert.ok(e.route);
  assert.equal(e.supportAnchor, null);
  e.tick(0.02, input({ now: 0.9, targets, ai: "thinking" }));
  assert.notEqual(e.state, "AI_THINKING");
  advance(e, 1, 8, { targets, ai: "thinking" });
  assert.equal(e.supportAnchor?.id, h.id);
  assert.equal(e.state, "AI_THINKING");
  assert.equal(e.suspended, true);
  assert.ok(e.web.visible);
  assert.equal(e.activeWebAnchor?.id, h.id);
  e.tick(0.02, input({ now: 9, targets, ai: "listening" }));
  assert.equal(e.state, "AI_LISTENING");
  assert.ok(e.web.visible);
  assert.deepEqual(e.web.anchor, h.attachment);
});

test("web tip extends before departure and only uses a verified visible object", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  e.navigate("projects");
  let partial = false,
    travel = false;
  for (let n = 1; n < 240; n++) {
    e.tick(0.02, input({ now: n * 0.02 }));
    if (e.web.visible) {
      assert.ok(e.activeWebAnchor?.verified);
      assert.deepEqual(e.web.anchor, e.activeWebAnchor!.attachment);
      if (e.web.extension > 0 && e.web.extension < 1) {
        partial = true;
        assert.ok(e.supportAnchor);
      }
      if (["WEB_PULL", "SWINGING"].includes(e.state)) travel = true;
    }
  }
  assert.ok(partial && travel);
});
test("high speed scroll and reversal never exceed bounded displacement", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  for (let n = 1; n < 500; n++) {
    const delta = n % 30 < 15 ? 400 : -400,
      targets = [a, { ...b, attachment: { x: b.x, y: 450 + delta } }, web],
      old = { ...e.position };
    e.tick(
      0.02,
      input({
        now: n * 0.02,
        scrolling: true,
        scrollVelocity: delta * 10,
        targets,
      }),
    );
    assert.ok(Math.hypot(e.position.x - old.x, e.position.y - old.y) <= 13.1);
    if (["PERCHED", "PAUSED_FOR_CURSOR", "HANGING"].includes(e.state))
      assert.ok(e.supportAnchor);
  }
});
test("loss of support causes continuous travel instead of an unsupported perch", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  const old = { ...e.position };
  e.tick(0.02, input({ now: 1, targets: [b, web] }));
  assert.equal(e.supportAnchor, null);
  assert.notEqual(e.state, "PERCHED");
  assert.ok(Math.hypot(e.position.x - old.x, e.position.y - old.y) <= 13.1);
});
test("web endpoint follows the updated object rather than the old coordinate", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  e.navigate("projects");
  advance(e, 0.02, 0.25);
  assert.equal(e.activeWebAnchor?.id, web.id);
  const moved = { ...web, attachment: { x: 430, y: 95 } };
  e.tick(0.02, input({ now: 0.3, targets: [a, b, moved] }));
  assert.deepEqual(e.web.anchor, moved.attachment);
});
test("reduced motion retains valid support and disables idle traversal", () => {
  const e = new CompanionEngine(1440, 1000);
  advance(e, 0, 20, { reduced: true });
  assert.equal(e.route, null);
  assert.ok(e.supportAnchor);
  assert.equal(e.rotation, 0);
});
test("cursor head inputs remain constrained on a support", () => {
  const e = new CompanionEngine(1440, 1000);
  advance(e, 0, 4, { cursorActive: true, cursor: { x: -10000, y: 10000 } });
  assert.ok(Math.abs(e.look.x) <= 0.55 && Math.abs(e.look.y) <= 0.35);
  assert.equal(e.rotation, 0);
  assert.ok(e.supportAnchor);
});
test("clearance path avoids protected text and never defines a web anchor", () => {
  const safe = ({ x, y }: { x: number; y: number }) =>
      !(x > 230 && x < 720 && y > 230 && y < 650),
    path = safePath({ x: 120, y: 450 }, { x: 840, y: 450 }, 1000, 900, safe);
  assert.ok(path && path.length > 2);
  for (let i = 1; i < path!.length; i++)
    for (let n = 0; n <= 50; n++)
      assert.ok(
        safe({
          x: path![i - 1].x + ((path![i].x - path![i - 1].x) * n) / 50,
          y: path![i - 1].y + ((path![i].y - path![i - 1].y) * n) / 50,
        }),
      );
});
test("shoulder marker follows the original photo and cover crop", () => {
  const d = shoulderPosition(360, 480, 900, 1200, [0.5, 0.35]),
    m = shoulderPosition(290, 319, 900, 1200, [0.5, 0.37]);
  assert.ok(Math.abs(d.x - 67) < 0.001 && Math.abs(d.y - 47) < 0.001);
  assert.ok(Math.abs(m.x - 67) < 0.001 && m.y > 49 && m.y < 50);
});
import { planTraversal } from "../src/companion/planner";
test("long traversal uses a chain of actual objects and preserves the unfinished legs", () => {
  const middle = target("middle-card", 650, 450),
    far = target("far-card", 1150, 450);
  const i = input({ targets: [a, middle, far, web] });
  const plan = planTraversal(supportedPosition(a, false), far, i);
  assert.ok(plan && plan.length === 2);
  assert.deepEqual(
    plan!.map((leg) => leg.target.id),
    [middle.id, far.id],
  );
  for (const leg of plan!)
    assert.ok(leg.target.verified && leg.steps.includes("LAND"));
});
test("shared chat opener waits for a supported stop and uses one callback", async () => {
  const { companionEvents } = await import("../src/companion/events");
  const unregister = companionEvents.registerRuntime();
  let opened = 0;
  companionEvents.requestAssistantOpen(() => opened++);
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(opened, 0);
  companionEvents.safeForAssistant(false);
  assert.equal(opened, 0);
  companionEvents.safeForAssistant(true);
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.equal(opened, 1);
  companionEvents.emit({ type: "AI_CLOSE" });
  unregister();
});
test("small scroll displacement detaches support before cursor looking can freeze a gap", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  e.tick(
    0.02,
    input({
      now: 0.1,
      cursorActive: true,
      targets: [{ ...a, attachment: { x: a.x, y: a.y - 12 } }, b, web],
    }),
  );
  assert.equal(e.supportAnchor, null);
  assert.notEqual(e.state, "PAUSED_FOR_CURSOR");
  assert.equal(e.safeStop, "MOVE_TO_SAFE_ANCHOR");
});
test("a swing keeps a real web until release and lands with support", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  e.navigate("projects");
  let swing = false,
    release = false,
    landed = false;
  for (let n = 1; n < 450; n++) {
    e.tick(0.02, input({ now: n * 0.02 }));
    if (e.state === "SWINGING") {
      swing = true;
      assert.ok(e.web.visible && e.activeWebAnchor?.verified);
    }
    if (swing && e.state === "JUMPING") {
      release = true;
      assert.equal(e.web.visible, false);
    }
    if (release && e.state === "PERCHED") {
      landed = true;
      assert.ok(e.supportAnchor);
      break;
    }
  }
  assert.ok(swing && release && landed);
});
test("hanging-only startup visibly shoots before it declares a hanging support", () => {
  const h = target("navbar-bottom", 100, 85, true),
    e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input({ targets: [h] }));
  assert.equal(e.supportAnchor, null);
  assert.equal(e.state, "JUMPING");
  assert.equal(e.web.extension, 0);
  let shot = false;
  for (let n = 1; n < 200; n++) {
    e.tick(0.02, input({ now: n * 0.02, targets: [h] }));
    if (e.web.extension > 0 && e.web.extension < 1) shot = true;
    if (e.state === "HANGING") {
      assert.ok(shot);
      assert.equal(e.activeWebAnchor?.id, h.id);
      assert.ok(e.web.visible);
      return;
    }
  }
  assert.fail("Hanging entry never reached its real edge");
});
test("reversing the destination preserves forward momentum for the first frame", () => {
  const e = new CompanionEngine(1440, 1000);
  e.tick(0.02, input());
  e.navigate("projects");
  advance(e, 0.02, 0.8);
  assert.ok(e.route);
  assert.equal(e.supportAnchor, null);
  e.velocity = { x: 250, y: 0 };
  const before = { ...e.position };
  const reversed = { ...b, attachment: { x: 80, y: 450 } };
  e.tick(
    0.02,
    input({
      now: 1,
      scrolling: true,
      scrollVelocity: -2000,
      targets: [a, reversed, web],
    }),
  );
  assert.ok(e.position.x > before.x);
  assert.ok(e.velocity.x > 0);
});

test("navbar scrolling has priority, remains connected, reverses and stays bounded", () => {
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    const e = new CompanionEngine(width, 800);
    const perch = target("start", width / 2, 350);
    const navbar = {
      ...target("navbar-scroll", width / 2, 70, true),
      elementType: "navbar",
    };
    e.tick(0.02, input({ width, height: 800, targets: [perch, navbar] }));
    for (let n = 0; n < 500; n++) {
      const before = { ...e.position };
      e.tick(
        0.02,
        input({
          width,
          height: 800,
          now: n * 0.02,
          navbar,
          targets: [perch, navbar],
          scrolling: true,
          scrollVelocity: n < 250 ? 4000 : -4000,
          cursorActive: true,
        }),
      );
      assert.equal(e.activeWebAnchor?.id, "navbar-scroll");
      assert.equal(e.web.visible, true);
      assert.ok(
        Math.hypot(e.position.x - before.x, e.position.y - before.y) <= 13.2,
      );
      assert.ok(e.position.y >= 70 && e.position.y <= 720);
      assert.ok(Math.abs(e.position.x - width / 2) < 1);
    }
    assert.equal(e.state, "SCROLL_RAPPELLING");
    assert.ok(Math.abs(e.rotation - Math.PI) < 0.01);
    e.tick(
      0.02,
      input({
        width,
        height: 800,
        now: 10.01,
        navbar,
        targets: [perch, navbar],
      }),
    );
    assert.equal(
      e.web.visible,
      true,
      "scroll end keeps rope during target inspection",
    );
  }
});

test("weighted exploration reaches real objects in all quadrants and centre", () => {
  const objects = [
    target("tl", 180, 220),
    target("tr", 800, 220),
    target("centre", 490, 440),
    target("bl", 180, 690),
    target("br", 800, 690),
  ];
  const e = new CompanionEngine(1000, 800);
  e.introDone = true;
  const visited = new Set<string>();
  let seed = 42;
  const previousRandom = Math.random;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    for (let n = 0; n < 15000; n++) {
      e.tick(
        0.02,
        input({ width: 1000, height: 800, now: n * 0.02, targets: objects }),
      );
      if (e.supportAnchor) visited.add(e.supportAnchor.id);
    }
  } finally {
    Math.random = previousRandom;
  }
  assert.equal(visited.size, 5, `visited ${[...visited]}`);
  assert.ok(e.recentRegions.length > 1);
});

test("scroll end exits to visible local content and drops stale cursor gaze", () => {
  const e = new CompanionEngine(1000, 800);
  e.introDone = true;
  const card = target("project", 500, 420),
    next = target("next", 680, 400);
  const navbar = {
    ...target("navbar-scroll", 500, 70, true),
    elementType: "navbar",
  };
  e.tick(0.02, input({ targets: [card, next, navbar], navbar }));
  e.look = { x: 0.5, y: 0.3 };
  advance(e, 0, 1, {
    width: 1000,
    height: 800,
    targets: [card, next, navbar],
    navbar,
    scrolling: true,
    scrollVelocity: 100,
    cursorActive: true,
    cursor: { x: 999, y: 799 },
  });
  assert.ok(Math.abs(e.look.x) < 0.001);
  advance(e, 1, 8, {
    width: 1000,
    height: 800,
    targets: [card, next, navbar],
    navbar,
  });
  assert.ok(e.transitions.includes("NAVBAR_DETACH"));
  assert.ok(e.transitions.includes("ROAM"));
  assert.notEqual(e.supportAnchor?.elementType, "navbar");
});

test("short stationary travel jumps instead of shooting a long navbar web", async () => {
  const { planTraversal } = await import("../src/companion/planner");
  const card = target("near", 250, 400);
  const navbar = {
    ...target("navbar-scroll", 100, 60, true),
    elementType: "navbar",
  };
  const route = planTraversal(
    { x: 150, y: supportedPosition(card, false).y },
    card,
    input({ targets: [card, navbar], navbar }),
  );
  assert.equal(route?.[0].pose, "JUMP_SHORT");
  assert.equal(route?.[0].webId, null);
});

test("crawl stays on one continuous card edge and never bridges separate objects", async () => {
  const { planTraversal } = await import("../src/companion/planner");
  const left = target("edge-left", 150, 400),
    right = { ...target("edge-right", 300, 400), objectId: left.objectId };
  const route = planTraversal(
    supportedPosition(left, false),
    right,
    input({ targets: [left, right] }),
  );
  assert.equal(route?.[0].pose, "CRAWL_EDGE");
  assert.equal(route?.[0].webId, null);
  assert.ok(
    route?.[0].path.every(
      (p) => Math.abs(p.y - supportedPosition(left, false).y) < 0.001,
    ),
  );
  const separate = { ...right, objectId: "other-card" };
  assert.equal(
    planTraversal(
      supportedPosition(left, false),
      separate,
      input({ targets: [left, separate] }),
    )?.[0].pose,
    "JUMP_SHORT",
  );
});
