import {
  Braces,
  GitBranch,
  Workflow,
  Container,
  Boxes,
  Cloud,
  ArrowRight,
} from "../components/icons";
const steps = [
  { Icon: Braces, title: "Code", detail: "Python · TypeScript" },
  { Icon: GitBranch, title: "Version", detail: "Git · GitHub" },
  { Icon: Workflow, title: "Automate", detail: "GitHub Actions · Jenkins" },
  { Icon: Container, title: "Package", detail: "Docker" },
  { Icon: Boxes, title: "Orchestrate", detail: "Kubernetes · Helm" },
  { Icon: Cloud, title: "Cloud", detail: "AWS · GCP" },
];
export function DeliveryPipeline() {
  return (
    <section className="section delivery-section">
      <div className="delivery-heading">
        <div>
          <div className="eyebrow">FROM COMMIT TO CLOUD</div>
          <h2>Think beyond deployment.</h2>
        </div>
        <p>
          The tools I use across the software lifecycle.
          <br />
          Monitoring: Prometheus · Grafana. Testing: PyTest.
        </p>
      </div>
      <div className="pipeline">
        {steps.map(({ Icon, title, detail }, i) => (
          <div className="pipeline-step" key={title}>
            <span className="pipeline-number">0{i + 1}</span>
            <Icon size={25} />
            <h3>{title}</h3>
            <p>{detail}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="pipeline-arrow" size={17} />
            )}
          </div>
        ))}
      </div>
      <p className="pipeline-note">
        A map of my technical ecosystem; individual project implementations are
        documented above.
      </p>
    </section>
  );
}
