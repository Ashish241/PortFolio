import { ArrowUpRight, Github, Linkedin, Download } from "../components/icons";
import { ContactForm } from "../components/ContactForm";
import { ExternalLink } from "../components/ExternalLink";
export function Contact() {
  return (
    <section id="contact" className="section contact-section">
      <div className="contact-intro">
        <div className="eyebrow">06 / WHAT’S NEXT?</div>
        <h2>
          Let’s build
          <br />
          something that <span>scales.</span>
        </h2>
        <p>
          Have a system to build, a problem to untangle, or an engineering
          opportunity? Let’s connect.
        </p>
        <a className="contact-email" href="mailto:ashishkum2411@gmail.com">
          ashishkum2411@gmail.com <ArrowUpRight size={20} />
        </a>
        <div className="contact-socials">
          <ExternalLink href="https://github.com/Ashish241">
            <Github size={18} /> GitHub
          </ExternalLink>
          <ExternalLink href="https://www.linkedin.com/in/ashish-ishwar/">
            <Linkedin size={18} /> LinkedIn
          </ExternalLink>
          <a href="/assets/Ashish_Kumar_Ishwar_Resume.pdf" download>
            <Download size={18} /> Resume
          </a>
        </div>
        <span
          className="contact-anchor"
          data-spider-anchor="contact"
          aria-hidden="true"
        />
      </div>
      <ContactForm />
    </section>
  );
}
