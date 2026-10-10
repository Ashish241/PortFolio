import { useEffect, useRef } from "react";
import { CompanionRuntime } from "../companion/runtime";
import { companionEvents } from "../companion/events";
export function SpiderFallback({
  onOpen,
  reduced = false,
  label = "Ask Spidey about Ashish’s career",
}: {
  onOpen: () => void;
  reduced?: boolean;
  label?: string;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const webLine = useRef<SVGLineElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const runtime = new CompanionRuntime(true, reduced);
    let raf = 0,
      last = performance.now();
    const draw = (now: number) => {
      if (!document.hidden && button.current) {
        const { engine: e, visible } = runtime.tick((now - last) / 1000);
        button.current.style.transform = `translate3d(${e.position.x - 23}px,${e.position.y - 35}px,0) rotate(${e.rotation}rad)`;
        button.current.style.opacity = visible ? "1" : "0";
        button.current.style.pointerEvents = visible ? "auto" : "none";
        button.current.tabIndex = visible ? 0 : -1;
        button.current.dataset.state = e.state;
        if (webLine.current) {
          const start = {
            x: e.position.x + (e.suspended ? 0 : -7),
            y: e.position.y + (e.suspended ? -34 : 20),
          };
          webLine.current.setAttribute("x1", String(start.x));
          webLine.current.setAttribute("y1", String(start.y));
          webLine.current.setAttribute(
            "x2",
            String(start.x + (e.web.anchor.x - start.x) * e.web.extension),
          );
          webLine.current.setAttribute(
            "y2",
            String(start.y + (e.web.anchor.y - start.y) * e.web.extension),
          );
          webLine.current.style.opacity = e.web.visible && visible ? "1" : "0";
        }
      }
      last = now;
      if (
        !document.hidden &&
        (!reduced ||
          (runtime.engine.initialized &&
            (runtime.engine.route || !runtime.engine.supportAnchor)))
      )
        raf = requestAnimationFrame(draw);
    };
    const redraw = () => {
      cancelAnimationFrame(raf);
      draw(performance.now());
    };
    const unsubscribe = reduced ? companionEvents.subscribe(redraw) : () => {};
    document.addEventListener("visibilitychange", redraw);
    if (reduced) {
      window.addEventListener("scroll", redraw, { passive: true });
      window.addEventListener("resize", redraw);
      window.addEventListener("companion-layout", redraw);
    }
    draw(performance.now());
    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      document.removeEventListener("visibilitychange", redraw);
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
      window.removeEventListener("companion-layout", redraw);
      runtime.dispose();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reduced]);
  return (
    <>
      <svg
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 60,
        }}
      >
        <line ref={webLine} stroke="#d8e4ef" strokeWidth="1.3" />
      </svg>
      <button
        ref={button}
        className="spider-fallback"
        tabIndex={-1}
        aria-label={label}
        onClick={() => {
          onOpen();
        }}
      >
        <svg viewBox="0 0 100 125" aria-hidden="true">
          <ellipse
            cx="50"
            cy="53"
            rx="27"
            ry="26"
            fill="#d73948"
            stroke="#111722"
            strokeWidth="2"
          />
          <path
            d="M26 42Q39 43 47 60Q30 68 26 42M74 42Q61 43 53 60Q70 68 74 42"
            fill="white"
            stroke="#10141e"
            strokeWidth="4"
          />
          <path
            d="M50 28V77M28 40Q50 49 72 40M25 55Q50 65 75 55M31 68Q50 74 69 68"
            fill="none"
            stroke="#20222b"
            strokeWidth="1"
          />
          <path
            d="M37 77L31 100L41 103L44 92L46 112L36 120L48 123L52 109L57 123L70 119L59 111L58 92L65 102L74 98L62 77Z"
            fill="#14508a"
            stroke="#141a24"
            strokeWidth="2"
          />
          <path d="M38 77H62L59 94Q50 99 42 94Z" fill="#d73948" />
        </svg>
      </button>
    </>
  );
}
