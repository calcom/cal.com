import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

import { getEmbedIframe } from "../lib/testUtils";

test.describe("Namespacing", () => {
  test.describe("Inline Embed", () => {
    test("Add inline embed using a namespace without reload", async ({ page, embeds }) => {
      const calNamespace = "withoutReloadNamespace";
      await embeds.gotoPlayground({ calNamespace, url: "/" });
      await page.click("#add-inline-embed-in-a-new-namespace-without-reload-button");
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          case: "addInlineEmbedInANewNamespaceWithoutReload",
        },
      });
    });

    test("Double install Embed Snippet with inline embed using a namespace", async ({ page, embeds }) => {
      const calNamespace = "doubleInstall";
      await embeds.gotoPlayground({ calNamespace, url: "/" });
      await page.click("#double-install-snippet-with-inline-embed-non-default-namespace-button");
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          case: "doubleInstallSnippetWithInlineEmbedWithNonDefaultNamespace",
        },
      });
      await expect(page.locator("iframe")).toHaveCount(1);
    });

    test("Double install Embed Snippet with inline embed without a namespace(i.e. default namespace)", async ({
      page,
      embeds,
    }) => {
      const calNamespace = "";
      await embeds.gotoPlayground({ calNamespace, url: "/" });
      await page.click("#double-install-snippet-with-inline-embed-default-namespace-button");
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          case: "doubleInstallSnippetWithInlineEmbed",
        },
      });
      await expect(page.locator("iframe")).toHaveCount(1);
    });
  });
  test("Different namespaces can have different init configs", async ({ page, embeds }) => {
    await Promise.all([
      embeds.addEmbedListeners("namespace-init-test-1"),
      embeds.addEmbedListeners("namespace-init-test-2"),
    ]);

    await page.goto("/");
    await page.click("#two-different-namespace-with-different-init-config");
    const namespace1IframeSrc = await page.locator("iframe").nth(0).getAttribute("src");
    const namespace2IframeSrc = await page.locator("iframe").nth(1).getAttribute("src");
    expect(namespace1IframeSrc).toContain("http://localhost:3000/pro");
    expect(namespace2IframeSrc).toContain("http://127.0.0.1:3000/pro");
  });
});
