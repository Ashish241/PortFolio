export interface AssistantAction {
  type: "NAVIGATE_SECTION" | "OPEN_PROJECT" | "OPEN_GITHUB" | "DOWNLOAD_RESUME";
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
}
