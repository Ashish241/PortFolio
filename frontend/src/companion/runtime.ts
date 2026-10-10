import { AnchorManager } from "../three/AnchorManager";
import { CompanionEngine, type MotionInput } from "./engine";
import { companionEvents, NAV_ITEMS } from "./events";
// Renderer changes reuse motion state; resize never becomes a visible relocation.
let rememberedEngine: CompanionEngine | null = null;
export class CompanionRuntime {
  anchors = new AnchorManager();
  engine =
    rememberedEngine ??
    new CompanionEngine(window.innerWidth, window.innerHeight);
  private cursor = { x: window.innerWidth / 2, y: 160 };
  private cursorAt = -10;
  private scrollAt = -10;
  private scrollY = window.scrollY;
  private scrollVelocity = 0;
  private scrollTime = performance.now() / 1000;
  private section = "home";
  private lastSectionCheck = -1;
  private wasScrolling = false;
  private releaseRuntime = companionEvents.registerRuntime();
  private observer: IntersectionObserver;
  private unsubscribe: () => void;
  private lastDebug = 0;
  private debug: HTMLElement | null = null;
  private replayButton: HTMLButtonElement | null = null;
  private shoulderUsed = false;
  private pointer = (e: PointerEvent) => {
    if (e.pointerType === "mouse") {
      this.cursor = { x: e.clientX, y: e.clientY };
      this.cursorAt = performance.now() / 1000;
    }
  };
  private scroll = () => {
    const now = performance.now() / 1000,
      dy = window.scrollY - this.scrollY;
    this.scrollVelocity = dy / Math.max(0.016, now - this.scrollTime);
    this.scrollY = window.scrollY;
    this.scrollTime = this.scrollAt = now;
  };
  private click = (e: MouseEvent) => {
    const link = (e.target as Element)?.closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    if (link)
      companionEvents.emit({
        type: "USER_NAVIGATE",
        section: link.hash.slice(1),
      });
  };
  private hover = (e: PointerEvent) => {
    if (
      (e.target as Element)?.closest(
        ".hero-buttons,.project-card,.featured-project",
      )
    )
      companionEvents.emit({ type: "CTA_HOVER" });
  };
  constructor(
    private mobile = false,
    private reduced = false,
  ) {
    this.engine.introDone ||= sessionStorage.getItem("spidey-intro") === "true";
    if (!mobile && !reduced)
      window.addEventListener("pointermove", this.pointer, { passive: true });
    window.addEventListener("scroll", this.scroll, { passive: true });
    document.addEventListener("click", this.click);
    document.addEventListener("pointerover", this.hover, { passive: true });
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting && this.section !== entry.target.id) {
            this.section = entry.target.id;
            companionEvents.emit({
              type: "SECTION_ENTER",
              section: this.section,
            });
          }
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    NAV_ITEMS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) this.observer.observe(el);
    });
    this.unsubscribe = companionEvents.subscribe((e) => {
      if (e.type === "SPIDEY_CLICK" || e.type === "CTA_HOVER")
        this.engine.userAction(performance.now() / 1000);
      if (e.type === "USER_NAVIGATE") {
        this.section = e.section ?? this.section;
        this.engine.navigate(this.section);
      }
      if (e.type.startsWith("AI_"))
        window.dispatchEvent(new Event("companion-layout"));
    });
    if (
      import.meta.env?.DEV &&
      new URLSearchParams(location.search).has("spideyDebug")
    ) {
      this.debug = document.createElement("pre");
      this.debug.className = "companion-debug";
      this.debug.setAttribute("aria-hidden", "true");
      document.body.append(this.debug);
      this.replayButton = document.createElement("button");
      this.replayButton.textContent = "Preview wave";
      this.replayButton.style.cssText =
        "position:fixed;right:12px;top:220px;z-index:110;font-size:11px;padding:6px;background:#12233a;color:white;border:1px solid #49617e;border-radius:6px";
      this.replayButton.onclick = () => {
        sessionStorage.removeItem("spidey-intro");
        this.engine.previewIntroduction();
      };
      document.body.append(this.replayButton);
    }
  }
  tick(dt: number) {
    const now = performance.now() / 1000;
    const scrolling = now - this.scrollAt < 0.2;
    if (
      now - this.lastSectionCheck > 0.25 ||
      (this.wasScrolling && !scrolling)
    ) {
      this.lastSectionCheck = now;
      const sections = NAV_ITEMS.map(([id]) => document.getElementById(id))
        .filter((el): el is HTMLElement => !!el)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            id: el.id,
            area: Math.max(
              0,
              Math.min(innerHeight, r.bottom) - Math.max(80, r.top),
            ),
          };
        });
      sections.sort((a, b) => b.area - a.area);
      if (sections[0]?.area) this.section = sections[0].id;
    }
    if (this.wasScrolling && !scrolling) this.anchors.refresh();
    this.wasScrolling = scrolling;
    const input: MotionInput = {
      width: window.innerWidth,
      height: window.innerHeight,
      now,
      section: this.section,
      scrolling: now - this.scrollAt < 0.2,
      scrollVelocity: now - this.scrollAt < 0.2 ? this.scrollVelocity : 0,
      cursor: this.cursor,
      cursorActive: !this.mobile && now - this.cursorAt < 0.13,
      ai: companionEvents.ai,
      targets: this.anchors.targets(
        window.innerWidth,
        window.innerHeight,
        this.mobile,
        this.section,
        [
          this.engine.supportAnchor?.id,
          this.engine.activeWebAnchor?.id,
          this.engine.route?.target.id,
        ].filter((id): id is string => !!id),
      ),
      navbar: this.anchors.navbar(
        this.engine.activeWebAnchor?.id === "navbar-scroll"
          ? this.engine.activeWebAnchor.x
          : this.engine.position.x,
      ),
      mobile: this.mobile,
      reduced: this.reduced,
      shoulderUsed: this.shoulderUsed,
      safe: (p, shoulder) => this.anchors.safe(p, this.mobile, shoulder),
    };
    if (input.navbar) input.targets.push(input.navbar);
    const before = { ...this.engine.position },
      oldWeb =
        this.engine.web.extension === 1 ? this.engine.activeWebAnchor : null,
      oldSupport = this.engine.supportAnchor?.id,
      initialized = this.engine.initialized;
    this.engine.tick(dt, input);
    const newWeb =
      this.engine.web.extension === 1 ? this.engine.activeWebAnchor : null;
    if (newWeb?.id !== oldWeb?.id) {
      if (oldWeb) this.anchors.play(oldWeb, this.engine.velocity, "release");
      if (newWeb)
        this.anchors.play(
          newWeb,
          {
            x: this.engine.position.x - newWeb.x,
            y: this.engine.position.y - newWeb.y,
          },
          "tension",
        );
    }
    if (this.engine.introDone) sessionStorage.setItem("spidey-intro", "true");
    companionEvents.safeForAssistant(
      (this.engine.suspended && this.engine.web.extension === 1) ||
        !this.engine.initialized ||
        (!!this.engine.supportAnchor && !this.engine.route),
    );
    if (
      this.engine.supportAnchor &&
      this.engine.supportAnchor.id !== oldSupport
    )
      this.anchors.play(this.engine.supportAnchor, this.engine.impact);
    if (
      import.meta.env?.DEV &&
      initialized &&
      Math.hypot(
        this.engine.position.x - before.x,
        this.engine.position.y - before.y,
      ) >
        660 * Math.min(dt, 0.04) + 2
    )
      console.error("Potential Spider-Man teleport detected.");
    if (
      import.meta.env?.DEV &&
      [
        "PERCHED",
        "HANGING",
        "PAUSED_FOR_CURSOR",
        "AI_LISTENING",
        "AI_THINKING",
        "AI_RESPONSE",
      ].includes(this.engine.state)
    )
      console.assert(
        this.anchors.supportValid(
          this.engine.supportAnchor,
          this.engine.position,
          this.mobile,
        ),
        "Spider-Man cannot rest without support.",
      );
    if (
      import.meta.env?.DEV &&
      (this.engine.suspended ||
        this.engine.state === "SWINGING" ||
        this.engine.state === "WEB_PULL")
    )
      console.assert(
        this.engine.web.visible && !!this.engine.activeWebAnchor,
        "Spider-Man cannot hang without an attached visible web.",
      );
    if (this.engine.shoulderDone && !this.shoulderUsed) {
      this.shoulderUsed = true;
      sessionStorage.setItem("spidey-shoulder-visited", "true");
    }
    const visible = this.engine.initialized;
    if (import.meta.env?.DEV && this.debug && now - this.lastDebug > 0.2) {
      this.lastDebug = now;
      document
        .querySelectorAll(".companion-anchor-debug")
        .forEach((e) => e.remove());
      for (const t of [
        ...input.targets.map((t) => ({
          id: t.id,
          x: t.attachment.x,
          y: t.attachment.y,
          color:
            t.id === this.engine.navigationTarget?.id ? "#ffe35a" : "#6fffa1",
        })),
        ...this.anchors.rejected.map((t) => ({ ...t, color: "#ff6678" })),
      ]) {
        const dot = document.createElement("i");
        dot.className = "companion-anchor-debug";
        dot.title = t.id;
        dot.style.cssText = `position:fixed;pointer-events:none;z-index:1000;width:6px;height:6px;border-radius:50%;background:${t.color};left:${t.x}px;top:${t.y}px`;
        document.body.append(dot);
      }
      this.debug.textContent = JSON.stringify(
        {
          section: this.section,
          chat: input.ai,
          transitions: this.engine.transitions,
          webLength: this.engine.web.visible
            ? Math.hypot(
                this.engine.web.anchor.x - this.engine.position.x,
                this.engine.web.anchor.y - this.engine.position.y,
              )
            : 0,
          impactEvents: this.anchors.impacts,
          coverage: input.targets
            .filter((t) => t.visibility > 0.25)
            .reduce<Record<string, number>>((r, t) => {
              const key = this.engine.region(input, t);
              r[key] = (r[key] ?? 0) + 1;
              return r;
            }, {}),
          state: this.engine.state,
          region: this.engine.region(input),
          recentRegions: this.engine.recentRegions,
          screenPosition: this.engine.position,
          worldPosition: {
            x: (this.engine.position.x - input.width / 2) / 100,
            y: (input.height / 2 - this.engine.position.y) / 100,
          },
          animation: this.engine.route?.pose ?? this.engine.idleAction,
          hitboxActive: visible,
          scrolling: input.scrolling,
          support: this.engine.supportAnchor?.id,
          supportValidity: this.anchors.supportValid(
            this.engine.supportAnchor,
            this.engine.position,
            this.mobile,
          ),
          webAnchor: this.engine.activeWebAnchor?.id,
          webValidity:
            !this.engine.web.visible || !!this.engine.activeWebAnchor?.verified,
          routeSteps: [
            this.engine.route?.steps,
            ...this.engine.remainingRoute.map((leg) => leg.steps),
          ],
          cursorInterruption: this.engine.safeStop,
          rejected: this.anchors.rejected
            .filter((t) => t.reason !== "off screen")
            .slice(0, 12),
          target: this.engine.navigationTarget?.id,
          progress: +this.engine.animationProgress.toFixed(2),
          anchors: input.targets
            .filter((t) => t.visibility)
            .map((t) => ({ id: t.id, x: Math.round(t.x), y: Math.round(t.y) })),
          web: this.engine.web,
          scrollVelocity: Math.round(input.scrollVelocity),
          cursor: input.cursorActive,
          queue: this.engine.recent,
          measurements: this.anchors.measurements,
        },
        null,
        2,
      );
    }
    return { engine: this.engine, visible };
  }
  dispose() {
    rememberedEngine = this.engine;
    this.unsubscribe();
    this.releaseRuntime();
    this.observer.disconnect();
    this.anchors.dispose();
    this.debug?.remove();
    this.replayButton?.remove();
    document
      .querySelectorAll(".companion-anchor-debug")
      .forEach((e) => e.remove());
    window.removeEventListener("pointermove", this.pointer);
    window.removeEventListener("scroll", this.scroll);
    document.removeEventListener("click", this.click);
    document.removeEventListener("pointerover", this.hover);
  }
}
