import { expect, Frame } from "@playwright/test";

import { test } from "../fixtures/fixtures";
import { todo } from "../lib/testUtils";

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

todo(
  "Ensure that on all pages - [user], [user]/[type], team/[slug], team/[slug]/book, UI styling works if these pages are directly linked in embed"
);

todo("Check that UI Configuration doesn't work for Free Plan");
