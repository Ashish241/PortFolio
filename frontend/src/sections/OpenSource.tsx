import { GitPullRequest, ArrowUpRight } from "../components/icons";
import type { Contribution } from "../types/portfolio";
import { SectionHeading } from "../components/SectionHeading";
import { ExternalLink } from "../components/ExternalLink";
export function OpenSource({
  contributions,
}: {
  contributions: Contribution[];
}) {
  return (
    <section id="open-source" className="section">
      <SectionHeading
        number="05"
        label="BEYOND MY OWN REPOSITORIES"
        title="Contributing to something bigger."
        description="Contributing across open-source projects, one review at a time."
      />
      <div className="contribution-grid">
        {contributions.map((c) => (
          <article className="contribution-card reveal" key={c.url}>
            <div className="contribution-top">
              <GitPullRequest size={22} />
              <span
                className={`pill ${c.status === "Merged" ? "purple" : "blue"}`}
              >
                {c.status}
              </span>
            </div>
            <div className="eyebrow">
              {c.organization === "Kubeflow" ? "CNCF ECOSYSTEM" : "OPEN SOURCE"}{" "}
              / {c.organization}
            </div>
            <h3>{c.repository}</h3>
            <p>{c.description}</p>
            <ExternalLink className="text-link" href={c.url}>
              Pull request #{c.pr_number} <ArrowUpRight size={17} />
            </ExternalLink>
            <span
              className="card-anchor"
              data-spider-anchor="opensource"
              aria-hidden="true"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
