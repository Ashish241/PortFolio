import { useState } from "react";
import { Plus, Minus, ArrowUpRight } from "../components/icons";
import type { Experience as ExperienceType } from "../types/portfolio";
import { SectionHeading } from "../components/SectionHeading";
function formatRange(start: string, end: string | null) {
  const month = (value: string) =>
    new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })
      .format(new Date(value + "-01T00:00:00Z"))
      .toUpperCase();
  return end
    ? `${month(start)}${start.slice(0, 4) === end.slice(0, 4) ? "" : " " + start.slice(0, 4)} — ${month(end)} ${end.slice(0, 4)}`
    : `${month(start)} ${start.slice(0, 4)} — PRESENT`;
}
export function Experience({ experience }: { experience: ExperienceType[] }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <section id="experience" className="section">
      <SectionHeading
        number="03"
        label="REAL-WORLD ENGINEERING"
        title="Across the stack. In the details."
      />
      <div className="timeline">
        {experience.map((e) => (
          <article className="experience-card reveal" key={e.company}>
            <div className="timeline-node" data-spidey-source="timeline" />
            <div className="experience-date">
              {formatRange(e.start_date, e.end_date)}
              <span>{e.location}</span>
            </div>
            <div className="experience-content">
              <div className="experience-header">
                <div>
                  <div className="eyebrow">{e.company}</div>
                  <h3>{e.position}</h3>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setExpanded(!expanded)}
                  aria-expanded={expanded}
                  aria-controls="experience-details"
                  aria-label={
                    expanded
                      ? "Collapse experience details"
                      : "Expand experience details"
                  }
                >
                  {expanded ? <Minus size={20} /> : <Plus size={20} />}
                </button>
              </div>
              <p className="experience-intro">
                From service migration to deployment reliability — connecting
                changes across frontend, backend, and infrastructure.
              </p>
              <div
                className="resume-metrics"
                aria-label="Verified internship achievements"
              >
                <span>
                  <strong>3+</strong> deployments
                </span>
                <span>
                  <strong>10+</strong> REST endpoints modernized
                </span>
              </div>
              <div className="tags">
                {e.technologies.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div id="experience-details" hidden={!expanded}>
                <ul className="experience-highlights">
                  {e.highlights.map((h) => (
                    <li key={h}>
                      <ArrowUpRight size={15} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <span
              className="card-anchor"
              data-spider-anchor="timeline"
              aria-hidden="true"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
