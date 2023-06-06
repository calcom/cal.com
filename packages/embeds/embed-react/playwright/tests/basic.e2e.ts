import { expect } from "@playwright/test";

import { getEmbedIframe } from "@calcom/embed-core/playwright/lib/testUtils";
import { test } from "@calcom/web/playwright/lib/fixtures";

test("Inline Usage Snapshot", async ({ page, getActionFiredDetails, addEmbedListeners }) => {
  //TODO: Do it with page.goto automatically
  await addEmbedListeners("");
  await page.goto("/");
  const calNamespace = "";
  const embedIframe = await getEmbedIframe({ calNamespace, page, pathname: "/pro" });
  expect(embedIframe).toBeEmbedCalLink(calNamespace, getActionFiredDetails, {
    pathname: "/pro",
    searchParams: {
      theme: "dark",
    },
  });
});
