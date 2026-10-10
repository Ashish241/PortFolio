export const NAV_ITEMS = [
  ["home", "Home"],
  ["about", "About"],
  ["projects", "Projects"],
  ["experience", "Experience"],
  ["skills", "Skills"],
  ["open-source", "Open Source"],
  ["contact", "Contact"],
] as const;
export type CompanionEvent = {
  type:
    | "USER_NAVIGATE"
    | "SECTION_ENTER"
    | "SPIDEY_CLICK"
    | "CTA_HOVER"
    | "AI_OPEN"
    | "AI_CLOSE"
    | "AI_REQUEST_START"
    | "AI_REQUEST_END"
    | "HIDE_SPIDEY"
    | "SHOW_SPIDEY";
  section?: string;
};
// Components publish intent; only the active renderer owns the motion controller.
class EventBus {
  private listeners = new Set<(event: CompanionEvent) => void>();
  private pendingOpen: (() => void) | null = null;
  private runtimes = 0;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  registerRuntime() {
    this.runtimes++;
    return () => {
      this.runtimes--;
      if (!this.runtimes) this.finishOpen();
    };
  }
  requestAssistantOpen(open: () => void) {
    this.emit({ type: "SPIDEY_CLICK" });
    this.emit({ type: "AI_OPEN" });
    this.pendingOpen = open;
    if (!this.runtimes) this.finishOpen();
  }
  safeForAssistant(supported: boolean) {
    if (supported) this.finishOpen();
  }
  private finishOpen() {
    const open = this.pendingOpen;
    this.pendingOpen = null;
    if (open) {
      if (this.openTimer) clearTimeout(this.openTimer);
      this.openTimer = setTimeout(() => {
        this.openTimer = null;
        open();
      }, 100);
    }
  }
  ai: "closed" | "listening" | "thinking" | "response" = "closed";
  emit(event: CompanionEvent) {
    if (event.type === "AI_OPEN") this.ai = "listening";
    if (event.type === "AI_CLOSE") {
      this.ai = "closed";
      this.pendingOpen = null;
      if (this.openTimer) clearTimeout(this.openTimer);
      this.openTimer = null;
    }
    if (event.type === "AI_REQUEST_START") this.ai = "thinking";
    if (event.type === "AI_REQUEST_END") this.ai = "response";
    this.listeners.forEach((fn) => fn(event));
  }
  subscribe(fn: (event: CompanionEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
export const companionEvents = new EventBus();
