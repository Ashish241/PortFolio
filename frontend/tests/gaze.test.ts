import test from "node:test";
import assert from "node:assert/strict";
import { Group, Vector3 } from "three";
import { localGaze } from "../src/three/gaze";
test("gaze uses the rendered parent matrix in upright, inverted and sideways poses", () => {
  for (const rotation of [0, 0.2, Math.PI, Math.PI / 2, -Math.PI / 2]) {
    const parent = new Group(),
      root = new Group();
    parent.position.set(2, -1, 0);
    parent.rotation.z = 0.13;
    parent.add(root);
    root.rotation.z = rotation;
    root.scale.setScalar(0.47);
    const gaze = localGaze(root, { x: 0.2, y: 0 }, new Vector3());
    const direction = new Vector3(Math.tan(gaze.yaw), -Math.tan(gaze.pitch), 1);
    direction.transformDirection(root.matrixWorld);
    assert.ok(direction.x > 0, `world-right gaze failed at ${rotation}`);
    assert.ok(Math.abs(gaze.yaw) <= 0.55 && Math.abs(gaze.pitch) <= 0.35);
  }
});
