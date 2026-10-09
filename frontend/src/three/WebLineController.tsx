import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  type Vector3,
} from "three";
export function WebLineController({
  start,
  end,
  visible,
  extension,
  update,
}: {
  start: Vector3;
  end: Vector3;
  visible: { current: boolean };
  extension: { current: number };
  update: React.RefObject<((dt: number) => void) | null>;
}) {
  const object = useMemo(
    () =>
      new Line(
        new BufferGeometry().setAttribute(
          "position",
          new Float32BufferAttribute(new Float32Array(9), 3),
        ),
        new LineBasicMaterial({
          color: "#ccdcee",
          transparent: true,
          opacity: 0.6,
        }),
      ),
    [],
  );
  const opacity = useRef(0);
  object.frustumCulled = false;
  useEffect(
    () => () => {
      object.geometry.dispose();
      object.material.dispose();
    },
    [object],
  );
  useEffect(() => {
    update.current = (delta) => {
      object.visible = visible.current;
      opacity.current +=
        (Number(visible.current) * 0.65 - opacity.current) *
        (1 - Math.exp(-delta * 8));
      object.material.opacity = opacity.current;
      const p = object.geometry.attributes.position;
      p.setXYZ(0, start.x, start.y, 0.05);
      const x = start.x + (end.x - start.x) * extension.current;
      const y = start.y + (end.y - start.y) * extension.current;
      p.setXYZ(1, (start.x + x) / 2, (start.y + y) / 2 - 0.025, 0.05);
      p.setXYZ(2, x, y, 0.05);
      p.needsUpdate = true;
    };
    return () => {
      update.current = null;
    };
  }, [object, start, end, visible, extension, update]);
  return <primitive object={object} dispose={null} />;
}
