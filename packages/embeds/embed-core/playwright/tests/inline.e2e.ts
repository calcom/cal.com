import { test, todo } from "@calcom/web/playwright/lib/fixtures";
import { expect } from "@playwright/test";
import {
  assertNoRequestIsBlocked,
  bookFirstEvent,
  deleteAllBookingsByEmail,
  ensureEmbedIframe,
} from "../lib/testUtils";

test.describe("Inline Iframe", () => {
  test("Configured with Dark Theme. Do booking and verify that COEP/CORP headers are correctly set", async ({
    page,
    embeds,
  }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    await embeds.gotoPlayground({ calNamespace: "", url: "/?only=ns:default" });
    const calNamespace = "";
    const embedIframe = await ensureEmbedIframe({ calNamespace, page, pathname: "/pro" });
    await expect(embedIframe).toBeEmbedCalLink(calNamespace, embeds.getActionFiredDetails, {
      searchParams: {
        theme: "dark",
      },
    });

    assertNoRequestIsBlocked(page);

    await bookFirstEvent("pro", embedIframe, page);
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  // Enable this after fixing https://github.com/calcom/cal.com/issues/16571
  test.skip("COEP flag if not enabled, embed is blocked", async ({ page, embeds }) => {
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

  test("Ensure iframe doesn't hijack scroll in embed mode", async ({ page, embeds, users }) => {
    const user = await users.create();
    const calNamespace = "autoScrollTest";
    await embeds.gotoPlayground({ calNamespace, url: `?only=ns:autoScrollTest` });
    const calLink = `${user.username}/multiple-duration`;
    await page.goto(`/?only=ns:autoScrollTest&cal-link=${calLink}`);
    await ensureEmbedIframe({ calNamespace, page, pathname: `/${calLink}` });
    const finalScrollPosition = await page.evaluate(() => window.scrollY);
    expect(finalScrollPosition).toBe(0);
  });

  todo(
    "Ensure that on all pages - [user], [user]/[type], team/[slug], team/[slug]/book, UI styling works if these pages are directly linked in embed"
  );

  todo("Check that UI Configuration doesn't work for Free Plan");
});
