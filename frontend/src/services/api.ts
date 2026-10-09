import type { ContactPayload, PortfolioData } from "../types/portfolio";
const base = (import.meta.env?.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}/api${path}`, {
    ...options,
    signal: AbortSignal.timeout(90000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      response.status === 422
        ? "Please check the fields and try again."
        : (data.detail ??
            "The service is unavailable. Please try again or email me directly."),
    );
  return data as T;
}
export async function getPortfolio(): Promise<PortfolioData> {
  const [
    projects,
    skills,
    experience,
    contributions,
    certifications,
    profile,
    education,
  ] = await Promise.all([
    request<PortfolioData["projects"]>("/projects"),
    request<PortfolioData["skills"]>("/skills"),
    request<PortfolioData["experience"]>("/experience"),
    request<PortfolioData["contributions"]>("/contributions"),
    request<PortfolioData["certifications"]>("/certifications"),
    request<PortfolioData["profile"]>("/profile"),
    request<PortfolioData["education"]>("/education"),
  ]);
  return {
    projects,
    skills,
    experience,
    contributions,
    certifications,
    profile,
    education,
  };
}
export const sendContact = (payload: ContactPayload) =>
  request<{ message: string }>("/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
