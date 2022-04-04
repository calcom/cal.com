import { Page } from "@playwright/test";

export function todo(title: string) {
  test.skip(title, () => {});
}

export const getEmbedIframe = async ({ page, pathname }: { page: Page; pathname: string }) => {
  // FIXME: Need to wait for the iframe to be properly added to shadow dom. There should be a no time boundation way to do it.
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
  let embedIframe = page.frame("cal-embed");
  if (!embedIframe) {
    return null;
  }
  const u = new URL(embedIframe.url());
  if (u.pathname === pathname) {
    return embedIframe;
  }
  return null;
};
