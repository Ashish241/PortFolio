import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "./icons";
import { askAssistant, clearAssistant } from "../services/assistant";
import { companionEvents } from "../companion/events";
import type { AssistantAction, AssistantReply } from "../types/assistant";
interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
  error?: boolean;
}
const starters = [
  "Tell me about Ashish",
  "Show his strongest projects",
  "Why should I hire him?",
  "DevOps experience?",
  "Backend experience?",
  "Open-source work?",
  "Download Resume",
  "GitHub",
];
export function AssistantPanel({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (a: AssistantAction) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("Verified portfolio knowledge");
  const panel = useRef<HTMLElement>(null);
  const outsideClose = useRef(false);
  const conversation = useRef<string | null>(null),
    input = useRef<HTMLTextAreaElement>(null),
    log = useRef<HTMLDivElement>(null);
  const serial = useRef(0),
    active = useRef(false),
    requestBusy = useRef(false),
    returnFocus = useRef<HTMLElement | null>(null);
  active.current = open;
  useEffect(() => {
    window.dispatchEvent(new Event("companion-layout"));
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => input.current?.focus(), 120);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]"))
        onClose();
    };
    const outside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        panel.current?.contains(target) ||
        target.closest?.(".assistant-launch,.spider-react,.spider-fallback")
      )
        return;
      outsideClose.current = true;
      onClose();
    };
    outsideClose.current = false;
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
      const old = returnFocus.current;
      if (!outsideClose.current && old?.isConnected)
        old.focus({ preventScroll: true });
    };
  }, [open, onClose]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
    window.dispatchEvent(new Event("companion-layout"));
  }, [turns, busy, open]);
  const send = async (question: string) => {
    const q = question.trim();
    if (requestBusy.current || q.length < 2 || q.length > 1000) return;
    requestBusy.current = true;
    setBusy(true);
    setMessage("");
    setTurns((t) => [...t, { id: ++serial.current, role: "user", text: q }]);
    companionEvents.emit({ type: "AI_REQUEST_START" });
    try {
      const reply = await askAssistant(q, conversation.current);
      conversation.current = reply.conversation_id;
      setMode(
        reply.mode === "groq"
          ? "Groq AI · verified portfolio facts"
          : reply.mode === "openai"
            ? "AI · verified portfolio facts"
            : reply.mode === "grounded-fallback"
              ? "Verified knowledge · AI fallback"
              : "Verified portfolio knowledge",
      );
      setTurns((t) => [
        ...t,
        { id: ++serial.current, role: "assistant", text: reply.answer, reply },
      ]);
    } catch (error) {
      const text =
        error instanceof Error &&
        !["TimeoutError", "TypeError"].includes(error.name)
          ? error.message
          : "Spidey is having trouble accessing the portfolio assistant right now. You can still explore the projects, experience, skills, and resume directly.";
      setTurns((t) => [
        ...t,
        { id: ++serial.current, role: "assistant", text, error: true },
      ]);
    } finally {
      requestBusy.current = false;
      setBusy(false);
      if (active.current) {
        companionEvents.emit({ type: "AI_REQUEST_END" });
        input.current?.focus({ preventScroll: true });
      }
    }
  };
  const clear = async () => {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setBusy(true);
    try {
      await clearAssistant(conversation.current);
      conversation.current = null;
      setTurns([]);
      setMessage("");
    } catch (error) {
      setTurns((t) => [
        ...t,
        {
          id: ++serial.current,
          role: "assistant",
          text: (error as Error).message,
          error: true,
        },
      ]);
    } finally {
      requestBusy.current = false;
      setBusy(false);
      input.current?.focus();
    }
  };
  if (!open) return null;
  return (
    <aside
      ref={panel}
      id="portfolio-assistant"
      className="assistant-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="assistant-title"
      data-spidey-exclusion
    >
      <div className="assistant-header">
        <span className="assistant-emblem" aria-hidden="true">
          ✧
        </span>
        <div>
          <span className="eyebrow">YOUR GUIDE TO THE ENGINEER</span>
          <h2 id="assistant-title">
            Ask Spidey<span>.</span>
          </h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close portfolio assistant"
        >
          <X size={20} />
        </button>
      </div>
      <div className="assistant-status">
        <span className="status-dot" />
        <span>{mode}</span>
        <button onClick={clear} disabled={busy || !turns.length}>
          Clear
        </button>
      </div>
      <div
        className="assistant-log"
        ref={log}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={busy}
      >
        {!turns.length && (
          <div className="assistant-welcome">
            <span className="assistant-orbit" aria-hidden="true">
              ✧
            </span>
            <h3>
              A little Spidey sense.
              <br />A clear view of Ashish.
            </h3>
            <p>
              Ask about his projects, backend work, cloud tools or open-source
              contributions. Every professional claim comes from verified
              portfolio data.
            </p>
            <div className="assistant-starters">
              {starters.map((q) => (
                <button key={q} disabled={busy} onClick={() => void send(q)}>
                  {q}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t) => (
          <article
            key={t.id}
            className={`chat-turn ${t.role} ${t.error ? "chat-error" : ""}`}
          >
            <span className="chat-speaker">
              {t.role === "user" ? "YOU" : "SPIDEY"}
            </span>
            <p>{t.text}</p>
            {t.reply?.sources.length ? (
              <div className="chat-sources" aria-label="Answer sources">
                {t.reply.sources.slice(0, 4).map((s) => (
                  <span key={s.id}>{s.label}</span>
                ))}
              </div>
            ) : null}
            {t.reply?.suggested_actions.length ? (
              <div className="chat-actions">
                {t.reply.suggested_actions.map((a) => (
                  <button
                    key={`${a.type}:${a.target}`}
                    onClick={() => onAction(a)}
                  >
                    {a.label}
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            ) : null}
            {t.error && (
              <div className="chat-actions">
                <button
                  onClick={() =>
                    onAction({
                      type: "NAVIGATE_SECTION",
                      target: "projects",
                      label: "View projects",
                    })
                  }
                >
                  View projects ↗
                </button>
                <button
                  onClick={() =>
                    onAction({
                      type: "DOWNLOAD_RESUME",
                      target: "resume",
                      label: "Resume",
                    })
                  }
                >
                  Download Resume ↓
                </button>
              </div>
            )}
          </article>
        ))}
        {busy && (
          <div className="assistant-thinking" role="status">
            <i />
            <i />
            <i />
            <span>Checking the verified portfolio…</span>
          </div>
        )}
      </div>
      <form
        className="assistant-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send(message);
        }}
      >
        <label className="sr-only" htmlFor="assistant-message">
          Ask about Ashish’s professional profile
        </label>
        <textarea
          id="assistant-message"
          ref={input}
          rows={2}
          maxLength={1000}
          placeholder="Ask about Ashish’s work…"
          value={message}
          disabled={busy}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send(message);
            }
          }}
        />
        <button
          type="submit"
          disabled={busy || message.trim().length < 2}
          aria-label="Send question"
        >
          <ArrowUpRight size={22} />
        </button>
      </form>
      {turns.at(-1)?.reply?.warning && (
        <p className="assistant-warning" role="status">
          {turns.at(-1)?.reply?.warning}
        </p>
      )}
      <small className="assistant-privacy">
        Temporary visit context · no permanent chat history
      </small>
    </aside>
  );
}
