import type { Vector3 } from "three";

const SEGMENTS = 28;
const MAX_STRANDS = 3;
const LINKS = 5;
export const WEB_FLOATS = (MAX_STRANDS * SEGMENTS + LINKS * 2) * 6;

/** Writes the silk into a stable line-segment buffer; returns the active vertex count. */
export function writeBraidedWeb(
  buffer: Float32Array,
  start: Pick<Vector3, "x" | "y" | "z">,
  end: Pick<Vector3, "x" | "y" | "z">,
  extension: number,
  mobile: boolean,
): number {
  const strands = mobile ? 2 : 3;
  const tip = {
    x: start.x + (end.x - start.x) * Math.max(0, Math.min(1, extension)),
    y: start.y + (end.y - start.y) * Math.max(0, Math.min(1, extension)),
    z: start.z + (end.z - start.z) * Math.max(0, Math.min(1, extension)),
  };
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.005) return 0;
  const nx = -dy / length;
  const ny = dx / length;
  const amplitude = Math.min(0.018, length * 0.035);
  let cursor = 0;
  const writePoint = (strand: number, u: number) => {
    const phase = strand * (Math.PI * 2 / strands);
    const weave = Math.sin(u * Math.PI * 7 + phase) * amplitude;
    const irregular = Math.sin(u * Math.PI * 13 + phase * 0.7) * amplitude * 0.18;
    const envelope = Math.sin(Math.PI * u) * 0.7 + 0.3;
    const sag = Math.sin(Math.PI * u) * Math.min(0.028, length * 0.025);
    buffer[cursor++] = start.x + dx * u + nx * (weave + irregular) * envelope;
    buffer[cursor++] = start.y + dy * u + ny * (weave + irregular) * envelope - sag;
    buffer[cursor++] = start.z + (tip.z - start.z) * u + Math.cos(u * Math.PI * 7 + phase) * amplitude * 0.45;
  };
  for (let strand = 0; strand < strands; strand++)
    for (let segment = 0; segment < SEGMENTS; segment++) {
      writePoint(strand, segment / SEGMENTS);
      writePoint(strand, (segment + 1) / SEGMENTS);
    }
  for (let link = 1; link <= LINKS; link++) {
    const u = link / (LINKS + 1);
    writePoint(0, u);
    writePoint(1, u);
    if (strands === 3) {
      writePoint(1, u);
      writePoint(2, u);
    }
  }
  return cursor / 3;
}
