import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { SpiderController } from "./SpiderController";
export default function SpiderScene({ onOpen }: { onOpen: () => void }) {
  const [intro, setIntro] = useState(false);
  const bubble = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <>
      <div className="spider-stage" aria-hidden="true">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 100, near: 0.1, far: 30 }}
          dpr={[1, matchMedia("(max-width: 900px)").matches ? 1.25 : 1.5]}
          frameloop={visible ? "always" : "never"}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          onCreated={({ gl }) => gl.setClearColor("#000000", 0)}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[3, 4, 6]} intensity={3} />
          <pointLight position={[-3, 0, 4]} color="#56b8ff" intensity={8} />
          <pointLight position={[3, -2, 4]} color="#ff5364" intensity={5} />
          <SpiderController
            button={button}
            onIntro={setIntro}
            bubble={bubble}
          />
        </Canvas>
      </div>
      {intro && (
        <aside ref={bubble} className="spidey-intro" role="status">
          Hey! I'm Spidey 👋 Your AI guide. Click me!
          <button
            onClick={() => {
              sessionStorage.setItem("spidey-intro", "true");
              setIntro(false);
            }}
          >
            Got it · Skip intro
          </button>
        </aside>
      )}
      <button
        tabIndex={-1}
        className="spider-react"
        ref={button}
        onClick={() => {
          onOpen();
        }}
        aria-label="Ask Spidey about Ashish’s career"
      >
        Spidey!
      </button>
    </>
  );
}
