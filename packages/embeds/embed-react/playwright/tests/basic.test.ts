import { expect } from "@playwright/test";

import { test } from "@calcom/embed-core/playwright/fixtures/fixtures";
import { getEmbedIframe } from "@calcom/embed-core/playwright/lib/testUtils";

test("Inline Usage Snapshot", async ({ page, getActionFiredDetails, addEmbedListeners }) => {
  //TODO: Do it with page.goto automatically
  await addEmbedListeners("");
  await page.goto("/");
  const embedIframe = await getEmbedIframe({ page, pathname: "/pro" });
  expect(embedIframe).toBeEmbedCalLink("", getActionFiredDetails, {
    pathname: "/pro",
    searchParams: {
      theme: "dark",
    },
  });
  expect(await page.screenshot()).toMatchSnapshot("react-component-inline.png");
});
