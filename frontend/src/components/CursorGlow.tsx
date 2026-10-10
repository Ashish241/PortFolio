import { useEffect, useRef } from "react";
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
          ref.current.style.opacity = "1";
        }
      });
    };
    const hide = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hide);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
    };
  }, []);
  return <div className="cursor-glow" ref={ref} aria-hidden="true" />;
}
