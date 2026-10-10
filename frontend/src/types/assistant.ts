import type { Project } from "./portfolio";
export interface AssistantContext {
  section_id?: "home" | "about" | "projects" | "experience" | "skills" | "open-source" | "education" | "contact";
  project_id?: string;
}
export interface AssistantAction {
  type: "NAVIGATE_SECTION" | "OPEN_PROJECT" | "OPEN_GITHUB" | "OPEN_LINKEDIN" | "OPEN_RESUME" | "OPEN_CONTACT" | "DOWNLOAD_RESUME";
  target: string;
  label: string;
}
export interface AssistantReply {
  warning?: string | null;
  conversation_id: string;
  answer: string;
  suggested_actions: AssistantAction[];
  sources: { id: string; label: string }[];
  mode: "grounded" | "groq" | "openai" | "grounded-fallback";
  ui_component?: "education_timeline" | null;
  data?: { level: string; institution: string; year: string; score: string }[] | null;
  project_card?: Project | null;
}
