import { useState } from "react";
import { ArrowRight, Network, Activity, Cpu, Box } from "./icons";
import type { Project } from "../types/portfolio";
export function Architecture({
  project,
  compact = false,
}: {
  project: Project;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(project.nodes[0]?.key);
  const node =
    project.nodes.find((n) => n.key === selected) ?? project.nodes[0];
  const icons = [Cpu, Network, Box, Activity];
  return (
    <div className={`architecture ${compact ? "compact" : ""}`}>
      <div className="architecture-header">
        <span className="status-dot" /> SYSTEM ARCHITECTURE{" "}
        <span>INTERACTIVE</span>
      </div>
      <div className="architecture-flow">
        {project.nodes.map((n, i) => {
          const Icon = icons[i % icons.length];
          const linked = project.edges.some(
            (e) => e.source === n.key && e.target === project.nodes[i + 1]?.key,
          );
          return (
            <div className="node-wrap" key={n.key}>
              <button
                className={`architecture-node ${node?.key === n.key ? "selected" : ""}`}
                onClick={() => setSelected(n.key)}
                aria-pressed={node?.key === n.key}
              >
                <Icon size={compact ? 19 : 24} />
                <strong>{n.label}</strong>
                <small>{String(i + 1).padStart(2, "0")}</small>
              </button>
              {linked && <ArrowRight className="flow-arrow" size={16} />}
            </div>
          );
        })}
      </div>
      <p className="architecture-description" aria-live="polite">
        {node?.description}
      </p>
      {!compact && (
        <div className="architecture-edges">
          {project.edges.map((e) => (
            <span key={`${e.source}-${e.target}`}>
              {project.nodes.find((n) => n.key === e.source)?.label} →{" "}
              {project.nodes.find((n) => n.key === e.target)?.label}: {e.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
