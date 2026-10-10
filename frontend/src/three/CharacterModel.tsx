import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, Shape, type Group } from "three";
import { Line } from "@react-three/drei/core/Line";
import type { RefObject } from "react";
function suitTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#d52e3c";
  context.fillRect(0, 0, 512, 256);
  context.strokeStyle = "#41121c";
  context.lineWidth = 2;
  for (let x = 0; x < 512; x += 43) {
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + 13, 85, x - 13, 170, x, 256);
    context.stroke();
  }
  for (let y = 22; y < 256; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x < 512; x += 43) {
      context.quadraticCurveTo(x + 21, y + 16, x + 43, y);
    }
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
function Eye({ mirrored = false }: { mirrored?: boolean }) {
  const shape = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.53, 0.17);
    s.quadraticCurveTo(-0.34, 0.12, -0.075, -0.16);
    s.quadraticCurveTo(-0.16, -0.32, -0.34, -0.3);
    s.quadraticCurveTo(-0.56, -0.25, -0.53, 0.17);
    return s;
  }, []);
  return (
    <group scale={[mirrored ? -1 : 1, 1, 1]}>
      <mesh position={[0, 0, 0.58]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color="#080c15" roughness={0.3} />
      </mesh>
      <mesh position={[-0.03, -0.027, 0.59]} scale={[0.79, 0.72, 1]}>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color="#f1f5f7"
          roughness={0.23}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}
function SpiderEmblem() {
  const paths = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const side = i < 4 ? -1 : 1;
        const n = i % 4;
        return [
          [side * 0.03, 0.02 - n * 0.025, 0.183],
          [side * 0.1, 0.13 - n * 0.065, 0.19],
          [side * 0.16, 0.15 - n * 0.095, 0.175],
        ] as [number, number, number][];
      }),
    [],
  );
  return (
    <group position={[0, -0.02, 0.1]}>
      <mesh scale={[0.045, 0.075, 0.025]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#090b13" />
      </mesh>
      {paths.map((path, i) => (
        <Line key={i} points={path} color="#090b13" lineWidth={1.5} />
      ))}
    </group>
  );
}
export function CharacterModel({
  head,
  torso,
  leftArm,
  rightArm,
  rightForearm,
  leftLeg,
  rightLeg,
}: {
  head: RefObject<Group | null>;
  torso: RefObject<Group | null>;
  leftArm: RefObject<Group | null>;
  rightArm: RefObject<Group | null>;
  rightForearm: RefObject<Group | null>;
  leftLeg: RefObject<Group | null>;
  rightLeg: RefObject<Group | null>;
}) {
  const texture = useMemo(suitTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const red = (
    <meshStandardMaterial map={texture} roughness={0.48} metalness={0.08} />
  );
  const blue = (
    <meshStandardMaterial color="#075991" roughness={0.45} metalness={0.1} />
  );
  return (
    <group>
      <group ref={head} position={[0, 0.57, 0]}>
        <mesh scale={[0.66, 0.65, 0.58]}>
          <sphereGeometry args={[1, 40, 32]} />
          {red}
        </mesh>
        <Eye />
        <Eye mirrored />
        <mesh position={[0, -0.61, 0]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          {red}
        </mesh>
      </group>
      <group ref={torso}>
        <mesh position={[0, -0.22, 0]} scale={[0.3, 0.36, 0.2]}>
          <sphereGeometry args={[1, 24, 20]} />
          {red}
        </mesh>
        <mesh position={[0, -0.51, 0]} scale={[0.29, 0.2, 0.2]}>
          <sphereGeometry args={[1, 24, 16]} />
          {blue}
        </mesh>
        <SpiderEmblem />
      </group>
      {[-1, 1].map((side) => (
        <group
          ref={side < 0 ? leftArm : rightArm}
          key={`arm-${side}`}
          position={[side * 0.27, -0.1, 0]}
          rotation={[0, 0, side * 0.15]}
        >
          <mesh position={[side * 0.05, -0.14, 0]}>
            <capsuleGeometry args={[0.105, 0.2, 4, 12]} />
            {blue}
          </mesh>
          <group
            ref={side > 0 ? rightForearm : undefined}
            position={[side * 0.05, -0.24, 0.01]}
          >
            <mesh
              position={[side * 0.05, -0.12, 0.01]}
              rotation={[0, 0, -side * 0.15]}
            >
              <capsuleGeometry args={[0.09, 0.2, 4, 12]} />
              {red}
            </mesh>
            <mesh
              position={[side * 0.07, -0.27, 0.03]}
              scale={[0.11, 0.115, 0.1]}
            >
              <sphereGeometry args={[1, 16, 12]} />
              {red}
            </mesh>
          </group>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group
          ref={side < 0 ? leftLeg : rightLeg}
          key={`leg-${side}`}
          position={[side * 0.14, -0.57, 0]}
        >
          <mesh position={[side * 0.025, -0.19, 0]}>
            <capsuleGeometry args={[0.12, 0.27, 4, 16]} />
            {blue}
          </mesh>
          <mesh position={[side * 0.04, -0.44, 0.015]}>
            <capsuleGeometry args={[0.095, 0.15, 4, 12]} />
            {red}
          </mesh>
          <mesh
            position={[side * 0.055, -0.57, 0.07]}
            scale={[0.14, 0.085, 0.21]}
          >
            <sphereGeometry args={[1, 20, 12]} />
            {red}
          </mesh>
        </group>
      ))}
    </group>
  );
}
