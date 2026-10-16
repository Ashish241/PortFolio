import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { writeBraidedWeb, WEB_FLOATS } from "../src/three/webGeometry";
import { ImpactWeb, impactWebPath } from "../src/companion/impactWeb";
import { eligibleWebClick } from "../src/companion/decorativeWeb";

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

test("decorative clicks never take priority over controls or touch", () => {
  const dom = new JSDOM('<main><section id="home"><button id="action">Act</button><div id="space"></div></section></main>');
  const oldDocument = globalThis.document;
  const oldElement = globalThis.Element;
  const oldWidth = globalThis.innerWidth;
  const oldHeight = globalThis.innerHeight;
  Object.assign(globalThis, { document: dom.window.document, Element: dom.window.Element, innerWidth: 1000, innerHeight: 800 });
  Object.defineProperty(document.documentElement, "clientWidth", { value: 1000 });
  try {
    const event = (id: string) => ({ button: 0, detail: 1, clientX: 400, clientY: 180, target: document.getElementById(id) }) as unknown as MouseEvent;
    assert.equal(eligibleWebClick(event("space"), false, false), true);
    assert.equal(eligibleWebClick(event("action"), false, false), false);
    assert.equal(eligibleWebClick(event("space"), true, false), true);
    assert.equal(eligibleWebClick(event("space"), false, true), true);
    document.documentElement.classList.add("spidey-hiding");
    assert.equal(eligibleWebClick(event("space"), false, false), false);
  } finally {
    Object.assign(globalThis, { document: oldDocument, Element: oldElement, innerWidth: oldWidth, innerHeight: oldHeight });
    dom.window.close();
  }
});

