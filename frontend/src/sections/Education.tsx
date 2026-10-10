import type { Certification, EducationRecord } from "../types/portfolio";
export function Education({
  certifications,
  education,
}: {
  certifications: Certification[];
  education: EducationRecord[];
}) {
  return (
    <section
      id="education"
      className="section education-section"
      aria-labelledby="education-title"
    >
      <div className="education-block">
        <div className="eyebrow">FOUNDATIONS</div>
        <h2 id="education-title">
          Always building.
          <br />
          Always learning.
        </h2>
        {education.map((e) => (
          <div className="education-degree" key={e.qualification}>
            <span>{e.qualification}</span>
            <p>{e.institution}</p>
            <small>
              {e.qualification.startsWith("B.Tech") ? "Expected " : "Completed "}
              {e.expected_year} <span>{e.grade}</span>
            </small>
          </div>
        ))}
      </div>
      <div className="certifications">
        <div className="eyebrow">TRAINING & CREDENTIALS</div>
        {certifications.map((c) => (
          <div className="certification" key={c.title}>
            <div>
              <h3>{c.title}</h3>
              <p>
                {c.issuer} · {c.kind}
              </p>
            </div>
            <span>{c.year}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
