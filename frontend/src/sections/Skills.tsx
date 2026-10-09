import { useState } from "react";
import { ArrowUpRight } from "../components/icons";
import type { Technology } from "../types/portfolio";
import { SectionHeading } from "../components/SectionHeading";
export function Skills({ skills }: { skills: Technology[] }) {
  const categories = [...new Set(skills.map((s) => s.category))];
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState("FastAPI");
  const current = skills.find((s) => s.name === selected) ?? skills[0];
  return (
    <section id="skills" className="section skills-section">
      <SectionHeading
        number="04"
        label="THE ENGINEERING STACK"
        title="Connected skills. Concrete context."
        description="Select a technology to see its connection to my work."
      />
      <div
        className="skill-filters"
        role="group"
        aria-label="Filter technologies"
      >
        {["All", ...categories].map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="skills-layout">
        <div className="skill-universe">
          {skills
            .filter((s) => category === "All" || s.category === category)
            .map((s, i) => (
              <button
                className={`skill-node ${selected === s.name ? "selected" : ""}`}
                key={s.name}
                onClick={() => setSelected(s.name)}
                aria-pressed={selected === s.name}
              >
                <span className="skill-symbol">{s.name.slice(0, 2)}</span>
                <span>{s.name}</span>
                <ArrowUpRight size={12} />
                <span className="skill-node-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
        </div>
        <aside className="skill-detail" aria-live="polite">
          <span className="eyebrow">IN CONTEXT / {current.category}</span>
          <h3>
            {current.name}
            <span>.</span>
          </h3>
          <p>Where it connects</p>
          <ul>
            {current.usages.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
          <div className="skill-detail-footer">
            <span className="status-dot" /> GROUNDED IN MY RESUME
          </div>
        </aside>
      </div>
    </section>
  );
}
