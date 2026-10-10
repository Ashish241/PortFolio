import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const data = JSON.parse(
  readFileSync(
    new URL("../../content/portfolio.json", import.meta.url),
    "utf8",
  ),
);
test("architecture edges reference real nodes in the same project", () => {
  for (const project of data.projects) {
    const keys = new Set(project.nodes.map((n) => n.key));
    for (const edge of project.edges) {
      assert.ok(keys.has(edge.source));
      assert.ok(keys.has(edge.target));
    }
  }
});
test("resume status and links preserve the documented distinctions", () => {
  assert.equal(
    data.contributions.find((c) => c.pr_number === 12989).status,
    "Contribution",
  );
  assert.equal(data.certifications[0].kind, "Training");
  assert.equal(data.projects.filter((p) => p.live_url).length, 1);
  assert.equal(data.projects.filter((p) => p.featured).length, 1);
});
