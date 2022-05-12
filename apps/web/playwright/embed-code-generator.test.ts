import { expect, Page, test } from "@playwright/test";

function chooseEmbedType(page: Page, embedType: string) {
  page.locator(`[data-testid=${embedType}]`).click();
}

async function gotToPreviewTab(page: Page) {
  await page.locator("[data-testid=embed-tabs]").locator("text=Preview").click();
}

async function clickEmbedButton(page: Page) {
  const embedButton = page.locator("[data-testid=event-type-embed]");
  const eventTypeId = await embedButton.getAttribute("data-test-eventtype-id");
  embedButton.click();
  return eventTypeId;
}

async function clickFirstEventTypeEmbedButton(page: Page) {
  const menu = page.locator("[data-testid*=event-type-options]").first();
  await menu.click();
  const eventTypeId = await clickEmbedButton(page);
  return eventTypeId;
}

async function expectToBeNavigatingToEmbedTypesDialog(
  page: Page,
  { eventTypeId, basePage }: { eventTypeId: string | null; basePage: string }
) {
  if (!eventTypeId) {
    throw new Error("Couldn't find eventTypeId");
  }
  await page.waitForNavigation({
    url: (url) => {
      return (
        url.pathname === basePage &&
        url.searchParams.get("dialog") === "embed" &&
        url.searchParams.get("eventTypeId") === eventTypeId
      );
    },
  });
}

async function expectToBeNavigatingToEmbedCodeAndPreviewDialog(
  page: Page,
  { eventTypeId, embedType, basePage }: { eventTypeId: string | null; embedType: string; basePage: string }
) {
  if (!eventTypeId) {
    throw new Error("Couldn't find eventTypeId");
  }
  await page.waitForNavigation({
    url: (url) => {
      return (
        url.pathname === basePage &&
        url.searchParams.get("dialog") === "embed" &&
        url.searchParams.get("eventTypeId") === eventTypeId &&
        url.searchParams.get("embedType") === embedType &&
        url.searchParams.get("tabName") === "embed-code"
      );
    },
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

test.describe("Embed Code Generator Tests", () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.describe("Event Types Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/event-types");
    });

    test("open Embed Dialog and choose Inline for First Event Type", async ({ page }) => {
      const eventTypeId = await clickFirstEventTypeEmbedButton(page);
      await expectToBeNavigatingToEmbedTypesDialog(page, {
        eventTypeId,
        basePage: "/event-types",
      });

      chooseEmbedType(page, "inline");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        eventTypeId,
        embedType: "inline",
        basePage: "/event-types",
      });

      await expectToContainValidCode(page, { embedType: "inline" });

      await gotToPreviewTab(page);

      await expectToContainValidPreviewIframe(page, { embedType: "inline", calLink: "pro/30min" });
    });

    test("open Embed Dialog and choose floating-popup for First Event Type", async ({ page }) => {
      const eventTypeId = await clickFirstEventTypeEmbedButton(page);

      await expectToBeNavigatingToEmbedTypesDialog(page, {
        eventTypeId,
        basePage: "/event-types",
      });

      chooseEmbedType(page, "floating-popup");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        eventTypeId,
        embedType: "floating-popup",
        basePage: "/event-types",
      });
      await expectToContainValidCode(page, { embedType: "floating-popup" });

      await gotToPreviewTab(page);
      await expectToContainValidPreviewIframe(page, { embedType: "floating-popup", calLink: "pro/30min" });
    });

    test("open Embed Dialog and choose element-click for First Event Type", async ({ page }) => {
      const eventTypeId = await clickFirstEventTypeEmbedButton(page);

      await expectToBeNavigatingToEmbedTypesDialog(page, {
        eventTypeId,
        basePage: "/event-types",
      });

      chooseEmbedType(page, "element-click");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        eventTypeId,
        embedType: "element-click",
        basePage: "/event-types",
      });
      await expectToContainValidCode(page, { embedType: "element-click" });

      await gotToPreviewTab(page);
      await expectToContainValidPreviewIframe(page, { embedType: "element-click", calLink: "pro/30min" });
    });
  });

  test.describe("Event Type Edit Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/event-types/3");
    });

    test("open Embed Dialog for the Event Type", async ({ page }) => {
      const eventTypeId = await clickEmbedButton(page);

      await expectToBeNavigatingToEmbedTypesDialog(page, {
        eventTypeId,
        basePage: "/event-types/3",
      });

      chooseEmbedType(page, "inline");

      await expectToBeNavigatingToEmbedCodeAndPreviewDialog(page, {
        eventTypeId,
        basePage: "/event-types/3",
        embedType: "inline",
      });

      await expectToContainValidCode(page, {
        embedType: "inline",
      });

      gotToPreviewTab(page);

      await expectToContainValidPreviewIframe(page, {
        embedType: "inline",
        calLink: "pro/30min",
      });
    });
  });
});
