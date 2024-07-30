import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

import {
  assertNoRequestIsBlocked,
  bookFirstEvent,
  deleteAllBookingsByEmail,
  getEmbedIframe,
  todo,
} from "../lib/testUtils";

test.describe("Inline Iframe", () => {
  test("Inline Iframe - Configured with Dark Theme. Do booking and verify that COEP/CORP headers are correctly set", async ({
    page,
    embeds: { addEmbedListeners, getActionFiredDetails },
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    await addEmbedListeners("");
    await page.goto("/?only=ns:default");
    const calNamespace = "";
    const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
    expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
      pathname: "/pro",
      searchParams: {
        theme: "dark",
      },
    });
    // expect(await page.screenshot()).toMatchSnapshot("event-types-list.png");
    if (!embedIframe) {
      throw new Error("Embed iframe not found");
    }

    assertNoRequestIsBlocked(page);

    await bookFirstEvent("pro", embedIframe, page);
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  test("COEP flag if not enabled, embed is blocked", async ({ page, embeds }) => {
    const embedBlockedPromise = new Promise((resolve) => {
      page.on("requestfailed", (request) => {
        const error = request.failure()?.errorText;
        // Identifies that the request is blocked by the browser due to COEP restrictions
        if (error?.includes("ERR_BLOCKED_BY_RESPONSE")) {
          console.log("Request failed: ", request.url(), error);
          resolve(request.url().includes("/pro/embed"));
        }
      });
    });

    const calNamespace = "corpTest";
    await embeds.gotoPlayground({ calNamespace, url: `?only=ns:${calNamespace}` });

    await embedBlockedPromise.then((isBlocked) => {
      expect(isBlocked).toBe(true);
    });
  });

  todo(
    "Ensure that on all pages - [user], [user]/[type], team/[slug], team/[slug]/book, UI styling works if these pages are directly linked in embed"
  );

  todo("Check that UI Configuration doesn't work for Free Plan");
});
