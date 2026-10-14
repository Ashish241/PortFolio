import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  type Vector3,
} from "three";
import { WEB_FLOATS, writeBraidedWeb } from "./webGeometry";
export function WebLineController({
  start,
  end,
  visible,
  extension,
  mobile,
  update,
}: {
  start: Vector3;
  end: Vector3;
  visible: { current: boolean };
  extension: { current: number };
  mobile: boolean;
  update: React.RefObject<((dt: number) => void) | null>;
}) {
  const object = useMemo(
    () =>
      new LineSegments(
        new BufferGeometry().setAttribute(
          "position",
          new BufferAttribute(new Float32Array(WEB_FLOATS), 3),
        ),
        new LineBasicMaterial({
          color: "#dae8f4",
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      ),
    [],
  );
  const opacity = useRef(0);
  const last = useRef<number[]>([]);
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
      opacity.current +=
        (Number(visible.current) * 0.72 - opacity.current) *
        (1 - Math.exp(-delta * 8));
      object.material.opacity = opacity.current;
      object.visible = opacity.current > 0.01;
      if (visible.current) {
        const values = [start.x, start.y, start.z, end.x, end.y, end.z, extension.current, Number(mobile)];
        if (values.some((value, index) => Math.abs(value - (last.current[index] ?? Infinity)) > 0.0005)) {
          const p = object.geometry.attributes.position as BufferAttribute;
          const count = writeBraidedWeb(p.array as Float32Array, start, end, extension.current, mobile);
          object.geometry.setDrawRange(0, count);
          p.needsUpdate = true;
          last.current = values;
        }
      }
    };
    return () => {
      update.current = null;
    };
  }, [object, start, end, visible, extension, mobile, update]);
  return <primitive object={object} dispose={null} />;
}
