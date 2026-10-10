import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "./icons";
import { NAV_ITEMS } from "../companion/events";
const items = NAV_ITEMS;
export function Navigation() {
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    items.forEach(([id]) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);
  return (
    <header className="navigation">
      <a href="#home" className="wordmark" aria-label="Ashish, home">
        a<span>i</span>
        <i />
      </a>
      <nav
        aria-label="Main navigation"
        className={open ? "nav-links open" : "nav-links"}
      >
        {items.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? "location" : undefined}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="nav-actions">
        <a className="nav-contact" href="#contact">
          Let’s talk <ArrowUpRight size={16} />
        </a>
        <button
          className="menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
