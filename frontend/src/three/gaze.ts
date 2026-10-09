import { MathUtils, Object3D, Vector3 } from "three";
/** Screen-plane offsets become a world target, then pass through the rendered rig's inverse matrix. */
export function localGaze(
  root: Object3D,
  offset: { x: number; y: number },
  scratch: Vector3,
) {
  root.updateWorldMatrix(true, false);
  root.getWorldPosition(scratch);
  scratch.x += offset.x * 2.8;
  scratch.y -= offset.y * 3.4;
  scratch.z += 3;
  root.worldToLocal(scratch);
  return {
    yaw: MathUtils.clamp(Math.atan2(scratch.x, scratch.z), -0.55, 0.55),
    pitch: MathUtils.clamp(-Math.atan2(scratch.y, scratch.z), -0.35, 0.35),
  };
}
