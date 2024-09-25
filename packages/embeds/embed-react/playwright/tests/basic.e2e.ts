import { expect } from "@playwright/test";

import { getEmbedIframe } from "@calcom/embed-core/playwright/lib/testUtils";
// eslint-disable-next-line no-restricted-imports
import { test } from "@calcom/web/playwright/lib/fixtures";

test.describe("React Embed", () => {
  test.describe("Inline", () => {
    test("should verify that the iframe got created with correct URL - namespaced", async ({
      page,
      embeds,
    }) => {
      const calNamespace = "inline";
      await embeds.gotoPlayground({ url: "/inline.html", calNamespace });
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      expect(embedIframe).toBeEmbedCalLink("", embeds.getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          theme: "dark",
        },
      });
      // expect(await page.screenshot()).toMatchSnapshot("react-component-inline.png");
    });
  });

  test.describe("Floating button Popup", () => {
    test("should verify that the iframe got created with correct URL - namespaced", async ({
      page,
      embeds,
    }) => {
      const calNamespace = "floating";
      await page.waitForLoadState();
      await embeds.gotoPlayground({ url: "/floating.html", calNamespace });

      await page.click("text=Book my Cal");

      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          theme: "dark",
        },
      });
    });
  });

  // TODO: This test is extremely flaky and has been failing a lot, blocking many PRs. Fix this.
  // eslint-disable-next-line playwright/no-skipped-test
  test.describe.skip("Element Click Popup", () => {
    test("should verify that the iframe got created with correct URL - namespaced", async ({
      page,
      embeds,
    }) => {
      const calNamespace = "element-click";
      await embeds.gotoPlayground({ url: "/element-click.html", calNamespace });
      await page.waitForLoadState();
      await page.click("text=Click me");

      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          theme: "dark",
        },
      });
    });
  });
});
