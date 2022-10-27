import { expect } from "@playwright/test";

import { test } from "@calcom/web/playwright/lib/fixtures";

import { bookFirstEvent, deleteAllBookingsByEmail, getEmbedIframe, todo } from "../lib/testUtils";

describe("Inline Embed", () => {
  test("User Link configured with Dark Theme", async ({ page, getActionFiredDetails, addEmbedListeners }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    await addEmbedListeners("");
    await page.goto("/?only=ns:default");
    const embedIframe = await getEmbedIframe({ page, pathname: "/pro" });
    expect(embedIframe).toBeEmbedCalLink("", getActionFiredDetails, {
      pathname: "/pro",
      searchParams: {
        theme: "dark",
      },
    });
    expect(await page.screenshot()).toMatchSnapshot("event-types-list.png");
    if (!embedIframe) {
      throw new Error("Embed iframe not found");
    }
    await bookFirstEvent("pro", embedIframe, page);
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  test("Team Links List", async ({ page, getActionFiredDetails, addEmbedListeners }) => {
    await deleteAllBookingsByEmail("embed-user@example.com");
    await addEmbedListeners("fourth");
    await page.goto("/?only=ns:fourth");

    const embedIframe = await getEmbedIframe({ page, pathname: "/team/seeded-team" });
    expect(embedIframe).toBeEmbedCalLink("", getActionFiredDetails, {
      pathname: "/team/seeded-team",
    });
    expect(await page.screenshot()).toMatchSnapshot("event-types-list.png");
    if (!embedIframe) {
      throw new Error("Embed iframe not found");
    }
    await bookFirstEvent("team/seeded-team", embedIframe, page);
    await deleteAllBookingsByEmail("embed-user@example.com");
  });

  todo(
    "Ensure that on all pages - [user], [user]/[type], team/[slug], team/[slug]/book, UI styling works if these pages are directly linked in embed"
  );

  todo("Check that UI Configuration doesn't work for Free Plan");
});
