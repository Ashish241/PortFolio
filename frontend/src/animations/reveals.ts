import gsap from "gsap";
export function setupReveals(disabled: boolean) {
  if (disabled) return () => {};
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.fromTo(
            entry.target,
            { y: 24, opacity: 0.7 },
            {
              y: 0,
              opacity: 1,
              duration: 0.65,
              ease: "power2.out",
              clearProps: "all",
              onComplete: () => {
                window.dispatchEvent(new Event("companion-layout"));
              },
            },
          );
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.12 },
  );
  document
    .querySelectorAll(".reveal")
    .forEach((node) => observer.observe(node));
  return () => {
    observer.disconnect();
    gsap.killTweensOf(".reveal");
  };
}
