export function eligibleWebClick(event: MouseEvent, mobile: boolean, _reduced: boolean) {
  if (mobile || event.button !== 0 || event.detail === 0) return false;
  if (document.getSelection()?.toString() || document.querySelector(".assistant-panel") || document.documentElement.classList.contains("spidey-hiding")) return false;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("main")) return false;
  if (target.closest('a,button,input,textarea,select,label,summary,[role="button"],[contenteditable],.navigation,.companion-controls,.assistant-panel,dialog,.spider-react,[data-spidey-exclusion]')) return false;
  if (target.closest("p,h1,h2,h3,h4,li,span,strong,em,small,svg,img,.tags,.portrait-shell,.architecture-map,.skill-node,.timeline-node")) return false;
  return event.clientX > 0 && event.clientX < document.documentElement.clientWidth && event.clientY > 0 && event.clientY < innerHeight;
}

