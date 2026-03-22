import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

/**
 * Simple click-through test runner.
 *
 * Define a single scenario: { name, startPage, authenticated?, steps[] }.
 * Each step: { x, y, waitBefore? (ms), waitAfter? (ms), description? }
 *
 * After running, the scenario is displayed in a table with a "Save scenario"
 * button that persists it to the TestScenario database table via
 * POST /api/test-scenarios.
 */

interface ClickStep {
  x: number;
  y: number;
  waitBefore?: number;
  waitAfter?: number;
  description?: string;
}

interface Scenario {
  name: string;
  startPage: string;
  authenticated?: boolean;
  steps: ClickStep[];
}

// ── Define your scenario here ───────────────────────────────────────
const scenario: Scenario = {
  name: "Navigate /event-types",
  startPage: "/event-types",
  authenticated: true,
  steps: [
    { x: 90, y: 115, waitBefore: 1878, description: "Click at (90, 115)" },
    { x: 90, y: 115, waitBefore: 684, description: "Click at (90, 115)" },
    { x: 82, y: 213, waitBefore: 1049, description: "Click at (82, 213)" },
    { x: 85, y: 330, waitBefore: 2342, description: "Click at (85, 330)" },
    { x: 83, y: 363, waitBefore: 1325, description: "Click at (83, 363)" },
    { x: 73, y: 93, waitBefore: 2416, description: "Click at (73, 93)" },
    { x: 70, y: 75, waitBefore: 2068, description: "Click at (70, 75)" },
  ],
};
// ────────────────────────────────────────────────────────────────────

function buildScenarioPageHTML(s: Scenario): string {
  const rows = s.steps
    .map(
      (step, i) =>
        `<tr>
          <td style="border:1px solid #ccc;padding:6px">${i + 1}</td>
          <td style="border:1px solid #ccc;padding:6px">${step.x}</td>
          <td style="border:1px solid #ccc;padding:6px">${step.y}</td>
          <td style="border:1px solid #ccc;padding:6px">${step.waitBefore ?? ""}</td>
          <td style="border:1px solid #ccc;padding:6px">${step.waitAfter ?? ""}</td>
          <td style="border:1px solid #ccc;padding:6px">${step.description ?? ""}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><title>Scenario: ${s.name}</title></head>
<body style="font-family:sans-serif;padding:24px">
  <h2>Scenario: ${s.name}</h2>
  <p><strong>Start page:</strong> ${s.startPage} &nbsp; <strong>Authenticated:</strong> ${s.authenticated ?? false}</p>
  <table style="border-collapse:collapse;width:100%">
    <thead>
      <tr style="background:#f0f0f0">
        <th style="border:1px solid #ccc;padding:6px">#</th>
        <th style="border:1px solid #ccc;padding:6px">X</th>
        <th style="border:1px solid #ccc;padding:6px">Y</th>
        <th style="border:1px solid #ccc;padding:6px">Wait Before (ms)</th>
        <th style="border:1px solid #ccc;padding:6px">Wait After (ms)</th>
        <th style="border:1px solid #ccc;padding:6px">Description</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <br/>
  <button id="save-btn" style="padding:10px 24px;font-size:16px;cursor:pointer">Save scenario</button>
  <span id="save-status" style="margin-left:12px"></span>
  <script>
    const scenario = ${JSON.stringify(s)};
    document.getElementById("save-btn").addEventListener("click", async () => {
      const status = document.getElementById("save-status");
      status.textContent = "Saving...";
      try {
        const res = await fetch("/api/test-scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: scenario.name, scenario }),
        });
        if (res.ok) {
          const data = await res.json();
          status.textContent = "Saved (id: " + data.id + ")";
          status.style.color = "green";
        } else {
          const err = await res.text();
          status.textContent = "Error: " + err;
          status.style.color = "red";
        }
      } catch (e) {
        status.textContent = "Error: " + e.message;
        status.style.color = "red";
      }
    });
  </script>
</body></html>`;
}

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test(scenario.name, async ({ page, users }) => {
  if (scenario.authenticated) {
    const user = await users.create();
    await user.apiLogin();
  }

  await page.goto(scenario.startPage);
  await page.waitForLoadState("networkidle");

  for (const step of scenario.steps) {
    if (step.waitBefore) {
      await page.waitForTimeout(step.waitBefore);
    }

    await page.mouse.click(step.x, step.y);

    if (step.waitAfter) {
      await page.waitForTimeout(step.waitAfter);
    }
  }

  // Show the scenario table with a Save button
  await page.setContent(buildScenarioPageHTML(scenario));
  await expect(page.locator("#save-btn")).toBeVisible();

  // Click Save and wait for the API response
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/test-scenarios") && res.status() === 201),
    page.locator("#save-btn").click(),
  ]);

  const saved = await response.json();
  expect(saved.id).toBeTruthy();
  await expect(page.locator("#save-status")).toContainText("Saved");
});
