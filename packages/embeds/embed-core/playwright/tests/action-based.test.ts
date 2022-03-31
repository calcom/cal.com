import { expect } from "@playwright/test";

import { test } from "../fixtures/fixtures";
import { todo, getEmbedIframe } from "../lib/testUtils";

test("should open embed iframe on click", async ({ page }) => {
  await page.goto("/?only=prerender-test");
  let embedIframe = await getEmbedIframe({ page, pathname: "/free" });
  expect(embedIframe).toBeFalsy();

  await page.click('[data-cal-link="free"]');

  embedIframe = await getEmbedIframe({ page, pathname: "/free" });
  expect(embedIframe).toBeEmbedCalLink({
    pathname: "/free",
  });
});
