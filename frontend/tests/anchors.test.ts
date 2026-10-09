import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { AnchorManager } from "../src/three/AnchorManager";
const dom = new JSDOM(
  '<body><header style="background:#111" class="navigation" data-box="0,0,1440,85"></header><main id="main"><section id="projects"><p data-box="100,400,600,120">Protected paragraph</p><input data-box="100,650,600,50"><div style="background:#111;border:1px solid #fff" data-spidey-source="card" data-spidey-id="project-card" data-box="100,330,600,300"></div></section></main><aside class="assistant-panel" data-box="950,100,430,800">Chat</aside></body>',
  { url: "https://portfolio.test" },
);
let reads = 0,
  observations = 0;
class Resize {
  constructor(public callback: () => void) {}
  observe() {
    observations++;
  }
  unobserve() {}
  disconnect() {}
}
class Intersection {
  constructor(_: unknown) {}
  observe() {}
  disconnect() {}
}
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  ResizeObserver: Resize,
  IntersectionObserver: Intersection,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: (el: Element) => {
    const s = dom.window.getComputedStyle(el);
    return {
      ...s,
      visibility: s.visibility || "visible",
      display: s.display,
      backgroundColor: s.backgroundColor,
      borderTopWidth: s.borderTopWidth,
      borderBottomWidth: s.borderBottomWidth,
      borderLeftWidth: s.borderLeftWidth,
      borderRightWidth: s.borderRightWidth,
      opacity: s.opacity || "1",
    };
  },
});
Object.defineProperty(document, "fonts", {
  value: { ready: new Promise(() => {}) },
});
for (const key of ["innerWidth", "innerHeight", "scrollY"])
  Object.defineProperty(globalThis, key, {
    get: () => (window as any)[key],
    configurable: true,
  });
(document as any).elementsFromPoint = (x: number, y: number) =>
  [...document.querySelectorAll<HTMLElement>("[data-box]")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    })
    .reverse();
const prototype = dom.window.HTMLElement.prototype;
prototype.getBoundingClientRect = function () {
  reads++;
  const [x, y, width, height] = (this.dataset.box ?? "0,0,0,0")
    .split(",")
    .map(Number);
  return {
    x,
    y,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    width,
    height,
    toJSON() {},
  };
};
prototype.getClientRects = function () {
  return [this.getBoundingClientRect()] as any;
};

