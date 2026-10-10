import {
  ArrowDown,
  ArrowUpRight,
  Github,
  Linkedin,
  Download,
} from "../components/icons";
import { useEffect, useState } from "react";
import { ExternalLink } from "../components/ExternalLink";
import type { Profile } from "../types/portfolio";
import { SpideyAnchor } from "../components/SpideyAnchor";
import { ProfileShoulderAnchor } from "../components/ProfileShoulderAnchor";
export function Hero({
  minimal,
  profile,
}: {
  minimal: boolean;
  profile: Profile;
}) {
  const roles = profile.roles;
  const [role, setRole] = useState(0);
  useEffect(() => {
    if (minimal) return;
    const timer = setInterval(
      () => setRole((i) => (i + 1) % roles.length),
      3500,
    );
    return () => clearInterval(timer);
  }, [minimal, roles.length]);
  return (
    <section id="home" className="hero">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-orb orb-blue" aria-hidden="true" />
      <div className="hero-orb orb-red" aria-hidden="true" />
      <div className="hero-copy">
        <div className="eyebrow hero-status">
          <span className="status-dot" /> {profile.name.toUpperCase()}{" "}
          <span className="hero-location">
            / {profile.location.toUpperCase()}
          </span>
        </div>
        <SpideyAnchor
          id="hero-title"
          elementType="heading"
          poses={["PERCH", "HANG_IDLE"]}
        >
          <h1>
            Engineering
            <br />
            from <span className="outline-text">interface</span>
            <br />
            to <span className="gradient-text">infrastructure.</span>
          </h1>
        </SpideyAnchor>
        <div className="role-line">
          <span className="red-rule" />
          <span key={role} className={minimal ? "" : "role-enter"}>
            {minimal ? roles[0] : roles[role]}
          </span>
        </div>
        <p className="hero-description">
          I build across the stack — thoughtful interfaces, reliable APIs, and
          cloud-native systems that anticipate what’s next.
        </p>
        <div className="hero-buttons" data-spidey-cta>
          <a className="button primary" href="#projects">
            Explore my work <ArrowUpRight size={18} />
          </a>
          <a
            className="button secondary"
            href="/assets/Ashish_Kumar_Ishwar_Resume.pdf"
            download
          >
            <Download size={16} /> Download resume
          </a>
          <a className="hero-contact" href="#contact">
            Contact me <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="hero-socials">
          <ExternalLink href={profile.github_url}>
            <Github size={17} /> GitHub <ArrowUpRight size={12} />
          </ExternalLink>
          <ExternalLink href={profile.linkedin_url}>
            <Linkedin size={17} /> LinkedIn <ArrowUpRight size={12} />
          </ExternalLink>
          <span className="social-divider" />
          <span>BUILD. SHIP. IMPROVE.</span>
        </div>
      </div>
      <div className="hero-art">
        <div className="portrait-shell">
          <div className="portrait-top">
            <span className="status-dot" /> THE ENGINEER BEHIND THE SYSTEMS{" "}
            <span>01 / AKI</span>
          </div>
          <img
            src="/assets/portrait.webp"
            alt="Ashish Kumar Ishwar seated on a rocky hillside"
            width="900"
            height="1200"
            fetchPriority="high"
          />
          <ProfileShoulderAnchor />
          <div className="portrait-shade" />
          <div className="portrait-caption">
            <span>ASHISH KUMAR ISHWAR</span>
            <small>
              Code with intent.
              <br />
              Build with perspective.
            </small>
          </div>
          <span className="corner corner-tl" />
          <span className="corner corner-br" />
        </div>
        <div className="floating-tag">
          <span className="status-dot" />
          <code>frontend → backend → cloud</code>
        </div>
        <div className="orbit-label">
          A LITTLE SPIDEY SENSE.
          <br />A LOT OF ENGINEERING.
        </div>
        <span
          className="hero-anchor"
          data-spider-anchor="hero"
          aria-hidden="true"
        />
      </div>
      <div className="hero-bottom">
        <a href="#projects">
          <ArrowDown size={15} /> SCROLL TO EXPLORE
        </a>
        <span>REACT / FASTAPI / KUBERNETES</span>
        <span className="hero-coordinates">23.3441° N &nbsp; 85.3096° E</span>
      </div>
    </section>
  );
}
