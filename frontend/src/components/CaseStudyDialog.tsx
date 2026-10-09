import { useEffect, useRef } from "react";
import { X, ArrowUpRight, Github } from "./icons";
import type { Project } from "../types/portfolio";
import { Architecture } from "./Architecture";
import { ExternalLink } from "./ExternalLink";
export function CaseStudyDialog({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project) {
      const previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = "hidden";
      return () => {
        dialog.close();
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [project]);
  return (
    <dialog
      ref={ref}
      className="case-study"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="case-title"
    >
      {project && (
        <div className="case-content">
          <button
            className="close-dialog"
            aria-label="Close project details"
            onClick={onClose}
          >
            <X />
          </button>
          <div className="eyebrow">
            {project.category} / {project.date}
          </div>
          <h2 id="case-title">{project.short_title}</h2>
          <p className="case-summary">{project.title}</p>
          <div className="tags">
            {project.technologies.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <h3>The problem</h3>
          <p>{project.problem}</p>
          <h3>The solution</h3>
          <p>{project.solution}</p>
          <Architecture project={project} />
          <h3>Engineering highlights</h3>
          <ul>
            {project.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <h3>Outcome</h3>
          <p>{project.outcome}</p>
          <div className="case-actions">
            <ExternalLink className="button primary" href={project.github_url}>
              <Github size={17} /> Explore source <ArrowUpRight size={17} />
            </ExternalLink>
            {project.live_url && (
              <ExternalLink
                className="button secondary"
                href={project.live_url}
              >
                Live website <ArrowUpRight size={17} />
              </ExternalLink>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
