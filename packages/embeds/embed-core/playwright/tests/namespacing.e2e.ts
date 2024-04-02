import { expect } from "@playwright/test";

// eslint-disable-next-line no-restricted-imports
import { test } from "@calcom/web/playwright/lib/fixtures";

import { getEmbedIframe } from "../lib/testUtils";

test.describe("Inline Embed", () => {
  test("Add inline embed using a namespace without reload", async ({ page, embeds }) => {
    const calNamespace = "withoutReloadNamespace";
    await embeds.gotoPlayground({ calNamespace, url: "/" });
    await page.click("#add-inline-embed-in-a-new-namespace-without-reload-button");
    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
    expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
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
    expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
      pathname: "/pro",
      searchParams: {
        case: "doubleInstallSnippetWithInlineEmbedWithNonDefaultNamespace",
      },
    });
    expect(await page.locator("iframe").count()).toBe(1);
  });

  test("Double install Embed Snippet with inline embed without a namespace(i.e. default namespace)", async ({
    page,
    embeds,
  }) => {
    const calNamespace = "";
    await embeds.gotoPlayground({ calNamespace, url: "/" });
    await page.click("#double-install-snippet-with-inline-embed-default-namespace-button");
    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
    expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
      pathname: "/pro",
      searchParams: {
        case: "doubleInstallSnippetWithInlineEmbed",
      },
    });
    expect(await page.locator("iframe").count()).toBe(1);
  });
});
