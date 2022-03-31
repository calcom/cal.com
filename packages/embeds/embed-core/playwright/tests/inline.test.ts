import { expect, Frame } from "@playwright/test";

import { test } from "../fixtures/fixtures";

test("Inline Iframe - Configured with Dark Theme", async ({ page }) => {
  await page.goto("/?only=ns:default");
  const embedIframe = page.frame({ url: /.*pro.*/ });
  expect(embedIframe).toBeEmbedCalLink({
    pathname: "/pro",
    searchParams: {
      theme: "dark",
    },
  });
});