test("impact events animate only the target, compose transforms and cancel on disposal", () => {
  const calls: { element: HTMLElement; frames: any; options: any }[] = [];
  let cancelled = 0;
  const old = prototype.animate;
  prototype.animate = function (frames: any, options: any) {
    calls.push({ element: this, frames, options });
    return {
      cancel() {
        cancelled++;
      },
      onfinish: null,
    } as any;
  };
  const registry = new AnchorManager();
  try {
    const t = registry
      .targets(1440, 1000, false, "projects")
      .find((t) => t.objectId === "project-card")!;
    assert.ok(t);
    for (const kind of ["landing", "tension", "release"])
      registry.play(t, { x: 120, y: 240 }, kind);
    assert.equal(calls.length, 3);
    assert.ok(
      calls.every((c) => c.element.dataset.spideyId === "project-card"),
    );
    assert.ok(
      calls.every((c) => c.options.composite === "add" && !c.options.fill),
    );
    assert.ok(
      calls.every(
        (c) =>
          c.frames.at(-1).transform === "translate(0,0) rotate(0deg) scale(1)",
      ),
    );
    assert.deepEqual(
      registry.impacts.map((e) => e.kind),
      ["landing", "tension", "release"],
    );
  } finally {
    registry.dispose();
    prototype.animate = old;
  }
  assert.equal(cancelled, 3);
  window.dispatchEvent(
    new window.CustomEvent("SPIDEY_OBJECT_IMPACT", {
      detail: {
        objectId: "project-card",
        velocity: { x: 0, y: 100 },
        kind: "landing",
      },
    }),
  );
  assert.equal(calls.length, 3);
});
test("anchor/exclusion measurements are cached between frames and resize registrations stay stable", async () => {
  Object.defineProperty(window, "innerWidth", {
    value: 1440,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: 1000,
    configurable: true,
  });
  const registry = new AnchorManager();
  try {
    const measured = reads,
      observed = observations;
    for (let i = 0; i < 300; i++) {
      registry.targets(1440, 1000, false, "projects");
      registry.safe({ x: 50, y: 350 });
    }
    assert.equal(reads, measured, "No layout reads for unattached candidates");
    assert.ok(
      registry
        .targets(1440, 1000, false, "projects")
        .every((t) => !t.id.startsWith("margin-")),
    );
    const active = registry
      .targets(1440, 1000, false, "projects")
      .find((t) => t.id.startsWith("project-card"))!;
    registry.targets(1440, 1000, false, "projects", [active.id]);
    assert.ok(reads > measured, "Attached object transform tracked");
    assert.ok(
      registry
        .targets(1440, 1000, false, "projects")
        .some((t) => t.id.startsWith("project-card")),
    );
    assert.equal(
      registry.safe({ x: 300, y: 460 }),
      false,
      "Paragraph protected",
    );
    assert.equal(registry.safe({ x: 300, y: 670 }), false, "Input protected");
    assert.equal(registry.safe({ x: 1150, y: 300 }), false, "Chat protected");
    assert.equal(
      registry.safe({ x: 300, y: 80 }),
      false,
      "Navigation protected",
    );
    assert.equal(
      registry.safe({ x: 50, y: 350 }),
      true,
      "Reserved margin usable",
    );
    window.dispatchEvent(new dom.window.Event("companion-layout"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.ok(reads > measured);
    assert.equal(
      observations,
      observed,
      "No ResizeObserver re-registration loop",
    );
  } finally {
    registry.dispose();
  }
});
test("collision bounds adapt across mobile, tablet and desktop viewports", () => {
  for (const width of [360, 390, 768, 900, 1366, 1440, 1920, 2560]) {
    Object.defineProperty(window, "innerWidth", {
      value: width,
      configurable: true,
    });
    const registry = new AnchorManager(),
      mobile = width <= 900;
    try {
      assert.equal(registry.safe({ x: -1, y: 300 }, mobile), false);
      assert.equal(registry.safe({ x: width + 1, y: 300 }, mobile), false);
      assert.equal(
        registry.safe({ x: Math.min(width / 2, 300), y: 450 }, mobile),
        false,
      );
      assert.ok(
        registry
          .targets(width, 1000, mobile, "projects")
          .every((t) => t.visibility === 0 || (t.x > 0 && t.x < width)),
      );
    } finally {
      registry.dispose();
    }
  }
});

test("technology buttons allow a top-edge perch while protecting their clickable interior", () => {
  Object.defineProperty(window, "innerWidth", {
    value: 1440,
    configurable: true,
  });
  const node = document.createElement("button");
  node.className = "skill-node";
  node.dataset.box = "740,330,120,60";
  node.style.cssText = "background:#123;border:1px solid white";
  document.getElementById("main")!.append(node);
  const registry = new AnchorManager();
  try {
    const perch = registry
      .targets(1440, 1000, false, "skills")
      .find((t) => t.x === 800 && t.roles.includes("PERCH_ANCHOR"));
    assert.ok(perch);
    assert.ok(registry.safe({ x: perch.x, y: perch.y - 57.575 }));
    assert.equal(registry.safe({ x: 800, y: 360 }), false);
  } finally {
    registry.dispose();
    node.remove();
  }
});
test("switching between desktop and mobile renderers preserves position and motion authority", async () => {
  Object.defineProperty(window, "innerWidth", {
    value: 1440,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: 1000,
    configurable: true,
  });
  Object.assign(globalThis, {
    sessionStorage: window.sessionStorage,
    location: window.location,
  });
  const { CompanionRuntime } = await import("../src/companion/runtime");
  const desktop = new CompanionRuntime(false, false);
  desktop.tick(0.02);
  assert.ok(desktop.engine.initialized);
  const engine = desktop.engine,
    position = { ...engine.position };
  desktop.dispose();
  const mobile = new CompanionRuntime(true, false);
  try {
    assert.equal(mobile.engine, engine);
    assert.deepEqual(mobile.engine.position, position);
    mobile.tick(0.02);
    assert.ok(
      Math.hypot(
        mobile.engine.position.x - position.x,
        mobile.engine.position.y - position.y,
      ) <= 7.1,
    );
  } finally {
    mobile.dispose();
  }
});
