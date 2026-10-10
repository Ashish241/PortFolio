import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowUp } from "./components/icons";
import { Navigation } from "./components/Navigation";
import { Hero } from "./sections/Hero";
import { About } from "./sections/About";
import { Projects } from "./sections/Projects";
import { Experience } from "./sections/Experience";
import { Skills } from "./sections/Skills";
import { OpenSource } from "./sections/OpenSource";
import { DeliveryPipeline } from "./sections/DeliveryPipeline";
import { Education } from "./sections/Education";
import { Contact } from "./sections/Contact";
import { CaseStudyDialog } from "./components/CaseStudyDialog";
import { SceneBoundary } from "./components/SceneBoundary";
import { SpiderFallback } from "./components/SpiderFallback";
import { CursorGlow } from "./components/CursorGlow";
import { AssistantPanel } from "./components/AssistantPanel";
import { companionEvents } from "./companion/events";
import type { AssistantAction, AssistantContext } from "./types/assistant";
import { NotFound } from "./components/NotFound";
import { usePortfolioData } from "./hooks/usePortfolioData";
import { useMedia } from "./hooks/useMedia";
import { setupReveals } from "./animations/reveals";
import type { Project } from "./types/portfolio";
const SpiderScene = lazy(() => import("./three/SpiderScene"));
export default function App() {
  const { data, source } = usePortfolioData();
  const reduced = useMedia("(prefers-reduced-motion: reduce)");

  const touch = useMedia("(pointer: coarse)");
  const [project, setProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selectProject = (selected: Project) => {
    setSelectedProjectId(selected.slug);
    setProject(selected);
  };
  const [sceneReady, setSceneReady] = useState(false);
  const [character, setCharacter] = useState(
    () => sessionStorage.getItem("spidey-hidden") !== "true",
  );
  const [renderCharacter, setRenderCharacter] = useState(character);
  const [assistant, setAssistant] = useState(false);
  const [sectionId, setSectionId] = useState<AssistantContext["section_id"]>("home");
  useEffect(() => {
    const sectionIds = ["home", "about", "projects", "experience", "skills", "open-source", "education", "contact"] as const;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible && sectionIds.includes(visible.target.id as typeof sectionIds[number]))
        setSectionId(visible.target.id as typeof sectionIds[number]);
    }, { rootMargin: "-20% 0px -45% 0px", threshold: [0, 0.25, 0.5] });
    sectionIds.forEach((id) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  const openSpideyAssistant = useCallback(() => {
    companionEvents.requestAssistantOpen(() => setAssistant(true));
  }, []);
  const closeAssistant = useCallback(() => {
    companionEvents.emit({ type: "AI_CLOSE" });
    setAssistant(false);
  }, []);
  const act = (action: AssistantAction) => {
    if (
      (action.type === "NAVIGATE_SECTION" || action.type === "OPEN_CONTACT") &&
      [
        "home",
        "about",
        "projects",
        "experience",
        "skills",
        "open-source",
        "education",
        "contact",
      ].includes(action.target) && (action.type !== "OPEN_CONTACT" || action.target === "contact")
    ) {
      companionEvents.emit({ type: "USER_NAVIGATE", section: action.target });
      closeAssistant();
      document
        .getElementById(action.target)
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    } else if (action.type === "OPEN_PROJECT") {
      const found = data.projects.find((p) => p.slug === action.target);
      if (found) {
        closeAssistant();
        selectProject(found);
      }
    } else if (action.type === "OPEN_GITHUB" && action.target === "github")
      window.open(data.profile.github_url, "_blank", "noopener,noreferrer");
    else if (action.type === "OPEN_LINKEDIN" && action.target === "linkedin")
      window.open(data.profile.linkedin_url, "_blank", "noopener,noreferrer");
    else if ((action.type === "OPEN_RESUME" || action.type === "DOWNLOAD_RESUME") && action.target === "resume") {
      const a = document.createElement("a");
      a.href = "/assets/Ashish_Kumar_Ishwar_Resume.pdf";
      a.download = "Ashish_Kumar_Ishwar_Resume.pdf";
      a.click();
    }
  };
  const minimal = reduced;
  useEffect(() => {
    document.documentElement.classList.toggle("spidey-hiding", !character);
    if (character) {
      setRenderCharacter(true);
      return;
    }
    const timer = setTimeout(() => setRenderCharacter(false), 180);
    return () => clearTimeout(timer);
  }, [character]);
  useEffect(() => {
    const timer = setTimeout(() => setSceneReady(true), 700);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("minimal-motion", minimal);
    return setupReveals(minimal);
  }, [minimal]);
  if (
    window.location.pathname !== "/" &&
    window.location.pathname !== "/index.html"
  )
    return <NotFound />;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        <Hero minimal={minimal} profile={data.profile} />
        <About />
        <Projects projects={data.projects} onSelect={selectProject} />
        <Experience experience={data.experience} />
        <Skills skills={data.skills} />
        <OpenSource contributions={data.contributions} />
        <DeliveryPipeline />
        <Education
          certifications={data.certifications}
          education={data.education}
        />
        <Contact />
      </main>
      <footer className="footer">
        <a className="wordmark" href="#home">
          a<span>i</span>
          <i />
        </a>
        <span>© {new Date().getFullYear()} Ashish Kumar Ishwar</span>
        <span className="footer-stack">React · FastAPI · PostgreSQL</span>
        <a href="#home">
          Back to top <ArrowUp size={14} />
        </a>
        <small>
          {source === "api"
            ? "Content served by the portfolio API"
            : source === "snapshot"
              ? "Resume snapshot · API currently unavailable"
              : "Connecting to portfolio API…"}
        </small>
        <span
          className="footer-anchor"
          data-spider-anchor="footer"
          aria-hidden="true"
        />
      </footer>
      <CaseStudyDialog project={project} onClose={() => setProject(null)} />
      {renderCharacter && !project && (
        <SceneBoundary
          fallback={
            <SpiderFallback onOpen={openSpideyAssistant} reduced={reduced} />
          }
        >
          <Suspense fallback={null}>
            {sceneReady && <SpiderScene onOpen={openSpideyAssistant} />}
          </Suspense>
        </SceneBoundary>
      )}
      <div
        className={`companion-controls${assistant ? " chat-open" : ""}`}
        data-spidey-exclusion
      >
        <button
          className="assistant-launch"
          onClick={openSpideyAssistant}
          aria-label="Ask Portfolio Assistant"
          aria-expanded={assistant}
          aria-controls="portfolio-assistant"
        >
          ✧ Ask Spidey
        </button>
        <button
          className="character-toggle"
          aria-pressed={character}
          onClick={() =>
            setCharacter((v) => {
              sessionStorage.setItem("spidey-hidden", String(v));
              companionEvents.emit({ type: v ? "HIDE_SPIDEY" : "SHOW_SPIDEY" });
              return !v;
            })
          }
        >
          {character ? "Hide" : "Show"} Spidey
        </button>
      </div>
      <AssistantPanel
        open={assistant}
        onClose={closeAssistant}
        onAction={act}
        context={{ section_id: sectionId, project_id: sectionId === "projects" ? selectedProjectId ?? undefined : undefined }}
      />
      {!touch && !minimal && <CursorGlow />}
    </>
  );
}
