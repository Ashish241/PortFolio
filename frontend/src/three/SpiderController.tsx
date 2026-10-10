import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3, MathUtils } from "three";
import { useMedia } from "../hooks/useMedia";
import { localGaze } from "./gaze";
import { CompanionRuntime } from "../companion/runtime";
import { CharacterModel } from "./CharacterModel";
import { WebLineController } from "./WebLineController";
export function SpiderController({
  button,
  onIntro,
  bubble,
}: {
  button: React.RefObject<HTMLButtonElement | null>;
  onIntro: (show: boolean) => void;
  bubble: React.RefObject<HTMLElement | null>;
}) {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const mobile = useMedia("(pointer: coarse)");
  const root = useRef<Group>(null),
    head = useRef<Group>(null),
    torso = useRef<Group>(null);
  const leftArm = useRef<Group>(null),
    rightArm = useRef<Group>(null),
    rightForearm = useRef<Group>(null),
    leftLeg = useRef<Group>(null),
    rightLeg = useRef<Group>(null);
  const runtime = useRef<CompanionRuntime | null>(null);
  const webUpdate = useRef<((dt: number) => void) | null>(null);
  const web = useMemo(
    () => ({
      start: new Vector3(),
      end: new Vector3(),
      visible: { current: false },
      extension: { current: 0 },
    }),
    [],
  );
  const attachment = useMemo(() => new Vector3(), []);
  const localLook = useMemo(() => new Vector3(), []);
  const introWasVisible = useRef(false);
  const { size, viewport } = useThree();
  useEffect(() => {
    runtime.current = new CompanionRuntime(mobile, reduced);
    return () => {
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, [mobile, reduced]);
  useFrame((_, rawDelta) => {
    if (!root.current || !runtime.current) return;
    const dt = Math.min(rawDelta, 0.04),
      { engine: e, visible } = runtime.current.tick(dt);
    const mapX = (x: number) => (x / size.width - 0.5) * viewport.width;
    const mapY = (y: number) => (0.5 - y / size.height) * viewport.height;
    root.current.visible = visible;
    root.current.position.set(mapX(e.position.x), mapY(e.position.y), 0);
    root.current.scale.setScalar((viewport.height / size.height) * 47);
    root.current.rotation.z = MathUtils.damp(
      root.current.rotation.z,
      e.rotation,
      10,
      dt,
    );
    const intro =
      e.state === "INTRO_WAVING" && !sessionStorage.getItem("spidey-intro");
    if (intro !== introWasVisible.current) {
      if (introWasVisible.current && !intro) sessionStorage.setItem("spidey-intro", "true");
      onIntro(intro);
      introWasVisible.current = intro;
    }
    const flip =
      e.route?.pose === "FLIP_FORWARD" || e.route?.pose === "FLIP_BACKWARD";
    const flipProgress = e.route
      ? (e.route.index - 1) / Math.max(1, e.route.path.length - 1)
      : 0;
    root.current.rotation.x = flip
      ? flipProgress *
        Math.PI *
        2 *
        (e.route?.pose === "FLIP_BACKWARD" ? -1 : 1)
      : 0;
    // Transform a camera-plane target through the actual rendered parent hierarchy.
    const resting =
      !reduced &&
      !!e.supportAnchor &&
      !e.route &&
      e.safeStop === "NONE" &&
      !intro;
    const { yaw, pitch } = localGaze(root.current, e.look, localLook);
    if (head.current) {
      head.current.rotation.y =
        resting && e.idleAction === "LOOK_AROUND"
          ? Math.sin(e.idleTime * 1.2) * 0.3
          : yaw;
      head.current.rotation.x =
        resting && e.idleAction === "INSPECT" ? 0.3 : pitch;
      head.current.rotation.z =
        intro && !reduced
          ? Math.sin(e.idleTime * 2) * 0.08
          : resting && e.idleAction === "HEAD_TILT"
            ? 0.18
            : 0;
    }
    if (torso.current) {
      torso.current.rotation.y = yaw * 0.25;
      torso.current.rotation.x = pitch * 0.2;
      torso.current.rotation.z =
        resting && e.idleAction === "DODGE"
          ? Math.sin(e.idleTime * 2) * 0.15
          : 0;
    }
    const travel = [
      "SWINGING",
      "WEB_PULL",
      "NAVIGATING",
      "RAPPELLING",
      "ROPE_SLIDING",
    ].includes(e.state);
    const thinking = e.state === "AI_THINKING",
      listening = e.state === "AI_LISTENING",
      wave =
        intro ||
        (resting &&
          !e.suspended &&
          e.idleAction === "WAVE" &&
          e.idleTime - e.landedAt < 3.2);
    const crouch = flip ? Math.sin(flipProgress * Math.PI) * 0.8 : e.crouch;
    const slide = e.state === "ROPE_SLIDING";
    const crawl = e.state === "CRAWLING";
    const stride = crawl ? Math.sin(e.idleTime * 9) * 0.18 : 0;
    if (leftArm.current)
      leftArm.current.rotation.z = MathUtils.damp(
        leftArm.current.rotation.z,
        e.activeWebAnchor && !e.suspended
          ? Math.atan2(
              -(e.web.anchor.y - e.position.y),
              e.web.anchor.x - e.position.x,
            ) +
              Math.PI / 2 -
              e.rotation
          : resting && e.idleAction === "CELEBRATE"
            ? -2.5
            : thinking
              ? -1.9
              : listening
                ? -0.45
                : -0.2 - crouch * 0.5 + stride,
        9,
        dt,
      );
    if (rightArm.current)
      rightArm.current.rotation.z = MathUtils.damp(
        rightArm.current.rotation.z,
        resting && e.idleAction === "CELEBRATE"
          ? 2.5
          : slide
            ? -2.4
            : wave
              ? 2.0
              : travel
                ? 0.9
                : thinking
                  ? 0.7
                  : 0.2 - stride,
        9,
        dt,
      );
    if (rightArm.current)
      rightArm.current.position.z = MathUtils.damp(
        rightArm.current.position.z,
        wave ? 0.25 : 0,
        9,
        dt,
      );
    if (rightForearm.current)
      rightForearm.current.rotation.z = MathUtils.damp(
        rightForearm.current.rotation.z,
        wave
          ? -0.3 +
              (reduced
                ? 0
                : Math.sin((e.idleTime - e.landedAt) * Math.PI * 2) * 0.12)
          : 0,
        9,
        dt,
      );
    if (bubble.current && intro) {
      const width = bubble.current.offsetWidth || 210,
        height = bubble.current.offsetHeight || 82;
      const x =
        e.position.x + 65 + width < size.width - 12
          ? e.position.x + 65
          : e.position.x - width - 65;
      bubble.current.style.transform = `translate3d(${Math.max(12, Math.min(size.width - width - 12, x))}px,${Math.max(82, Math.min(size.height - height - 75, e.position.y - 125))}px,0)`;
    }
    if (leftLeg.current)
      leftLeg.current.rotation.x = MathUtils.damp(
        leftLeg.current.rotation.x,
        -crouch * 1.4 + (slide ? 0.9 : crawl ? stride : travel ? 0.3 : 0),
        9,
        dt,
      );
    if (rightLeg.current)
      rightLeg.current.rotation.x = MathUtils.damp(
        rightLeg.current.rotation.x,
        -crouch * 1.4 - (slide ? 0.6 : crawl ? stride : travel ? 0.3 : 0),
        9,
        dt,
      );
    root.current.updateWorldMatrix(true, true);
    if (e.suspended) {
      attachment.set(0, -1.13, 0.03);
      root.current.localToWorld(attachment);
    } else if (leftArm.current) {
      attachment.set(-0.12, -0.5, 0.04);
      leftArm.current.localToWorld(attachment);
    } else attachment.copy(root.current.position);
    // Start is the hand. The line extends toward the cached web attachment.
    web.start.copy(attachment);
    web.end.set(mapX(e.web.anchor.x), mapY(e.web.anchor.y), 0.05);
    web.visible.current = e.web.visible && visible;
    web.extension.current = e.web.extension;
    webUpdate.current?.(dt);
    if (button.current) {
      // Rotate the hit target with the rendered body, including inverted and sideways poses.
      button.current.style.transformOrigin = "48px 76px";
      button.current.style.transform = `translate3d(${e.position.x - 48}px,${e.position.y - 76}px,0) rotate(${-root.current.rotation.z}rad)`;
      button.current.style.opacity = visible ? "1" : "0";
      button.current.style.pointerEvents = visible ? "auto" : "none";
      button.current.tabIndex = visible ? 0 : -1;
      if (button.current.dataset.state !== e.state)
        button.current.dataset.state = e.state;
    }
  });
  return (
    <>
      <WebLineController {...web} update={webUpdate} />
      <group ref={root} visible={false}>
        <CharacterModel
          head={head}
          torso={torso}
          leftArm={leftArm}
          rightArm={rightArm}
          rightForearm={rightForearm}
          leftLeg={leftLeg}
          rightLeg={rightLeg}
        />
      </group>
    </>
  );
}
