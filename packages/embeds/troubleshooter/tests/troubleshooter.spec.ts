import { test, expect } from "@playwright/test";

// Helper to inject the troubleshooter script
async function injectTroubleshooter(page) {
  await page.addScriptTag({ path: "./dist/troubleshooter.js" });
  await page.waitForFunction(() => window.__calEmbedTroubleshooter !== undefined);
}

// Helper to create a test page with Cal.com embed
async function setupTestPage(page, options = {}) {
  const { includeEmbed = true, embedLoaded = true, includeElements = true, withErrors = false } = options;

  await page.goto("about:blank");

  // Create a basic HTML page
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Page</title>
    </head>
    <body>
      <h1>Cal.com Embed Test Page</h1>
      ${
        includeElements
          ? `
        <div data-cal-link="john/30min" data-cal-config='{"theme":"dark"}'>Book a call</div>
        <cal-inline data-cal-link="team/sales"></cal-inline>
      `
          : ""
      }
    </body>
    </html>
  `);

  if (includeEmbed) {
    // Mock window.Cal object
    await page.evaluate((loaded) => {
      window.Cal = {
        loaded: loaded,
        q: [],
        ns: { custom: {} },
        version: "1.0.0",
        fingerprint: "abc123",
        __config: {
          calOrigin: "https://cal.com",
        },
        config: {
          forwardQueryParams: false,
        },
      };
    }, embedLoaded);

    // Add a mock embed script tag
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.src = "https://cal.com/embed.js";
      document.head.appendChild(script);
    });
  }

  if (withErrors) {
    // Add error elements
    await page.evaluate(() => {
      const errorEl = document.createElement("cal-modal-box");
      errorEl.setAttribute("state", "failed");
      errorEl.setAttribute("data-error-code", "404");
      document.body.appendChild(errorEl);
    });
  }
}

test.describe("Cal.com Embed Troubleshooter", () => {
  test("should initialize and show troubleshooter UI", async ({ page }) => {
    await setupTestPage(page);
    await injectTroubleshooter(page);

    // Check if troubleshooter container exists
    const container = page.locator("#cal-troubleshooter");
    await expect(container).toBeVisible();

    // Check header
    await expect(container.locator("#cal-troubleshooter-header")).toContainText(
      "Cal.com Embed Troubleshooter"
    );

    // Check tabs
    await expect(container.locator('.cal-tab[data-tab="diagnostics"]')).toBeVisible();
    await expect(container.locator('.cal-tab[data-tab="console"]')).toBeVisible();
    await expect(container.locator('.cal-tab[data-tab="network"]')).toBeVisible();
  });

  test("should detect Cal.com embed installation", async ({ page }) => {
    await setupTestPage(page, { includeEmbed: true, embedLoaded: true });
    await injectTroubleshooter(page);

    // Wait for diagnostics to complete
    await page.waitForSelector(".cal-diagnostic-section");

    // Check embed installation section
    const embedSection = page.locator(".cal-diagnostic-section").first();
    await expect(embedSection.locator(".cal-diagnostic-header")).toContainText("Embed Installation");
    await expect(embedSection.locator(".cal-status-success")).toBeVisible();

    // Click to expand
    await embedSection.locator(".cal-diagnostic-header").click();

    // Check specific checks
    await expect(embedSection).toContainText("window.Cal is defined");
    await expect(embedSection).toContainText("Embed is fully loaded");
    await expect(embedSection).toContainText("Namespaces: custom");
    await expect(embedSection).toContainText("Version: 1.0.0");
  });

  test("should detect missing Cal.com embed", async ({ page }) => {
    await setupTestPage(page, { includeEmbed: false });
    await injectTroubleshooter(page);

    await page.waitForSelector(".cal-diagnostic-section");

    const embedSection = page.locator(".cal-diagnostic-section").first();
    await expect(embedSection.locator(".cal-status-error")).toBeVisible();

    await embedSection.locator(".cal-diagnostic-header").click();
    await expect(embedSection).toContainText("window.Cal is not defined");
    await expect(embedSection).toContainText("The Cal.com embed snippet has not been loaded");
  });

  test("should detect embed elements", async ({ page }) => {
    await setupTestPage(page, { includeElements: true });
    await injectTroubleshooter(page);

    await page.waitForSelector(".cal-diagnostic-section");

    // Find elements section
    const elementsSection = page.locator(".cal-diagnostic-section", { hasText: "Embed Elements" });
    await elementsSection.locator(".cal-diagnostic-header").click();

    await expect(elementsSection).toContainText("Trigger Elements: 1 found");
    await expect(elementsSection).toContainText("Inline Embed: 1 found");
    await expect(elementsSection).toContainText("Link: john/30min");
  });

  test("should detect configuration issues", async ({ page }) => {
    await setupTestPage(page);

    // Add element with invalid config
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.setAttribute("data-cal-link", "test");
      el.setAttribute("data-cal-config", "invalid json");
      document.body.appendChild(el);
    });

    await injectTroubleshooter(page);
    await page.waitForSelector(".cal-diagnostic-section");

    const configSection = page.locator(".cal-diagnostic-section", { hasText: "Configuration" });
    await expect(configSection.locator(".cal-status-error")).toBeVisible();

    await configSection.locator(".cal-diagnostic-header").click();
    await expect(configSection).toContainText("Invalid JSON in data-cal-config");
  });

  test("should detect error states", async ({ page }) => {
    await setupTestPage(page, { withErrors: true });
    await injectTroubleshooter(page);

    await page.waitForSelector(".cal-diagnostic-section");

    const errorSection = page.locator(".cal-diagnostic-section", { hasText: "Error Detection" });
    await expect(errorSection.locator(".cal-status-error")).toBeVisible();

    await errorSection.locator(".cal-diagnostic-header").click();
    await expect(errorSection).toContainText("Error on cal-modal-box");
    await expect(errorSection).toContainText("Code: 404");
  });

  test("should switch between tabs", async ({ page }) => {
    await setupTestPage(page);
    await injectTroubleshooter(page);

    // Initially diagnostics tab should be active
    await expect(page.locator("#tab-diagnostics")).toBeVisible();
    await expect(page.locator("#tab-console")).toBeHidden();
    await expect(page.locator("#tab-network")).toBeHidden();

    // Switch to console tab
    await page.locator('.cal-tab[data-tab="console"]').click();
    await expect(page.locator("#tab-console")).toBeVisible();
    await expect(page.locator("#tab-diagnostics")).toBeHidden();

    // Switch to network tab
    await page.locator('.cal-tab[data-tab="network"]').click();
    await expect(page.locator("#tab-network")).toBeVisible();
    await expect(page.locator("#tab-console")).toBeHidden();
  });

  test("should capture console errors", async ({ page }) => {
    await setupTestPage(page);

    // Generate some Cal-related console errors
    await page.evaluate(() => {
      console.error("Cal.com embed failed to load");
      console.error("Some other error");
      console.error("Embed configuration error");
    });

    await injectTroubleshooter(page);

    // Switch to console tab
    await page.locator('.cal-tab[data-tab="console"]').click();

    // Should show Cal-related errors
    await expect(page.locator(".cal-error-log")).toHaveCount(2);
    await expect(page.locator("#tab-console")).toContainText("Cal.com embed failed");
    await expect(page.locator("#tab-console")).toContainText("Embed configuration error");
    await expect(page.locator("#tab-console")).not.toContainText("Some other error");
  });

  test("should monitor network requests", async ({ page }) => {
    await setupTestPage(page);
    await injectTroubleshooter(page);

    // Make some Cal.com requests
    await page.evaluate(async () => {
      await fetch("https://cal.com/api/test", { method: "GET" }).catch(() => {
        /* ignore errors */
      });
      await fetch("https://app.cal.dev/api/slots", { method: "POST" }).catch(() => {
        /* ignore errors */
      });
    });

    // Switch to network tab
    await page.locator('.cal-tab[data-tab="network"]').click();

    // Wait for network entries to appear
    await page.waitForSelector(".cal-network-entry", { timeout: 5000 });

    // Should show network requests
    await expect(page.locator(".cal-network-entry")).toHaveCount(2);
    await expect(page.locator("#tab-network")).toContainText("https://cal.com/api/test");
    await expect(page.locator("#tab-network")).toContainText("https://app.cal.dev/api/slots");
  });

  test("should show recommendations", async ({ page }) => {
    await setupTestPage(page, { includeEmbed: false });
    await injectTroubleshooter(page);

    await page.waitForSelector(".cal-diagnostic-section");

    const recommendationsSection = page.locator(".cal-diagnostic-section", { hasText: "Recommendations" });
    await recommendationsSection.locator(".cal-diagnostic-header").click();

    await expect(recommendationsSection).toContainText("Install the embed snippet");
    await expect(recommendationsSection).toContainText("Add the Cal.com embed snippet to your page");
  });

  test("should refresh diagnostics", async ({ page }) => {
    await setupTestPage(page);
    await injectTroubleshooter(page);

    await page.waitForSelector(".cal-refresh-btn");

    // Add a new element after initial load
    await page.evaluate(() => {
      const el = document.createElement("cal-floating-button");
      el.setAttribute("data-cal-link", "new-link");
      document.body.appendChild(el);
    });

    // Click refresh
    await page.locator(".cal-refresh-btn").click();

    // Wait for diagnostics to reload
    await page.waitForSelector(".cal-diagnostic-section");

    // Check if new element is detected
    const elementsSection = page.locator(".cal-diagnostic-section", { hasText: "Embed Elements" });
    await elementsSection.locator(".cal-diagnostic-header").click();
    await expect(elementsSection).toContainText("Floating Button: 1 found");
  });

  test("should close troubleshooter", async ({ page }) => {
    await setupTestPage(page);
    await injectTroubleshooter(page);

    const container = page.locator("#cal-troubleshooter");
    await expect(container).toBeVisible();

    // Click close button
    await page.locator("#cal-troubleshooter-close").click();

    // Should be hidden
    await expect(container).toBeHidden();
  });

  test("should toggle troubleshooter visibility", async ({ page }) => {
    await setupTestPage(page);
    await injectTroubleshooter(page);

    const container = page.locator("#cal-troubleshooter");
    await expect(container).toBeVisible();

    // Close it
    await page.evaluate(() => window.__calEmbedTroubleshooter.hide());
    await expect(container).toBeHidden();

    // Toggle should show it again
    await page.evaluate(() => window.__calEmbedTroubleshooter.toggle());
    await expect(container).toBeVisible();

    // Toggle should hide it
    await page.evaluate(() => window.__calEmbedTroubleshooter.toggle());
    await expect(container).toBeHidden();
  });

  test("should auto-expand sections with errors", async ({ page }) => {
    await setupTestPage(page, { withErrors: true });
    await injectTroubleshooter(page);

    await page.waitForSelector(".cal-diagnostic-section");

    // Error section should be auto-expanded
    const errorSection = page.locator(".cal-diagnostic-section", { hasText: "Error Detection" });
    const errorBody = errorSection.locator(".cal-diagnostic-body");

    await expect(errorBody).toHaveClass(/active/);
    await expect(errorBody).toBeVisible();
  });

  test("should handle CSP detection", async ({ page }) => {
    await setupTestPage(page);

    // Add CSP meta tag without cal.com
    await page.evaluate(() => {
      const meta = document.createElement("meta");
      meta.httpEquiv = "Content-Security-Policy";
      meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'";
      document.head.appendChild(meta);
    });

    await injectTroubleshooter(page);
    await page.waitForSelector(".cal-diagnostic-section");

    const securitySection = page.locator(".cal-diagnostic-section", { hasText: "Security & Policies" });
    await expect(securitySection.locator(".cal-status-warning")).toBeVisible();

    await securitySection.locator(".cal-diagnostic-header").click();
    await expect(securitySection).toContainText("CSP may block Cal.com resources");
  });

  test("should detect CSS visibility issues", async ({ page }) => {
    await setupTestPage(page);

    // Create an iframe with visibility issues
    await page.evaluate(() => {
      // Add a Cal.com iframe
      const iframe = document.createElement("iframe");
      iframe.src = "https://cal.com/embed";
      iframe.name = "cal-embed-test";
      iframe.className = "cal-embed";
      iframe.style.display = "none"; // Visibility issue
      document.body.appendChild(iframe);

      // Add CSS rule targeting .cal-embed
      const style = document.createElement("style");
      style.textContent = ".cal-embed { width: 0; height: 0; }";
      document.head.appendChild(style);

      // Add another iframe with zero dimensions
      const iframe2 = document.createElement("iframe");
      iframe2.src = "https://app.cal.com/booking";
      iframe2.name = "cal-embed-booking";
      iframe2.style.width = "0px";
      iframe2.style.height = "0px";
      document.body.appendChild(iframe2);
    });

    await injectTroubleshooter(page);
    await page.waitForSelector(".cal-diagnostic-section");

    // Find the CSS & Visibility section
    const visibilitySection = page.locator(".cal-diagnostic-section", { hasText: "CSS & Visibility" });
    await expect(visibilitySection.locator(".cal-status-warning")).toBeVisible();

    await visibilitySection.locator(".cal-diagnostic-header").click();
    
    // Check for specific visibility issues
    await expect(visibilitySection).toContainText("display: none");
    await expect(visibilitySection).toContainText("width: 0");
    await expect(visibilitySection).toContainText("height: 0");
    await expect(visibilitySection).toContainText("Found CSS rules targeting .cal-embed");
  });

  test("should detect parent element visibility issues", async ({ page }) => {
    await setupTestPage(page);

    // Create an iframe inside a hidden parent
    await page.evaluate(() => {
      const parent = document.createElement("div");
      parent.style.display = "none";
      
      const iframe = document.createElement("iframe");
      iframe.src = "https://cal.com/embed";
      iframe.name = "cal-embed-hidden-parent";
      parent.appendChild(iframe);
      
      document.body.appendChild(parent);
    });

    await injectTroubleshooter(page);
    await page.waitForSelector(".cal-diagnostic-section");

    const visibilitySection = page.locator(".cal-diagnostic-section", { hasText: "CSS & Visibility" });
    await expect(visibilitySection.locator(".cal-status-warning")).toBeVisible();

    await visibilitySection.locator(".cal-diagnostic-header").click();
    await expect(visibilitySection).toContainText("parent has display: none");
  });
});
