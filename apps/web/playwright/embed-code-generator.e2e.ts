import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

function chooseEmbedType(page: Page, embedType: string) {
  page.locator(`[data-testid=${embedType}]`).click();
}

async function gotToPreviewTab(page: Page) {
  // To prevent early timeouts
  // eslint-disable-next-line playwright/no-wait-for-timeout
  await page.waitForTimeout(1000);
  await page.locator("[data-testid=embed-tabs]").locator("text=Preview").click();
}

async function clickEmbedButton(page: Page) {
  const embedButton = page.locator("[data-testid=embed]");
  const embedUrl = await embedButton.getAttribute("data-test-embed-url");
  embedButton.click();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return embedUrl!;
}

async function clickFirstEventTypeEmbedButton(page: Page) {
  const menu = page.locator("[data-testid*=event-type-options]").first();
  await menu.click();
  const embedUrl = await clickEmbedButton(page);
  return embedUrl;
}

async function expectToBeNavigatingToEmbedTypesDialog(
  page: Page,
  { embedUrl, basePage }: { embedUrl: string | null; basePage: string }
) {
  if (!embedUrl) {
    throw new Error("Couldn't find embedUrl");
  }
  await page.waitForURL((url) => {
    return (
      url.pathname === basePage &&
      url.searchParams.get("dialog") === "embed" &&
      url.searchParams.get("embedUrl") === embedUrl
    );
  });
}

async function expectToBeNavigatingToEmbedCodeAndPreviewDialog(
  page: Page,
  { embedUrl, embedType, basePage }: { embedUrl: string | null; embedType: string; basePage: string }
) {
  if (!embedUrl) {
    throw new Error("Couldn't find embedUrl");
  }
  await page.waitForURL((url) => {
    return (
      url.pathname === basePage &&
      url.searchParams.get("dialog") === "embed" &&
      url.searchParams.get("embedUrl") === embedUrl &&
      url.searchParams.get("embedType") === embedType &&
      url.searchParams.get("embedTabName") === "embed-code"
    );
  });
}

async function expectToContainValidCode(page: Page, { embedType }: { embedType: string }) {
  const embedCode = await page.locator("[data-testid=embed-code]").inputValue();
  expect(embedCode.includes("(function (C, A, L)")).toBe(true);
  expect(embedCode.includes(`Cal ${embedType} embed code begins`)).toBe(true);
  return {
    message: () => `passed`,
    pass: true,
  };
}

async function expectToContainValidPreviewIframe(
  page: Page,
  { embedType, calLink }: { embedType: string; calLink: string }
) {
  expect(await page.locator("[data-testid=embed-preview]").getAttribute("src")).toContain(
    `/preview.html?embedType=${embedType}&calLink=${calLink}`
  );
}

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Embed Code Generator Tests", () => {
  test.beforeEach(async ({ users }) => {
    const pro = await users.create();
    await pro.login();
  });

  test.describe("Event Types Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/event-types");
    });

    test("open Embed Dialog and choose Inline for First Event Type", async ({ page, users }) => {
      const [pro] = users.get();
      const embedUrl = await clickFirstEventTypeEmbedButton(page);
      await expectToBeNavigatingToEmbedTypesDialog(page, {
        embedUrl,
        basePage: "/event-types",
      });

      chooseEmbedType(page, "inline");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        embedUrl,
        embedType: "inline",
        basePage: "/event-types",
      });

      await expectToContainValidCode(page, { embedType: "inline" });

      await gotToPreviewTab(page);

      await expectToContainValidPreviewIframe(page, {
        embedType: "inline",
        calLink: `${pro.username}/30-min`,
      });
    });

    test("open Embed Dialog and choose floating-popup for First Event Type", async ({ page, users }) => {
      const [pro] = users.get();
      const embedUrl = await clickFirstEventTypeEmbedButton(page);

      await expectToBeNavigatingToEmbedTypesDialog(page, {
        embedUrl,
        basePage: "/event-types",
      });

      chooseEmbedType(page, "floating-popup");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        embedUrl,
        embedType: "floating-popup",
        basePage: "/event-types",
      });
      await expectToContainValidCode(page, { embedType: "floating-popup" });

      await gotToPreviewTab(page);
      await expectToContainValidPreviewIframe(page, {
        embedType: "floating-popup",
        calLink: `${pro.username}/30-min`,
      });
    });

    test("open Embed Dialog and choose element-click for First Event Type", async ({ page, users }) => {
      const [pro] = users.get();
      const embedUrl = await clickFirstEventTypeEmbedButton(page);

      await expectToBeNavigatingToEmbedTypesDialog(page, {
        embedUrl,
        basePage: "/event-types",
      });

      chooseEmbedType(page, "element-click");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        embedUrl,
        embedType: "element-click",
        basePage: "/event-types",
      });
      await expectToContainValidCode(page, { embedType: "element-click" });

      await gotToPreviewTab(page);
      await expectToContainValidPreviewIframe(page, {
        embedType: "element-click",
        calLink: `${pro.username}/30-min`,
      });
    });
  });

  test.describe("Event Type Edit Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/event-types`);
      await Promise.all([
        page.locator('[href*="/event-types/"]').first().click(),
        page.waitForURL((url) => url.pathname.startsWith("/event-types/")),
      ]);
    });

    test("open Embed Dialog for the Event Type", async ({ page }) => {
      const basePage = new URL(page.url()).pathname;
      const embedUrl = await clickEmbedButton(page);
      await expectToBeNavigatingToEmbedTypesDialog(page, {
        embedUrl,
        basePage,
      });

      chooseEmbedType(page, "inline");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        embedUrl,
        basePage,
        embedType: "inline",
      });

      await expectToContainValidCode(page, {
        embedType: "inline",
      });

      await gotToPreviewTab(page);

      await expectToContainValidPreviewIframe(page, {
        embedType: "inline",
        calLink: decodeURIComponent(embedUrl),
      });
    });
  });
});
