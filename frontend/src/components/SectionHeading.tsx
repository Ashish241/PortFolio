export function SectionHeading({
  number,
  label,
  title,
  description,
}: {
  number: string;
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading reveal">
      <div className="eyebrow">
        <span>{number}</span> {label}
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <span
        className="landing-point"
        data-spider-anchor="section"
        aria-hidden="true"
      />
    </div>
  );
}
