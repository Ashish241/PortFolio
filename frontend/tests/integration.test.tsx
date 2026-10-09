import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import React from "react";
const python = process.env.PORTFOLIO_TEST_PYTHON;
test(
  "rendered assistant and contact form reach FastAPI over real loopback HTTP",
  { skip: !python, timeout: 35000 },
  async () => {
    const backend = fileURLToPath(new URL("../../backend/", import.meta.url));
    const child = spawn(python!, ["tests/ui_server.py"], {
      cwd: backend,
      env: {
        ...process.env,
        PYTHONPATH: [backend, process.env.PYTHONPATH]
          .filter(Boolean)
          .join(process.platform === "win32" ? ";" : ":"),
      },
    });
    let logs = "";
    child.stderr.on("data", (b) => (logs += b.toString()));
    const lines = createInterface({ input: child.stdout });
    const ready = await Promise.race([
      new Promise<{ port: number }>((resolve, reject) => {
        lines.on("line", (line) => {
          try {
            const data = JSON.parse(line);
            if (data.port) resolve(data);
          } catch {}
        });
        child.on("exit", (code) =>
          reject(new Error(`API exited ${code}: ${logs}`)),
        );
      }),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`API startup timeout: ${logs}`)),
          12000,
        );
        timer.unref();
      }),
    ]);
    const base = `http://127.0.0.1:${ready.port}`,
      nativeFetch = globalThis.fetch;
    const dom = new JSDOM("<body/>", { url: base });
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      HTMLElement: dom.window.HTMLElement,
      Event: dom.window.Event,
      FormData: dom.window.FormData,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: dom.window.navigator,
      configurable: true,
    });
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    // Resolve relative URLs only; all HTTP requests use Node's real fetch and real FastAPI routes.
    const calls: { path: string; status: number }[] = [];
    globalThis.fetch = async (url, options) => {
      try {
        const response = await nativeFetch(new URL(String(url), base), options);
        calls.push({ path: String(url), status: response.status });
        return response;
      } catch (error) {
        console.error("HTTP integration error", error, logs);
        throw error;
      }
    };
    const { render, fireEvent, waitFor, cleanup } =
      await import("@testing-library/react");
    const { AssistantPanel } = await import("../src/components/AssistantPanel");
    const { ContactForm } = await import("../src/components/ContactForm");
    try {
      const chat = render(
        <AssistantPanel open onClose={() => {}} onAction={() => {}} />,
      );
      fireEvent.click(chat.getByText("Open-source work?"));
      await waitFor(() => assert.ok(chat.getByText(/FindMyGSoC PR #742/)), {
        timeout: 8000,
      }).catch((error) => {
        throw new Error(
          `Chat failed; calls=${JSON.stringify(calls)}; backend=${logs}; ${error}`,
        );
      });
      assert.ok(chat.getByText(/Development: live AI is disabled/));
      assert.ok(
        calls.some((c) => c.path === "/api/assistant/chat" && c.status === 200),
      );
      cleanup();
      const contact = render(<ContactForm />);
      const fill = (subject: string) => {
        fireEvent.change(contact.getByLabelText("Your name"), {
          target: { value: "Integration Recruiter" },
        });
        fireEvent.change(contact.getByLabelText("Email address"), {
          target: { value: "recruiter@example.com" },
        });
        fireEvent.change(contact.getByLabelText("Subject"), {
          target: { value: subject },
        });
        fireEvent.change(contact.getByLabelText("Message"), {
          target: {
            value:
              "A real HTTP integration test for the portfolio contact form.",
          },
        });
      };
      await new Promise((resolve) => setTimeout(resolve, 2100));
      fill("Stored inquiry");
      fireEvent.submit(contact.container.querySelector("form")!);
      await waitFor(
        () => assert.ok(contact.getByText(/Message received and stored/)),
        { timeout: 8000 },
      );
      assert.ok(
        calls.some((c) => c.path === "/api/contact" && c.status === 201),
      );
      let records = await (
        await nativeFetch(`${base}/__test__/contacts`)
      ).json();
      assert.equal(records.length, 1);
      assert.equal(records[0].status, "NEW");
      assert.equal(records[0].delivery, "DISABLED");
      await nativeFetch(`${base}/__test__/faults`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage: true }),
      });
      await new Promise((resolve) => setTimeout(resolve, 2100));
      fill("Failed storage");
      fireEvent.submit(contact.container.querySelector("form")!);
      await waitFor(
        () => assert.ok(contact.container.querySelector(".form-error")),
        { timeout: 8000 },
      );
      assert.equal(contact.container.querySelector(".form-success"), null);
      records = await (await nativeFetch(`${base}/__test__/contacts`)).json();
      assert.equal(records.length, 1);
      await nativeFetch(`${base}/__test__/faults`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storage: false, email: true }),
      });
      fill("Preserved after email failure");
      fireEvent.submit(contact.container.querySelector("form")!);
      await waitFor(
        () => assert.ok(contact.getByText(/Message received and stored/)),
        { timeout: 8000 },
      );
      await waitFor(
        async () => {
          records = await (
            await nativeFetch(`${base}/__test__/contacts`)
          ).json();
          assert.equal(records.at(-1).delivery, "FAILED");
        },
        { timeout: 8000 },
      );
      assert.equal(records.length, 2);
      assert.match(logs, /Email notification disabled in development/);
      assert.match(logs, /Stored message retained/);
    } finally {
      cleanup();
      globalThis.fetch = nativeFetch;
      child.stdin.end("stop\n");
      lines.close();
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null) resolve();
        else child.once("exit", () => resolve());
      });
    }
  },
);
