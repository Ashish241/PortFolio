import {
  ArrowUpRight,
  Github,
  Terminal,
  Braces,
  ArrowRight,
} from "../components/icons";
import type { Project } from "../types/portfolio";
import { SectionHeading } from "../components/SectionHeading";
import { Architecture } from "../components/Architecture";
import { ExternalLink } from "../components/ExternalLink";
export function Projects({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect: (project: Project) => void;
}) {
  return (
    <section id="projects" className="section projects-section">
      <SectionHeading
        number="02"
        label="SELECTED ENGINEERING"
        title="Built to solve. Designed to work."
        description="A closer look at the systems, tools, and interfaces I’ve built."
      />
      {projects
        .filter((p) => p.featured)
        .map((p) => (
          <article
            className="featured-project reveal"
            id={`project-${p.slug}`}
            key={p.slug}
          >
            <div className="featured-copy">
              <div className="project-meta">
                <span className="pill blue">FEATURED PROJECT</span>
                <span>{p.date}</span>
              </div>
              <div className="eyebrow">{p.category}</div>
              <h3>
                {p.short_title}
                <span className="project-title-dot">.</span>
              </h3>
              <p className="project-full-name">{p.title}</p>
              <p className="project-summary">{p.summary}</p>
              <div className="project-metric">
                <strong>
                  60<span>min</span>
                </strong>
                <div>
                  FORECAST HORIZON
                  <br />
                  <small>Workload prediction ahead of demand</small>
                </div>
              </div>
              <div className="tags">
                {p.technologies.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="project-actions">
                <button className="text-link" onClick={() => onSelect(p)}>
                  Explore the system <ArrowUpRight size={18} />
                </button>
                <ExternalLink href={p.github_url}>
                  <Github size={18} />
                  <span className="sr-only">KubASIE source</span>
                </ExternalLink>
              </div>
            </div>
            <div className="featured-visual">
              <div
                className="forecast-chart"
                aria-label="Conceptual workload forecast illustration, not measured project telemetry"
              >
                <div className="chart-title">
                  <span>WORKLOAD INTELLIGENCE</span>
                  <span className="pill">ILLUSTRATIVE</span>
                </div>
                <svg
                  viewBox="0 0 460 170"
                  role="img"
                  aria-label="Illustrative demand curve and forecast"
                >
                  <defs>
                    <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#509bfa" stopOpacity=".3" />
                      <stop offset="100%" stopColor="#509bfa" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[40, 80, 120, 160].map((y) => (
                    <path
                      key={y}
                      d={`M0 ${y} H460`}
                      stroke="#202d42"
                      strokeDasharray="3 5"
                    />
                  ))}
                  <path
                    d="M0 140 C40 140 40 105 75 113 S110 155 145 105 S200 122 225 87 S265 116 285 69 S325 80 350 35 S420 63 460 20 L460 170 L0 170Z"
                    fill="url(#chart-fill)"
                  />
                  <path
                    d="M0 140 C40 140 40 105 75 113 S110 155 145 105 S200 122 225 87 S265 116 285 69"
                    fill="none"
                    stroke="#72aefd"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M285 69 C325 80 325 35 350 35 S420 63 460 20"
                    fill="none"
                    stroke="#ed6679"
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                  />
                  <path
                    d="M285 12V170"
                    stroke="#62738c"
                    strokeDasharray="4 4"
                  />
                  <circle cx="285" cy="69" r="5" fill="#fff" />
                </svg>
                <div className="chart-legend">
                  <span>
                    <i className="blue-dot" /> Demand
                  </span>
                  <span>
                    <i className="red-dot" /> Forecast
                  </span>
                  <span>NOW → +60 MIN</span>
                </div>
              </div>
              <Architecture project={p} compact />
              <div className="visual-footer">
                <span className="status-dot" /> PREDICT → DECIDE → SCALE
                <span>HELM + DOCKER</span>
              </div>
            </div>
            <span
              className="card-anchor"
              data-spider-anchor="project"
              aria-hidden="true"
            />
          </article>
        ))}
      <div className="project-grid">
        {projects
          .filter((p) => !p.featured)
          .map((p, i) => (
            <article
              className="project-card reveal"
              id={`project-${p.slug}`}
              key={p.slug}
            >
              <div className="project-card-top">
                <span className="project-index">0{i + 2}</span>
                <span>{p.date}</span>
                <ExternalLink href={p.github_url}>
                  <Github size={18} />
                  <span className="sr-only">{p.short_title} source</span>
                </ExternalLink>
              </div>
              <div
                className={`project-thumbnail ${i === 0 ? "terminal-thumbnail" : "portfolio-thumbnail"}`}
              >
                {i === 0 ? (
                  <>
                    <Terminal size={23} />
                    <code>
                      $ kf-probe --watch
                      <br />
                      <span>workflow / health / runtime</span>
                      <br />
                      <b>→ JSON · YAML · DAG</b>
                    </code>
                  </>
                ) : (
                  <>
                    <Braces size={24} />
                    <div className="mini-browser">
                      <i />
                      <i />
                      <i />
                      <span>interface → experience</span>
                      <div className="mini-browser-body">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="eyebrow">{p.category}</div>
              <h3>{p.short_title}</h3>
              <p>{p.summary}</p>
              <div className="tags">
                {p.technologies.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <button className="text-link" onClick={() => onSelect(p)}>
                View case study <ArrowRight size={17} />
              </button>
              <span
                className="card-anchor"
                data-spider-anchor="project"
                aria-hidden="true"
              />
            </article>
          ))}
      </div>
    </section>
  );
}
