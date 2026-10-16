export class TapGesture {
  private active = new Set<number>();
  private start: { id: number; x: number; y: number; time: number; target: EventTarget | null } | null = null;
  down(e: PointerEvent, now: number) {
    this.active.add(e.pointerId);
    if (this.active.size !== 1 || e.button !== 0 || !e.isPrimary) { this.start = null; return; }
    this.start = { id: e.pointerId, x: e.clientX, y: e.clientY, time: now, target: e.target };
  }
  move(e: PointerEvent) {
    if (this.start?.id === e.pointerId && Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>10) this.start=null;
  }
  cancel() { this.start = null; }
  up(e: PointerEvent, now: number) {
    const start = this.start;
    this.active.delete(e.pointerId);
    this.start = null;
    return !!start && start.id === e.pointerId && this.active.size === 0 && start.target === e.target && now-start.time <= 350 && Math.hypot(e.clientX-start.x,e.clientY-start.y)<=10;
  }
  cancelled(e: PointerEvent) { this.active.delete(e.pointerId); this.cancel(); }
}
