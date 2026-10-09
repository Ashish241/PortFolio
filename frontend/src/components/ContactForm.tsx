import { useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, CheckCircle2 } from "./icons";
import { sendContact } from "../services/api";
export function ContactForm() {
  const started = useRef(Date.now());
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const values = new FormData(form);
    setStatus("sending");
    setError("");
    try {
      await sendContact({
        name: String(values.get("name")).trim(),
        email: String(values.get("email")).trim(),
        subject: String(values.get("subject")).trim(),
        message: String(values.get("message")).trim(),
        website: String(values.get("website") ?? ""),
        started_at: started.current,
      });
      setStatus("success");
      form.reset();
      started.current = Date.now();
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Message could not be stored. Please email me directly.",
      );
    }
  }
  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-row">
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Alex Morgan"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="alex@company.com"
          />
        </label>
      </div>
      <label>
        Subject
        <input
          name="subject"
          required
          minLength={3}
          maxLength={160}
          placeholder="An opportunity, a project, an idea…"
        />
      </label>
      <label>
        Message
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={5000}
          rows={4}
          placeholder="Tell me what you have in mind."
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="form-bottom">
        <span>
          Prefer email?{" "}
          <a href="mailto:ashishkum2411@gmail.com">Write directly ↗</a>
        </span>
        <button
          className="button primary"
          disabled={status === "sending"}
          type="submit"
        >
          {status === "sending" ? (
            <>
              <LoaderCircle size={16} className="spin" /> Sending
            </>
          ) : (
            <>
              Send message <ArrowUpRight size={17} />
            </>
          )}
        </button>
      </div>
      <div aria-live="polite" role="status">
        {status === "success" && (
          <p className="form-success">
            <CheckCircle2 size={17} /> Message received and stored. Thank you
            for reaching out.
          </p>
        )}
        {status === "error" && <p className="form-error">{error}</p>}
      </div>
    </form>
  );
}
