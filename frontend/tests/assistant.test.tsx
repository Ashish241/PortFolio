import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
const dom = new JSDOM(
  "<html><body><button id='launch'>Ask</button></body></html>",
  { url: "https://portfolio.test" },
);
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Event: dom.window.Event,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const { render, fireEvent, waitFor, cleanup } =
  await import("@testing-library/react");
const { AssistantPanel } = await import("../src/components/AssistantPanel");
const { companionEvents } = await import("../src/companion/events");
test("assistant sends questions, renders verified sources/actions, handles follow-ups and clears", async () => {
  const calls: any[] = [],
    actions: any[] = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options?.body as string);
    calls.push({ url, body });
    return new Response(
      JSON.stringify(
        String(url).endsWith("/clear")
          ? { cleared: true }
          : {
              conversation_id: "00000000-0000-4000-a000-000000000001",
              answer: "KubASIE forecasts workload up to 60 minutes ahead.",
              suggested_actions: [
                {
                  type: "OPEN_PROJECT",
                  target: "kubasie",
                  label: "Explore KubASIE",
                },
              ],
              sources: [{ id: "project:kubasie", label: "Resume · KubASIE" }],
              mode: "groq",
            },
      ),
      { status: 200 },
    );
  };
  const view = render(
    <AssistantPanel
      open
      onClose={() => {}}
      onAction={(a) => actions.push(a)}
    />,
  );
  try {
    fireEvent.click(view.getByText("Show his strongest projects"));
    await waitFor(() => assert.ok(view.getByText(/forecasts workload/)));
    assert.equal(companionEvents.ai, "response");
    assert.ok(view.getByText("Groq AI · verified portfolio facts"));
    assert.ok(view.getByText("Resume · KubASIE"));
    fireEvent.click(view.getByText("Explore KubASIE"));
    assert.equal(actions[0].target, "kubasie");
    fireEvent.change(
      view.getByLabelText("Ask about Ashish’s professional profile"),
      { target: { value: "What technologies did he use?" } },
    );
    fireEvent.click(view.getByLabelText("Send question"));
    await waitFor(() => assert.equal(calls.length, 2));
    assert.equal(
      calls[1].body.conversation_id,
      calls[0].body.conversation_id ?? "00000000-0000-4000-a000-000000000001",
    );
    await waitFor(() =>
      assert.equal(view.getByText("Clear").hasAttribute("disabled"), false),
    );
    fireEvent.click(view.getByText("Clear"));
    await waitFor(() =>
      assert.ok(view.getByText("Show his strongest projects")),
    );
    assert.ok(String(calls.at(-1).url).endsWith("/clear"));
  } finally {
    cleanup();
    globalThis.fetch = oldFetch;
  }
});
test("provider failure leaves direct portfolio actions available and Escape closes the panel", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("network unavailable");
  };
  let closed = false;
  const view = render(
    <AssistantPanel
      open
      onClose={() => {
        closed = true;
      }}
      onAction={() => {}}
    />,
  );
  try {
    fireEvent.click(view.getByText("Backend experience?"));
    await waitFor(() =>
      assert.ok(
        view.getByText(/having trouble accessing the portfolio assistant/),
      ),
    );
    assert.ok(view.getByText("View projects ↗"));
    fireEvent.keyDown(document, { key: "Escape" });
    assert.ok(closed);
  } finally {
    cleanup();
    globalThis.fetch = oldFetch;
  }
});

test("outside pointer closes chat while panel and shared triggers stay open", () => {
  let closed = 0;
  const trigger = document.getElementById("launch")!;
  trigger.className = "assistant-launch";
  const view = render(
    <AssistantPanel open onClose={() => closed++} onAction={() => {}} />,
  );
  fireEvent.pointerDown(view.getByRole("dialog"));
  fireEvent.pointerDown(view.getByRole("textbox"));
  fireEvent.pointerDown(view.getByText("Tell me about Ashish"));
  fireEvent.pointerDown(trigger);
  assert.equal(closed, 0);
  fireEvent.pointerDown(document.body);
  assert.equal(closed, 1);
  cleanup();
  fireEvent.pointerDown(document.body);
  assert.equal(closed, 1, "listener removed after unmount");
});

test("clear invalidates a pending answer and allows a fresh question", async () => {
  const oldFetch = globalThis.fetch;
  let finish!: (value: Response) => void;
  let calls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/clear")) return new Response('{"cleared":true}');
    calls++;
    if (calls === 1) return new Promise<Response>((resolve) => { finish = resolve; });
    return new Response(JSON.stringify({ conversation_id: "00000000-0000-4000-a000-000000000002", answer: "Fresh answer", suggested_actions: [], sources: [], mode: "grounded" }));
  };
  const view = render(<AssistantPanel open onClose={() => {}} onAction={() => {}} />);
  try {
    fireEvent.click(view.getByText("Backend experience?"));
    await waitFor(() => assert.equal(calls, 1));
    fireEvent.click(view.getByText("Clear"));
    assert.ok(view.getByText("Backend experience?"));
    finish(new Response(JSON.stringify({ conversation_id: "00000000-0000-4000-a000-000000000001", answer: "Stale answer", suggested_actions: [], sources: [], mode: "grounded" })));
    fireEvent.click(view.getByText("Backend experience?"));
    await waitFor(() => assert.ok(view.getByText("Fresh answer")));
    assert.equal(view.queryByText("Stale answer"), null);
  } finally { cleanup(); globalThis.fetch = oldFetch; }
});

test("education reply renders only the typed timeline component", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ conversation_id: "00000000-0000-4000-a000-000000000001", answer: "Here is Ashish's educational journey.", suggested_actions: [], sources: [], mode: "grounded", ui_component: "education_timeline", data: [
    { level: "10th Grade", institution: "Saraswati Shishu Vidya Mandir", year: "2021", score: "77%" },
    { level: "12th Grade", institution: "Gossner College, Ranchi", year: "2023", score: "66%" },
    { level: "B.Tech (CSE)", institution: "Amity University Jharkhand", year: "Expected 2027", score: "7.66 CGPA" },
  ] }));
  const view = render(<AssistantPanel open onClose={() => {}} onAction={() => {}} />);
  try {
    fireEvent.click(view.getByText("Tell me about Ashish"));
    await waitFor(() => assert.ok(view.getByLabelText("Ashish's education timeline")));
    assert.equal(view.getByLabelText("Ashish's education timeline").querySelectorAll("li").length, 3);
    assert.ok(view.getByText("Expected 2027"));
  } finally { cleanup(); globalThis.fetch = oldFetch; }
});

test("a failed answer releases Send for a successful retry", async () => {
  const oldFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) throw new TypeError("network unavailable");
    return new Response(JSON.stringify({ conversation_id: "00000000-0000-4000-a000-000000000001", answer: "Docker is a verified skill.", suggested_actions: [], sources: [], mode: "grounded" }));
  };
  const view = render(<AssistantPanel open onClose={() => {}} onAction={() => {}} />);
  try {
    fireEvent.click(view.getByText("Backend experience?"));
    await waitFor(() => assert.ok(view.getByText(/having trouble accessing the portfolio assistant/)));
    fireEvent.change(view.getByLabelText("Ask about Ashish’s professional profile"), { target: { value: "Does he know Docker?" } });
    fireEvent.click(view.getByLabelText("Send question"));
    await waitFor(() => assert.ok(view.getByText("Docker is a verified skill.")));
    assert.equal(calls, 2);
  } finally { cleanup(); globalThis.fetch = oldFetch; }
});
