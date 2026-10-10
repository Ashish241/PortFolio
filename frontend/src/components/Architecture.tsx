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
      {!compact && project.nodes.length > 1 && (
        <svg className="architecture-map" viewBox="0 0 600 136" role="img" aria-label={`${project.short_title} architecture: ${project.edges.map((edge) => `${project.nodes.find((n) => n.key === edge.source)?.label} to ${project.nodes.find((n) => n.key === edge.target)?.label}`).join("; ")}`}>
          <defs><marker id={`architecture-arrow-${project.slug}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="#729bd4" /></marker></defs>
          {project.edges.map((edge) => {
            const from = project.nodes.findIndex((n) => n.key === edge.source);
            const to = project.nodes.findIndex((n) => n.key === edge.target);
            if (from < 0 || to < 0) return null;
            const step = 520 / (project.nodes.length - 1);
            const x1 = 40 + from * step, x2 = 40 + to * step;
            const bend = Math.abs(to - from) > 1 ? 20 : 0;
            return <path key={`${edge.source}-${edge.target}`} d={`M ${x1} 66 Q ${(x1 + x2) / 2} ${66 - bend} ${x2} 66`} fill="none" stroke="#729bd4" strokeWidth="2" markerEnd={`url(#architecture-arrow-${project.slug})`}><title>{edge.label}</title></path>;
          })}
          {project.nodes.map((n, i) => <g key={n.key}>
            <circle cx={40 + i * 520 / (project.nodes.length - 1)} cy="66" r="8" fill={node?.key === n.key ? "#e26778" : "#78a9ed"} />
            <text x={40 + i * 520 / (project.nodes.length - 1)} y="105" textAnchor="middle" fill="#d8e7fa" fontSize="12">{n.label}</text>
          </g>)}
        </svg>
      )}
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
