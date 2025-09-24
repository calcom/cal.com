import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { Linter } from "eslint";
import { parse } from "node-html-parser";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EMBED_LIB_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { MembershipRole } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

const linter = new Linter();
const eslintRules = {
  "no-undef": "error",
  "no-unused-vars": "off",
} as const;
test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Embed Code Generator Tests", () => {
  test.describe("Non-Organization", () => {
    test.beforeEach(async ({ users }) => {
      const pro = await users.create();
      await pro.apiLogin();
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

        await expectToContainValidCode(page, {
          language: "html",
          embedType: "inline",
          orgSlug: null,
        });

        await goToReactCodeTab(page);
        await expectToContainValidCode(page, {
          language: "react",
          embedType: "inline",
          orgSlug: null,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "inline",
          calLink: `${pro.username}/multiple-duration`,
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
        await expectToContainValidCode(page, {
          language: "html",
          embedType: "floating-popup",
          orgSlug: null,
        });

        await goToReactCodeTab(page);
        await expectToContainValidCode(page, {
          language: "react",
          embedType: "floating-popup",
          orgSlug: null,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "floating-popup",
          calLink: `${pro.username}/multiple-duration`,
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
        await expectToContainValidCode(page, {
          language: "html",
          embedType: "element-click",
          orgSlug: null,
        });

        await goToReactCodeTab(page);
        await expectToContainValidCode(page, {
          language: "react",
          embedType: "element-click",
          orgSlug: null,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "element-click",
          calLink: `${pro.username}/multiple-duration`,
        });
      });
    });
    test.describe("Event Type Edit Page", () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/event-types`);
        await Promise.all([
          page.locator('a[href*="/event-types/"]').first().click(),
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
          language: "html",
          embedType: "inline",
          orgSlug: null,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "inline",
          calLink: decodeURIComponent(embedUrl),
        });
      });
    });
  });

  test.describe("Organization", () => {
    test.beforeEach(async ({ users, orgs }) => {
      const org = await orgs.create({
        name: "TestOrg",
      });
      const user = await users.create({
        organizationId: org.id,
        roleInOrganization: MembershipRole.MEMBER,
      });
      await user.apiLogin();
    });
    test.describe("Event Types Page", () => {
      test.beforeEach(async ({ page }) => {
        await page.goto("/event-types");
      });

      test("open Embed Dialog and choose Inline for First Event Type", async ({ page, users }) => {
        const [user] = users.get();
        const { team: org } = await user.getOrgMembership();
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

        // Default tab is HTML code tab
        await expectToContainValidCode(page, {
          language: "html",
          embedType: "inline",
          orgSlug: org.slug,
        });

        await goToReactCodeTab(page);
        await expectToContainValidCode(page, {
          language: "react",
          embedType: "inline",
          orgSlug: org.slug,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "inline",
          calLink: `${user.username}/multiple-duration`,
          bookerUrl: getOrgFullOrigin(org?.slug ?? ""),
        });
      });

      test("open Embed Dialog and choose floating-popup for First Event Type", async ({ page, users }) => {
        const [user] = users.get();
        const { team: org } = await user.getOrgMembership();

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
        await expectToContainValidCode(page, {
          language: "html",
          embedType: "floating-popup",
          orgSlug: org.slug,
        });

        await goToReactCodeTab(page);
        await expectToContainValidCode(page, {
          language: "react",
          embedType: "floating-popup",
          orgSlug: org.slug,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "floating-popup",
          calLink: `${user.username}/multiple-duration`,
          bookerUrl: getOrgFullOrigin(org?.slug ?? ""),
        });
      });

      test("open Embed Dialog and choose element-click for First Event Type", async ({ page, users }) => {
        const [user] = users.get();
        const embedUrl = await clickFirstEventTypeEmbedButton(page);
        const { team: org } = await user.getOrgMembership();

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
        await expectToContainValidCode(page, {
          language: "html",
          embedType: "element-click",
          orgSlug: org.slug,
        });

        await goToReactCodeTab(page);
        await expectToContainValidCode(page, {
          language: "react",
          embedType: "element-click",
          orgSlug: org.slug,
        });

        // To prevent early timeouts
        await page.waitForTimeout(1000);
        await expectToContainValidPreviewIframe(page, {
          embedType: "element-click",
          calLink: `${user.username}/multiple-duration`,
          bookerUrl: getOrgFullOrigin(org?.slug ?? ""),
        });
      });
    });
  });
});

type EmbedType = "inline" | "floating-popup" | "element-click";
function chooseEmbedType(page: Page, embedType: EmbedType) {
  page.locator(`[data-testid=${embedType}]`).click();
}

async function goToReactCodeTab(page: Page) {
  // To prevent early timeo
  await page.waitForTimeout(1000);
  await page.locator("[data-testid=horizontal-tab-react]").click();
}

async function clickEmbedButton(page: Page) {
  const embedButton = page.locator("[data-testid=embed]");
  const embedUrl = await embedButton.getAttribute("data-test-embed-url");
  embedButton.click();

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
  {
    embedUrl,
    embedType,
    basePage,
  }: {
    embedUrl: string | null;
    embedType: EmbedType;
    basePage: string;
  }
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

async function expectToContainValidCode(
  page: Page,
  {
    embedType,
    language,
    orgSlug,
  }: { embedType: EmbedType; language: "html" | "react"; orgSlug: string | null }
) {
  if (language === "react") {
    return expectValidReactEmbedSnippet(page, { embedType, orgSlug });
  }
  if (language === "html") {
    return expectValidHtmlEmbedSnippet(page, { embedType, orgSlug });
  }
  throw new Error("Unknown language");
}

async function expectValidHtmlEmbedSnippet(
  page: Page,
  { embedType, orgSlug }: { embedType: EmbedType; orgSlug: string | null }
) {
  const embedCode = await page.locator("[data-testid=embed-code]").inputValue();
  expect(embedCode).toContain("function (C, A, L)");
  expect(embedCode).toContain(`Cal ${embedType} embed code begins`);
  if (orgSlug) {
    expect(embedCode).toContain(orgSlug);
  }

  // Html/VanillaJS embed needs namespace to call an instruction
  // Verify Cal.ns.abc("ui") or Cal.ns["abc"]("ui")
  expect(embedCode).toMatch(/.*Cal\.ns[^(]+\("ui/);

  const dom = parse(embedCode);
  const scripts = dom.getElementsByTagName("script");
  assertThatCodeIsValidVanillaJsCode(scripts[0].innerText);

  return {
    message: () => `passed`,
    pass: true,
  };
}

function assertThatCodeIsValidVanillaJsCode(code: string) {
  const lintResult = linter.verify(code, [
    {
      languageOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        parserOptions: { ecmaFeatures: { jsx: true } },
        globals: {
          window: "readonly",
          document: "readonly",
          navigator: "readonly",
          Cal: "readonly",
          console: "readonly",
        },
      },
      rules: eslintRules,
    },
  ]);

  if (lintResult.length) {
    console.log(
      JSON.stringify({
        lintResult,
        code,
      })
    );
  }

  expect(lintResult.length).toBe(0);
}

function assertThatCodeIsValidReactCode(code: string) {
  const lintResult = linter.verify(code, [
    {
      languageOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
        globals: {
          window: "readonly",
          document: "readonly",
          navigator: "readonly",
          console: "readonly",
        },
      },
      rules: {
        ...eslintRules,
        "@typescript-eslint/no-unused-vars": "off",
        "no-undef": "off",
        semi: "off",
      },
    },
  ]);

  if (lintResult.length) {
    console.log(
      JSON.stringify({
        lintResult,
        code,
      })
    );
  }

  expect(lintResult.length).toBe(0);
}

async function expectValidReactEmbedSnippet(
  page: Page,
  { embedType, orgSlug }: { embedType: EmbedType; orgSlug: string | null }
) {
  const embedCode = await page.locator("[data-testid=embed-react]").inputValue();
  expect(embedCode).toContain("export default function MyApp(");
  expect(embedCode).toContain(
    embedType === "floating-popup" ? "floatingButton" : embedType === "inline" ? `<Cal` : "data-cal-link"
  );
  // React embed doesn't need to access .ns to call an instruction
  expect(embedCode).toContain('cal("ui"');
  if (orgSlug) {
    expect(embedCode).toContain(orgSlug);
  }

  assertThatCodeIsValidReactCode(embedCode);

  return {
    message: () => `passed`,
    pass: true,
  };
}

/**
 * Let's just check if iframe is opened with preview.html. preview.html tests are responsibility of embed-core
 */
async function expectToContainValidPreviewIframe(
  page: Page,
  { embedType, calLink, bookerUrl }: { embedType: EmbedType; calLink: string; bookerUrl?: string }
) {
  bookerUrl = bookerUrl || `${WEBAPP_URL}`;
  expect(await page.locator("[data-testid=embed-preview]").getAttribute("src")).toContain(
    `/preview.html?embedType=${embedType}&calLink=${calLink}&embedLibUrl=${EMBED_LIB_URL}&bookerUrl=${bookerUrl}`
  );
}
