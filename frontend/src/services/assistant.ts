import type { AssistantContext, AssistantReply } from "../types/assistant";
const base = (import.meta.env?.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export async function askAssistant(
  message: string,
  conversation_id: string | null,
  signal?: AbortSignal,
  context?: AssistantContext,
): Promise<AssistantReply> {
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000);
  const request = (withContext: boolean) => {
    const contextualProject = context?.project_id && /\b(here|this project|this one)\b/i.test(message);
    const contextualExperience = context?.section_id === "experience" && /\b(what did he do|here|this section)\b/i.test(message);
    const legacyMessage = contextualProject ? `${message} About ${context.project_id}.` : contextualExperience ? `${message} In his experience.` : message;
    return fetch(`${base}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: requestSignal,
    body: JSON.stringify({ message: withContext ? message : legacyMessage, conversation_id, ...(withContext ? context : {}) }),
  });
  };
  let response = await request(true);
  // Preview can update before Render. Older APIs reject the new optional
  // context fields; retry once with the previous contract, without a loop.
  if (response.status === 422 && (context?.section_id || context?.project_id))
    response = await request(false);
  if (!response.ok) {
    if (response.status === 503)
      throw new Error(
        "Ask Spidey is temporarily unavailable. Please try again later or explore the portfolio directly.",
      );
    if (response.status === 429)
      throw new Error(
        "This visit has reached the assistant’s request limit. You can still explore the projects, resume and contact section.",
      );
    if (response.status === 409)
      throw new Error(
        "Spidey is still preparing the previous answer. Please wait a moment.",
      );
    throw new Error(
      "Spidey is having trouble accessing the portfolio assistant right now. You can still explore the projects, experience, skills, and resume directly.",
    );
  }
  return response.json();
}
export async function clearAssistant(conversation_id: string | null) {
  if (!conversation_id) return;
  const response = await fetch(`${base}/api/assistant/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ message: "clear", conversation_id }),
  });
  if (!response.ok)
    throw new Error("Couldn’t clear the conversation yet. Please try again.");
}
