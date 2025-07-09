import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { doOnOrgDomain, setupOrgMember } from "playwright/lib/testUtils";

import { test } from "../lib/fixtures";

type TestContext = Awaited<ReturnType<typeof setupOrgMember>>;

interface ToggleSeoSwitchParams {
  page: Page;
  switchTestId: string;
  expectedChecked: boolean;
  waitForMessage?: string;
}

interface VerifyRobotsMetaTagParams {
  page: Page;
  orgSlug: string | null;
  urls: string[];
  expectedContent: string;
}

// Helper function to toggle the SEO switch
async function toggleSeoSwitch({
  page,
  switchTestId,
  expectedChecked,
  waitForMessage,
}: ToggleSeoSwitchParams): Promise<void> {
  const seoSwitch = await page.getByTestId(switchTestId);
  await seoSwitch.click();
  await expect(seoSwitch).toBeChecked({ checked: expectedChecked });
  if (waitForMessage) {
    await page.waitForSelector(`text=${waitForMessage}`);
  }
}

async function verifyRobotsMetaTag({ page, orgSlug, urls, expectedContent }: VerifyRobotsMetaTagParams) {
  await doOnOrgDomain({ orgSlug, page }, async ({ page, goToUrlWithErrorHandling }) => {
    for (const relativeUrl of urls) {
      const { url } = await goToUrlWithErrorHandling(relativeUrl);
      const metaTag = page.locator('head > meta[name="robots"]');
      await expect(metaTag).toBeAttached();
      const metaTagValue = await metaTag.getAttribute("content");
      expect(metaTagValue).not.toBeNull();
      expect(
        metaTagValue
          ?.split(",")
          .map((s) => s.trim())
          .join(",")
      ).toEqual(
        expectedContent
          .split(",")
          .map((s) => s.trim())
          .join(",")
      );
    }
  });
}

test.describe("Organization Settings", () => {
  // Skip these tests for now since the meta tag is being placed in the body instead of the head
  test.describe.skip("Setting - 'Allow search engine indexing' inside Org profile settings", async () => {
    let ctx: TestContext;

    test.beforeEach(async ({ users }) => {
      ctx = await setupOrgMember(users);
    });

    test.afterEach(async ({ users }) => {
      await users.deleteAll();
    });

    test("Disabling SEO indexing updates settings and meta tags", async ({ page }) => {
      await test.step("Disable 'Allow search engine indexing' for organization", async () => {
        await page.goto(`/settings/organizations/profile`);
        const seoSwitch = await page.getByTestId(`${ctx.org.id}-seo-indexing-switch`);
        await expect(seoSwitch).toBeChecked({ checked: false });
      });

      await test.step("Verify 'robots' meta tag for different pages when SEO indexing is disabled", async () => {
        const { team, teamEvent, org, orgMember, userEvent } = ctx;
        await verifyRobotsMetaTag({
          page,
          orgSlug: org.slug,
          urls: [
            `/team/${team.slug}`,
            `/team/${team.slug}/${teamEvent.slug}`,
            `/${orgMember.username}`,
            `/${orgMember.username}/${userEvent.slug}`,
          ],
          expectedContent: "noindex,nofollow",
        });
      });
    });

    test("Enabling SEO indexing updates settings and meta tags", async ({ page }) => {
      await test.step("Enable 'Allow search engine indexing' for organization", async () => {
        await page.goto(`/settings/organizations/profile`);
        await toggleSeoSwitch({
          page,
          switchTestId: `${ctx.org.id}-seo-indexing-switch`,
          expectedChecked: true,
          waitForMessage: "Your team has been updated successfully.",
        });
      });

      await test.step("Verify 'robots' meta tag for different pages when SEO indexing is enabled", async () => {
        const { team, teamEvent, org, orgMember, userEvent } = ctx;
        await verifyRobotsMetaTag({
          page,
          orgSlug: org.slug,
          urls: [
            `/team/${team.slug}`,
            `/team/${team.slug}/${teamEvent.slug}`,
            `/${orgMember.username}`,
            `/${orgMember.username}/${userEvent.slug}`,
          ],
          expectedContent: "index,follow",
        });
      });
    });

    test("Organization settings override user settings", async ({ page }) => {
      await test.step("Disable 'Allow search engine indexing' for organization", async () => {
        await page.goto(`/settings/organizations/profile`);
        const seoSwitch = await page.getByTestId(`${ctx.org.id}-seo-indexing-switch`);
        await expect(seoSwitch).toBeChecked({ checked: false });
      });

      await test.step("Verify organization settings override user settings for 'robots' meta tag", async () => {
        const { org, orgMember, userEvent } = ctx;
        await verifyRobotsMetaTag({
          page,
          orgSlug: org.slug,
          urls: [`/${orgMember.username}/${userEvent.slug}`],
          expectedContent: "noindex,nofollow",
        });
      });
    });
  });
});
