import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { writeBraidedWeb, WEB_FLOATS } from "../src/three/webGeometry";
import { ImpactWeb, impactWebPath } from "../src/companion/impactWeb";
import { eligibleWebClick, planClickSwing } from "../src/companion/clickSwing";
import { CompanionEngine, type MotionInput, type Target } from "../src/companion/engine";

const target = (id: string, x: number, y: number, roles: Target["roles"]): Target => ({
  id, objectId: id, section: "home", elementType: "card", roles,
  attachment: { x, y }, x, y, verified: true, visibility: 1,
  poses: ["PERCH"], priority: 1, mobileEnabled: true,
  offset: { x: 0, y: 0 }, width: 240, height: 160,
});
const perch = target("perch", 100, 390, ["PERCH_ANCHOR", "REST_ANCHOR"]);
const landing = target("landing", 450, 420, ["PERCH_ANCHOR", "REST_ANCHOR"]);
const click = target("clicked", 190, 130, ["WEB_ANCHOR"]);
const input = (overrides: Partial<MotionInput> = {}): MotionInput => ({
  width: 1000, height: 800, now: 0, section: "home", scrollVelocity: 0,
  scrolling: false, cursor: { x: 500, y: 200 }, cursorActive: false,
  ai: "closed", targets: [perch, landing, click], mobile: false,
  reduced: false, shoulderUsed: false, safe: () => true, ...overrides,
});

test("braided web reuses one buffer and stays close to the physical axis", () => {
  const buffer = new Float32Array(WEB_FLOATS);
  const count = writeBraidedWeb(buffer, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 1, false);
  assert.ok(count > 100);
  for (let i = 0; i < count * 3; i += 3) {
    assert.ok(Number.isFinite(buffer[i]) && Number.isFinite(buffer[i + 1]));
    assert.ok(Math.abs(buffer[i + 1]) < 0.055);
  }
  const mobile = writeBraidedWeb(buffer, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 0.5, true);
  assert.ok(mobile < count);
  assert.ok(buffer[0] < 0.1);
  assert.equal(writeBraidedWeb(buffer, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 0, false), 0);
});

test("impact web has radial spokes and closed organic rings", () => {
  const path = impactWebPath();
  assert.equal((path.match(/M 0 0 L/g) ?? []).length, 10);
  assert.equal((path.match(/ Z/g) ?? []).length, 4);
  assert.notEqual(impactWebPath(10, 4), impactWebPath(8, 3));
});

test("temporary impact web disposes its DOM node and pending fade", () => {
  const dom = new JSDOM("<body></body>");
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  Object.assign(globalThis, { document: dom.window.document, window: dom.window });
  try {
    const impact = new ImpactWeb({ x: 220, y: 160 });
    assert.equal(document.querySelectorAll(".spidey-impact-web").length, 1);
    impact.release();
    impact.dispose();
    assert.equal(document.querySelectorAll(".spidey-impact-web").length, 0);
  } finally {
    Object.assign(globalThis, { document: oldDocument, window: oldWindow });
    dom.window.close();
  }
});

test("click route uses the clicked overhead anchor and a real landing support", () => {
  const from = { x: 100, y: 300 };
  const leg = planClickSwing(from, click, input());
  assert.ok(leg);
  assert.equal(leg.webId, click.id);
  assert.equal(leg.target.id, landing.id);
  assert.equal(leg.pose, "SWING_SHORT");
  const rope = Math.hypot(from.x - click.x, from.y - click.y);
  for (const point of leg.path.slice(0, leg.swingReleaseIndex! + 1))
    assert.ok(Math.abs(Math.hypot(point.x - click.x, point.y - click.y) - rope) < 0.001);
  assert.equal(planClickSwing(from, { ...click, attachment: { x: 190, y: 340 }, y: 340 }, input()), null);
});

test("click traversal declines during chat, scrolling, mobile and reduced motion", () => {
  const engine = new CompanionEngine(1000, 800);
  engine.introDone = true;
  engine.tick(0.02, input({ targets: [perch, landing, click] }));
  assert.equal(engine.supportAnchor?.id, perch.id);
  for (const blocked of [{ ai: "listening" as const }, { scrolling: true }, { mobile: true }, { reduced: true }])
    assert.equal(engine.startClickSwing(click, input(blocked)), false);
  assert.equal(engine.startClickSwing(click, input()), true);
  assert.equal(engine.route?.click, true);
  assert.equal(engine.startClickSwing(click, input()), true);
  engine.cancelClickSwing();
  assert.equal(engine.route, null);
  assert.equal(engine.web.visible, false);
});

test("decorative clicks never take priority over controls or touch", () => {
  const dom = new JSDOM('<main><section id="home"><button id="action">Act</button><div id="space"></div></section></main>');
  const oldDocument = globalThis.document;
  const oldElement = globalThis.Element;
  const oldWidth = globalThis.innerWidth;
  const oldHeight = globalThis.innerHeight;
  Object.assign(globalThis, { document: dom.window.document, Element: dom.window.Element, innerWidth: 1000, innerHeight: 800 });
  try {
    const event = (id: string) => ({ button: 0, detail: 1, clientX: 400, clientY: 180, target: document.getElementById(id) }) as unknown as MouseEvent;
    assert.equal(eligibleWebClick(event("space"), false, false), true);
    assert.equal(eligibleWebClick(event("action"), false, false), false);
    assert.equal(eligibleWebClick(event("space"), true, false), false);
    assert.equal(eligibleWebClick(event("space"), false, true), false);
    document.documentElement.classList.add("spidey-hiding");
    assert.equal(eligibleWebClick(event("space"), false, false), false);
  } finally {
    Object.assign(globalThis, { document: oldDocument, Element: oldElement, innerWidth: oldWidth, innerHeight: oldHeight });
    dom.window.close();
  }
});

