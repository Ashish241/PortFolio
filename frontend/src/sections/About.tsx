import { Layers3, Server, Workflow } from "../components/icons";
import { SectionHeading } from "../components/SectionHeading";
export function About() {
  return (
    <section id="about" className="section about-section">
      <SectionHeading
        number="01"
        label="THE ENGINEERING MINDSET"
        title="The whole system. Every layer."
      />
      <div className="about-layout">
        <p className="about-statement reveal">
          Good software doesn’t stop
          <br />
          at the <span>edge of the screen.</span>
        </p>
        <div className="about-body reveal">
          <p>
            I’m Ashish, a Computer Science undergraduate working across backend
            services, frontend interfaces, and cloud infrastructure.
          </p>
          <p>
            At Real IT Solutions, I migrated services to FastAPI, investigated
            failures across the stack, and automated container build and
            deployment workflows. My own projects explore predictive Kubernetes
            autoscaling and scriptable workflow monitoring.
          </p>
          <p>
            Through Kubeflow contributions, I’ve also worked within the review
            workflows of a cloud-native open-source ecosystem.
          </p>
        </div>
      </div>
      <div className="capability-grid">
        {[
          {
            Icon: Layers3,
            title: "Interface",
            text: "Reusable React components and responsive experiences.",
          },
          {
            Icon: Server,
            title: "Systems",
            text: "FastAPI services, REST APIs, and backend debugging.",
          },
          {
            Icon: Workflow,
            title: "Infrastructure",
            text: "Docker packaging, Kubernetes scaling, and deployment automation.",
          },
        ].map(({ Icon, title, text }, i) => (
          <article className="capability reveal" key={title}>
            <span className="mini-number">0{i + 1}</span>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
