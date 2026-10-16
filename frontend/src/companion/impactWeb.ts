import type { Point } from "./engine";

/** A repeatable, slightly irregular radial web drawn in a single lightweight SVG path. */
export function impactWebPath(spokes = 10, rings = 4): string {
  const radius = 38;
  const position = (spoke: number, ring: number) => {
    const angle = (spoke / spokes) * Math.PI * 2 - Math.PI / 2;
    const variation = 1 + Math.sin(spoke * 7.7 + ring * 3.1) * 0.07;
    const r = radius * (ring / rings) * variation;
    return `${(Math.cos(angle) * r).toFixed(2)} ${(Math.sin(angle) * r).toFixed(2)}`;
  };
  const paths: string[] = [];
  for (let spoke = 0; spoke < spokes; spoke++)
    paths.push(`M 0 0 L ${position(spoke, rings)}`);
  for (let ring = 1; ring <= rings; ring++) {
    paths.push(`M ${position(0, ring)}`);
    for (let spoke = 1; spoke < spokes; spoke++) paths.push(`L ${position(spoke, ring)}`);
    paths.push("Z");
  }
  return paths.join(" ");
}

export class ImpactWeb {
  private static live = new Set<ImpactWeb>();
  readonly element: SVGSVGElement;
  private timer: number | null = null;
  constructor(point: Point, reduced = false) {
    if (ImpactWeb.live.size >= 12) ImpactWeb.live.values().next().value?.dispose();
    ImpactWeb.live.add(this);
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "-46 -46 92 92");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("spidey-impact-web");
    if (reduced) svg.classList.add("reduced");
    const silk = document.createElementNS(ns, "path");
    silk.setAttribute("d", impactWebPath(reduced ? 8 : 10, reduced ? 3 : 4));
    silk.setAttribute("fill", "none");
    silk.setAttribute("stroke", "#e8f2fb");
    silk.setAttribute("stroke-width", "0.8");
    silk.setAttribute("stroke-linecap", "round");
    svg.append(silk);
    const center = document.createElementNS(ns, "circle");
    center.setAttribute("r", "2.2");
    center.setAttribute("fill", "#f8fbff");
    svg.append(center);
    this.element = svg;
    this.move(point);
    document.body.append(svg);
  }
  move(point: Point) {
    this.element.style.left = `${point.x}px`;
    this.element.style.top = `${point.y}px`;
  }
  release() {
    if (!this.element.isConnected || this.timer !== null) return;
    this.element.classList.add("releasing");
    this.timer = window.setTimeout(() => this.dispose(), 260);
  }
  dispose() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.element.remove();
    ImpactWeb.live.delete(this);
  }
}
