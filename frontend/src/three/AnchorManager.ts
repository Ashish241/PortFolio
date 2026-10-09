import {
  supportedPosition,
  type Point,
  type Target,
  type AnchorRole,
} from "../companion/engine";
interface Cached {
  target: Target;
  element: HTMLElement;
  source: HTMLElement;
  local: Point;
  doc: Point;
  fixed: boolean;
  shape: { width: number; height: number };
}
interface Box {
  element: HTMLElement;
  left: number;
  right: number;
  top: number;
  bottom: number;
  fixed: boolean;
  portrait: boolean;
}
/** Only painted, hit-tested DOM objects enter the registry. No viewport/margin anchors. */
export class AnchorManager {
  private rects: Cached[] = [];
  private exclusions: Box[] = [];
  private resize: ResizeObserver;
  private mutation: MutationObserver;
  private scheduled = 0;
  private stopped = false;
  private observed = new Set<Element>();
  measurements = 0;
  impacts: { objectId: string; kind: string; intensity: number }[] = [];
  private effects = new Map<HTMLElement, Animation>();
  refresh() {
    this.measure();
  }
  private impact = (event: Event) => {
    const { objectId, velocity, kind } = (
      event as CustomEvent<{ objectId: string; velocity: Point; kind: string }>
    ).detail;
    const a = this.rects.find((a) => a.target.objectId === objectId);
    if (
      !a ||
      a.target.elementType === "navbar" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const intensity =
      kind === "release"
        ? 0.5
        : kind === "tension"
          ? 0.8
          : Math.min(
              3.5,
              Math.max(1.5, Math.hypot(velocity.x, velocity.y) / 100),
            ) * Math.max(0.65, Math.min(1, 240 / a.target.width));
    const sign = Math.sign(velocity.x) || 1;
    this.impacts = [...this.impacts.slice(-7), { objectId, kind, intensity }];
    this.effects.get(a.element)?.cancel();
    const compression = a.element.matches("a,button,.skill-node,.timeline-node")
      ? 1 - intensity * 0.012
      : 1 - intensity * 0.003;
    const animation = a.element.animate?.(
      [
        { transform: "translate(0,0) rotate(0deg) scale(1)" },
        {
          transform: `translate(${kind === "tension" ? sign * intensity : 0}px,${intensity}px) rotate(${sign * intensity * 0.22}deg) scale(1,${compression})`,
          offset: 0.22,
        },
        {
          transform: `translate(0,${-intensity * 0.3}px) rotate(${-sign * intensity * 0.08}deg) scale(1)`,
          offset: 0.55,
        },
        { transform: "translate(0,0) rotate(0deg) scale(1)" },
      ],
      {
        duration: kind === "release" ? 250 : 620,
        easing: "ease-out",
        composite: "add",
      },
    );
    if (animation) {
      this.effects.set(a.element, animation);
      animation.onfinish = () => this.effects.delete(a.element);
    }
  };
  rejected: { id: string; x: number; y: number; reason: string }[] = [];
  private queue = () => {
    if (this.scheduled || this.stopped) return;
    this.scheduled = window.setTimeout(() => {
      this.scheduled = 0;
      this.measure();
    }, 80);
  };
  constructor() {
    window.addEventListener("SPIDEY_OBJECT_IMPACT", this.impact);
    this.resize = new ResizeObserver(this.queue);
    this.resize.observe(document.body);
    this.mutation = new MutationObserver(this.queue);
    this.mutation.observe(document.getElementById("main") ?? document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "open"],
    });
    window.addEventListener("resize", this.queue);
    window.addEventListener("companion-layout", this.queue);
    window.addEventListener("scroll", this.queue, { passive: true });
    document.fonts?.ready.then(this.queue);
    this.measure();
  }
  private fixed(el: HTMLElement) {
    return !!el.closest(
      ".navigation,.companion-controls,.assistant-panel,dialog",
    );
  }
  private painted(el: HTMLElement) {
    for (let node: HTMLElement | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) < 0.1
      )
        return false;
    }
    return true;
  }
  private measure() {
    if (this.stopped) return;
    this.measurements++;
    this.rects = [];
    this.rejected = [];
    const sources = [
      ...document.querySelectorAll<HTMLElement>(
        '.navigation,.portrait-shell img,[data-spidey-source],.featured-project,.project-card,.capability,.timeline-node,.timeline-item,.project-visual,.skill-node,.architecture-node,.contribution-card,.repository-card,.hero-buttons a,.contact-form,h1,h2,h3,.section-divider,svg[data-spidey-object],[data-spider-anchor="shoulder"]',
      ),
    ];
    sources.forEach((source, index) => {
      const shoulder = source.dataset.spiderAnchor === "shoulder",
        el = shoulder
          ? source
              .closest<HTMLElement>(".portrait-shell")
              ?.querySelector<HTMLElement>("img")
          : source;
      if (!el) return;
      const r = el.getBoundingClientRect(),
        s = getComputedStyle(el),
        marker = source.getBoundingClientRect();
      const id = source.dataset.spideyId || source.id || `object-${index}`,
        section = source.closest("section[id]")?.id ?? "home";
      const reject = (reason: string) =>
        this.rejected.push({ id, x: r.left, y: r.top, reason });
      if (
        el.closest(
          "[hidden],.assistant-panel,.companion-controls,dialog,.spider-stage,.spider-fallback",
        )
      )
        return reject("critical or hidden");
      if (
        r.width < 8 ||
        r.height < 3 ||
        s.visibility !== "visible" ||
        s.display === "none" ||
        Number(s.opacity) < 0.1 ||
        !this.painted(el)
      )
        return reject("tiny or transparent");
      if (
        r.bottom < 0 ||
        r.top > innerHeight ||
        r.right < 0 ||
        r.left > innerWidth
      )
        return reject("off screen");
      // Text bounding boxes contain line-height whitespace. Use ink metrics and the first glyph, not the heading centre.
      const text =
        el.matches("h1,h2,h3") || el.dataset.spideySource === "heading";
      const glyphs: { x: number; y: number; kind: string }[] = [];
      if (text) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const letters: { node: Node; index: number }[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          for (let index = 0; index < (node.textContent?.length ?? 0); index++)
            if (/\S/.test(node.textContent![index]))
              letters.push({ node, index });
        }
        // Sample actual glyph ink across the heading, including wrapped lines.
        for (const n of new Set([
          0,
          Math.floor(letters.length / 3),
          Math.floor((letters.length * 2) / 3),
          letters.length - 1,
        ])) {
          const letter = letters[n];
          if (!letter) continue;
          const range = document.createRange();
          range.setStart(letter.node, letter.index);
          range.setEnd(letter.node, letter.index + 1);
          const box = range.getBoundingClientRect(),
            style = getComputedStyle(letter.node.parentElement!);
          const canvas = document.createElement("canvas"),
            ctx = canvas.getContext("2d");
          if (!ctx || !box.width) continue;
          const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          ctx.font = font;
          const character = letter.node.textContent![letter.index],
            metrics = ctx.measureText(character),
            fontSize = parseFloat(style.fontSize);
          const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8,
            descent = metrics.fontBoundingBoxDescent || fontSize * 0.2;
          const baseline = box.top + (box.height * ascent) / (ascent + descent);
          canvas.width = Math.ceil(box.width + 8);
          canvas.height = Math.ceil(ascent + descent + 8);
          ctx.font = font;
          ctx.fillStyle = "#000";
          ctx.fillText(character, 4, ascent + 4);
          const pixels = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          let found = false;
          for (let y = 0; y < canvas.height && !found; y++)
            for (let x = 0; x < canvas.width; x++) {
              if (pixels[(y * canvas.width + x) * 4 + 3] > 180) {
                const point = {
                  x: box.left + x - 4 + 0.5,
                  y: baseline - ascent - 4 + y + 0.5,
                };
                glyphs.push(
                  { ...point, kind: "perch" },
                  { ...point, kind: "web" },
                );
                found = true;
                break;
              }
            }
        }
        if (!glyphs.length) return reject("no measurable glyph ink");
      }
      if (
        !text &&
        !shoulder &&
        !el.matches("img,svg") &&
        (!s.backgroundColor ||
          s.backgroundColor === "transparent" ||
          s.backgroundColor === "rgba(0, 0, 0, 0)") &&
        ![
          s.borderTopWidth,
          s.borderBottomWidth,
          s.borderLeftWidth,
          s.borderRightWidth,
        ].some((w) => parseFloat(w) > 0)
      )
        return reject("no painted surface or border");
      const points = shoulder
        ? [{ x: marker.left, y: marker.top, kind: "perch" }]
        : text
          ? glyphs
          : [
              { x: r.left + r.width / 2, y: r.top + 1, kind: "perch" },
              {
                x: r.right - Math.min(28, r.width * 0.25),
                y: r.bottom - 2,
                kind: "hang",
              },
              { x: r.left + r.width / 2, y: r.bottom - 2, kind: "web" },
              {
                x: r.left + Math.min(28, r.width * 0.25),
                y: r.top + 1,
                kind: "perch",
              },
              {
                x: r.right - Math.min(28, r.width * 0.25),
                y: r.top + 1,
                kind: "perch",
              },
              {
                x: r.right - Math.min(28, r.width * 0.25),
                y: r.top + 2,
                kind: "web",
              },
              {
                x: r.left + Math.min(28, r.width * 0.25),
                y: r.bottom - 2,
                kind: "hang",
              },
              {
                x: r.left + Math.min(28, r.width * 0.25),
                y: r.bottom - 2,
                kind: "web",
              },
            ];
      if (!this.observed.has(el)) {
        this.resize.observe(el);
        this.observed.add(el);
      }
      points.forEach((p, n) => {
        const hit = document
          .elementsFromPoint(p.x, p.y)
          .find(
            (a) =>
              !a.closest(
                ".spider-stage,.spider-react,.spider-fallback,.companion-debug,.companion-anchor-debug",
              ),
          );
        if (
          !hit ||
          !(
            el === hit ||
            el.contains(hit) ||
            (shoulder && el.parentElement?.contains(hit))
          )
        ) {
          reject("attachment occluded or outside object");
          return;
        }
        const roles: AnchorRole[] =
          p.kind === "web"
            ? ["WEB_ANCHOR"]
            : p.kind === "hang"
              ? ["HANG_ANCHOR", "WEB_ANCHOR", "TRAVEL_ANCHOR"]
              : [
                  "PERCH_ANCHOR",
                  "REST_ANCHOR",
                  "TRAVEL_ANCHOR",
                  "INTERACTION_ANCHOR",
                ];
        // Navbar top cannot support a body above the viewport. Its visible bottom remains a web/hanging edge.
        if (el.matches(".navigation") && p.kind === "perch") return;
        const fixed = this.fixed(el),
          attachment = { x: p.x, y: p.y };
        const target: Target = {
          id: `${id}:${n}`,
          objectId: id,
          section,
          elementType: el.matches(".navigation,header")
            ? "navbar"
            : shoulder
              ? "shoulder"
              : text
                ? "heading"
                : "card",
          roles,
          attachment,
          verified: true,
          x: p.x,
          y: p.y,
          poses: p.kind === "hang" ? ["HANG_IDLE"] : ["PERCH"],
          priority: shoulder ? 6 : el.matches(".featured-project") ? 5 : 2,
          visibility: 1,
          mobileEnabled: source.dataset.spideyMobile !== "false",
          offset: { x: 0, y: 0 },
          width: r.width,
          height: r.height,
        };
        this.rects.push({
          target,
          element: el,
          source,
          local: this.localPoint(el, r, { x: p.x, y: p.y }),
          shape: {
            width: el.offsetWidth || r.width,
            height: el.offsetHeight || r.height,
          },
          doc: { x: p.x, y: p.y + (fixed ? 0 : scrollY) },
          fixed,
        });
      });
    });
    for (const el of this.observed)
      if (!sources.some((s) => s === el || s.contains(el))) {
        this.resize.unobserve(el);
        this.observed.delete(el);
      }
    this.exclusions = [
      ...document.querySelectorAll<HTMLElement>(
        "p,li,input,textarea,label,button,a,.navigation,.assistant-panel,.companion-controls,dialog[open],[data-spidey-exclusion]",
      ),
    ]
      .filter(
        (el) =>
          !el.closest(
            "[hidden],.spider-stage,.spider-react,.spider-fallback,.companion-debug",
          ) && el.getClientRects().length,
      )
      .map((el) => {
        const r = el.getBoundingClientRect(),
          fixed = this.fixed(el);
        return {
          element: el,
          left: r.left - 5,
          right: r.right + 5,
          // Keep the label/clickable interior clear, while allowing feet on a real top border.
          top:
            r.top + (fixed ? 0 : scrollY) + (el.matches("button,a") ? 3 : -5),
          bottom: r.bottom + (fixed ? 0 : scrollY) + 5,
          fixed,
          portrait: !!el.closest(".portrait-shell") && !el.matches("a,button"),
        };
      });
  }
  private transform(el: HTMLElement, width: number, height: number) {
    if (typeof DOMMatrix === "undefined") return null;
    const style = getComputedStyle(el),
      matrix = new DOMMatrix(
        style.transform === "none" ? undefined : style.transform,
      );
    const rotate = Number.parseFloat(style.rotate) || 0,
      combined = new DOMMatrix().rotate(rotate).multiply(matrix);
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
    ].map((p) => combined.transformPoint(p));
    return {
      matrix: combined,
      minX: Math.min(...corners.map((p) => p.x)),
      minY: Math.min(...corners.map((p) => p.y)),
    };
  }
  private localPoint(el: HTMLElement, r: DOMRect, p: Point) {
    const t = this.transform(
      el,
      el.offsetWidth || r.width,
      el.offsetHeight || r.height,
    );
    if (!t) return { x: p.x - r.left, y: p.y - r.top };
    const local = t.matrix
      .inverse()
      .transformPoint({ x: p.x - r.left + t.minX, y: p.y - r.top + t.minY });
    return { x: local.x, y: local.y };
  }
  targets(
    width: number,
    height: number,
    mobile: boolean,
    _section: string,
    tracking: string[] = [],
  ): Target[] {
    // Only currently attached/destination objects need live transformed measurements (normally 1–3 objects).
    const live = new Map<HTMLElement, DOMRect>();
    const list = this.rects.map((a) => {
      let p = { x: a.doc.x, y: a.doc.y - (a.fixed ? 0 : scrollY) };
      if (tracking.includes(a.target.id)) {
        let r = live.get(a.element);
        if (!r) {
          r = a.element.getBoundingClientRect();
          live.set(a.element, r);
        }
        if (a.target.elementType === "shoulder") {
          const marker = a.source.getBoundingClientRect();
          p = { x: marker.left, y: marker.top };
        } else {
          const t = this.transform(a.element, a.shape.width, a.shape.height),
            point = t?.matrix.transformPoint(a.local);
          p =
            point && t
              ? { x: r.left + point.x - t.minX, y: r.top + point.y - t.minY }
              : { x: r.left + a.local.x, y: r.top + a.local.y };
        }
      }
      const style = tracking.includes(a.target.id)
        ? getComputedStyle(a.element)
        : null;
      const visible =
        (!style ||
          (this.painted(a.element) &&
            style.display !== "none" &&
            style.visibility === "visible" &&
            Number(style.opacity) > 0.1)) &&
        !a.element.closest("[hidden]") &&
        a.element.isConnected &&
        p.x > 0 &&
        p.x < width &&
        p.y > 0 &&
        p.y < height;
      return {
        ...a.target,
        attachment: p,
        x: p.x,
        y: p.y,
        visibility: visible ? 1 : 0,
      };
    });
    return list.filter((t) => !mobile || t.mobileEnabled);
  }
  navbar(x: number): Target | null {
    const el = [
      ...document.querySelectorAll<HTMLElement>(".navigation,header"),
    ].find((el) => {
      const s = getComputedStyle(el),
        r = el.getBoundingClientRect();
      return (
        ["fixed", "sticky"].includes(s.position) &&
        this.painted(el) &&
        r.bottom > 0 &&
        r.top < innerHeight &&
        r.width > 50
      );
    });
    if (!el) return null;
    const r = el.getBoundingClientRect(),
      point = {
        x: Math.max(r.left + 36, Math.min(r.right - 36, x)),
        y: Math.min(innerHeight - 1, r.bottom - 2),
      };
    const hit = document
      .elementsFromPoint(point.x, point.y)
      .find(
        (e) =>
          !e.closest(
            ".spider-stage,.spider-react,.companion-debug,.companion-anchor-debug",
          ),
      );
    if (!hit || !(el === hit || el.contains(hit))) return null;
    return {
      id: "navbar-scroll",
      objectId: "navbar",
      section: "home",
      elementType: "navbar",
      attachment: point,
      ...point,
      roles: ["WEB_ANCHOR", "HANG_ANCHOR"],
      verified: true,
      visibility: 1,
      mobileEnabled: true,
      priority: 1,
      offset: { x: 0, y: 0 },
      width: r.width,
      height: r.height,
      poses: ["HANG_IDLE"],
    };
  }
  safe(p: Point, mobile = false, shoulder = false) {
    const w = 32,
      h = 55;
    void mobile;
    if (p.x < w || p.x > innerWidth - w || p.y < h || p.y > innerHeight - h)
      return false;
    return !this.exclusions.some((b) => {
      if (shoulder && b.portrait) return false;
      const sy = b.fixed ? 0 : scrollY;
      return (
        p.x + w > b.left &&
        p.x - w < b.right &&
        p.y + h > b.top - sy &&
        p.y - h < b.bottom - sy
      );
    });
  }
  supportValid(t: Target | null, p: Point, mobile: boolean) {
    return (
      !!t &&
      t.verified &&
      t.visibility > 0.25 &&
      Math.hypot(
        p.x - supportedPosition(t, mobile).x,
        p.y - supportedPosition(t, mobile).y,
      ) < 2
    );
  }
  play(t: Target, velocity: Point = { x: 0, y: 150 }, kind = "landing") {
    window.dispatchEvent(
      new window.CustomEvent("SPIDEY_OBJECT_IMPACT", {
        detail: {
          objectId: t.objectId,
          targetId: t.id,
          velocity,
          direction: Math.sign(velocity.x),
          intensity: Math.hypot(velocity.x, velocity.y),
          kind,
        },
      }),
    );
  }
  dispose() {
    this.stopped = true;
    window.removeEventListener("SPIDEY_OBJECT_IMPACT", this.impact);
    this.effects.forEach((effect) => effect.cancel());
    this.effects.clear();
    clearTimeout(this.scheduled);
    this.resize.disconnect();
    this.mutation.disconnect();
    window.removeEventListener("resize", this.queue);
    window.removeEventListener("scroll", this.queue);
    window.removeEventListener("companion-layout", this.queue);
  }
}
