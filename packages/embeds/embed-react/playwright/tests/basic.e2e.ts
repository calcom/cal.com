import { expect } from "@playwright/test";

import { getEmbedIframe } from "@calcom/embed-core/playwright/lib/testUtils";
import { test } from "@calcom/web/playwright/lib/fixtures";

test.describe("React Embed", () => {
  test.describe("Inline", () => {
    test.only("should verify that the iframe got created with correct URL - namespaced", async ({
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
      embeds: { getActionFiredDetails, addEmbedListeners },
    }) => {
      //TODO: Do it with page.goto automatically
      await addEmbedListeners("");
      await page.goto("/inline.html");
      const calNamespace = "";
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      expect(embedIframe).toBeEmbedCalLink("", getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          theme: "dark",
        },
      });
      // expect(await page.screenshot()).toMatchSnapshot("react-component-inline.png");
    });
  });

  test.describe("Element Click Popup", () => {
    test("should verify that the iframe got created with correct URL - namespaced", async ({
      page,
      embeds: { getActionFiredDetails, addEmbedListeners },
    }) => {
      //TODO: Do it with page.goto automatically
      await addEmbedListeners("");
      await page.goto("/inline.html");
      const calNamespace = "";
      const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
      expect(embedIframe).toBeEmbedCalLink("", getActionFiredDetails, {
        pathname: "/pro",
        searchParams: {
          theme: "dark",
        },
      });
      // expect(await page.screenshot()).toMatchSnapshot("react-component-inline.png");
    });
  });
});
