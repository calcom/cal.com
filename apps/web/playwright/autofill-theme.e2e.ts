import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Autofill text color", () => {
  test("autofilled input uses theme text color instead of browser default", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "CDP Autofill.trigger is Chromium-only");

    await page.goto("/auth/login");
    await page.waitForLoadState("domcontentloaded");

    // CDP autofill only fills credit-card forms, so inject one into the live
    // page. It is styled by the app's real global stylesheet, which is what
    // this test exercises: the `:-webkit-autofill` override in globals.css.
    await page.evaluate(() => {
      const form = document.createElement("form");
      form.innerHTML = `
        <input id="autofill-cc-name" name="cc-name" autocomplete="cc-name" style="color: var(--cal-text)">
        <input id="autofill-cc-number" name="cc-number" autocomplete="cc-number" style="color: var(--cal-text)">
        <input id="autofill-cc-exp" name="cc-exp" autocomplete="cc-exp" style="color: var(--cal-text)">
        <input id="autofill-cc-csc" name="cc-csc" autocomplete="cc-csc" style="color: var(--cal-text)">
      `;
      document.body.appendChild(form);
    });

    const client = await page.context().newCDPSession(page);
    await client.send("Autofill.enable");
    const { root } = await client.send("DOM.getDocument");
    const { nodeId } = await client.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: "#autofill-cc-number",
    });
    const { node } = await client.send("DOM.describeNode", { nodeId });
    const {
      frameTree: { frame },
    } = await client.send("Page.getFrameTree");
    await client.send("DOM.focus", { nodeId });
    await client.send("Autofill.trigger", {
      fieldId: node.backendNodeId,
      frameId: frame.id,
      card: {
        number: "4444444444444444",
        name: "Test User",
        expiryMonth: "12",
        expiryYear: "2030",
        cvc: "123",
      },
    });

    const input = page.locator("#autofill-cc-number");
    await expect(input).toHaveValue("4444444444444444");

    const assertMatchesTheme = async () => {
      const result = await input.evaluate((el) => {
        // Resolve --cal-text to an rgb value via a probe element
        const probe = document.createElement("span");
        probe.style.color = "var(--cal-text)";
        document.body.appendChild(probe);
        const expected = getComputedStyle(probe).color;
        probe.remove();
        return {
          autofilled: el.matches(":-webkit-autofill"),
          textFillColor: getComputedStyle(el).webkitTextFillColor,
          expected,
        };
      });
      // Guard against the test passing vacuously if autofill never triggered
      expect(result.autofilled).toBe(true);
      expect(result.textFillColor).toBe(result.expected);
    };

    // Light theme
    await assertMatchesTheme();

    // Dark theme: flipping the theme class must recolor the autofilled text
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await assertMatchesTheme();
  });
});
