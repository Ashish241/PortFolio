import { Component, type ReactNode } from "react";
export class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Log only the failing subsystem; exception text can contain environment details.
    console.error("Spider-Man scene failed to initialize; showing the accessible fallback.");
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
