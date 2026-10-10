import { useEffect, useRef } from "react";
import { shoulderPosition } from "../companion/portrait";
/** Anatomical left is the right side of the supplied photo as viewed on screen. */
export function ProfileShoulderAnchor() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = marker.current,
      image = el?.parentElement?.querySelector("img");
    if (!el || !image) return;
    const update = () => {
      if (!image.naturalWidth || !image.clientWidth || !image.clientHeight)
        return;
      const w = image.clientWidth,
        h = image.clientHeight;
      const pos = getComputedStyle(image)
        .objectPosition.split(" ")
        .map((x) => parseFloat(x) / 100);
      const { x, y } = shoulderPosition(
        w,
        h,
        image.naturalWidth,
        image.naturalHeight,
        [
          Number.isFinite(pos[0]) ? pos[0] : 0.5,
          Number.isFinite(pos[1]) ? pos[1] : 0.35,
        ],
      );
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      window.dispatchEvent(new Event("companion-layout"));
    };
    const observer = new ResizeObserver(update);
    observer.observe(image);
    image.addEventListener("load", update);
    update();
    return () => {
      observer.disconnect();
      image.removeEventListener("load", update);
    };
  }, []);
  return (
    <span
      ref={marker}
      id="profile-left-shoulder-anchor"
      className="shoulder-anchor"
      data-spider-anchor="shoulder"
      data-spidey-id="profile-left-shoulder-anchor"
      data-spidey-poses="SHOULDER_PERCH"
      data-spidey-priority="10"
      aria-hidden="true"
    />
  );
}
