import type { AssistantReply } from "../types/assistant";
const base = (import.meta.env?.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
export async function askAssistant(
  message: string,
  conversation_id: string | null,
  signal?: AbortSignal,
): Promise<AssistantReply> {
  const response = await fetch(`${base}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000),
    body: JSON.stringify({ message, conversation_id }),
  });
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
