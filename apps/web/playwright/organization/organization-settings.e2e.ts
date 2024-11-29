import { expect } from "@playwright/test";
import { doOnOrgDomain } from "playwright/lib/testUtils";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => {
  users.deleteAll();
});

test.describe("Organization Settings", () => {
  test("Setting - 'Allow search engine indexing' inside Org profile settings", async ({ page, users }) => {
    const orgMember = await users.create(undefined, {
      hasTeam: true,
      isOrg: true,
      hasSubteam: true,
      isOrgVerified: true,
      isDnsSetup: true,
      orgRequestedSlug: "example",
      schedulingType: SchedulingType.ROUND_ROBIN,
    });
    const { team: org } = await orgMember.getOrgMembership();
    const { team } = await orgMember.getFirstTeamMembership();
    const teamEvent = await orgMember.getFirstTeamEvent(team.id);
    const userEvent = orgMember.eventTypes[0];

    await orgMember.apiLogin();

    await test.step("Set to true, enables 'Allow search engine indexing' switch on my-account/general settings", async () => {
      await page.goto(`/settings/organizations/profile`);
      const orgSeoIndexingSwitch = await page.getByTestId(`${org.id}-seo-indexing-switch`);
      await orgSeoIndexingSwitch.click();
      await expect(orgSeoIndexingSwitch).toBeChecked();

      await page.goto(`/settings/my-account/general`);
      const mySeoIndexingSwitch = await page.getByTestId("my-seo-indexing-switch");
      await expect(mySeoIndexingSwitch).toBeEnabled();
    });

    await test.step("Set to false, disables and sets to false 'Allow search engine indexing' switch on my-account/general settings", async () => {
      await page.goto(`/settings/organizations/profile`);
      const orgSeoIndexingSwitch = await page.getByTestId(`${org.id}-seo-indexing-switch`);
      await orgSeoIndexingSwitch.click();
      await expect(orgSeoIndexingSwitch).toBeChecked({ checked: false });

      await page.goto(`/settings/my-account/general`);
      const mySeoIndexingSwitch = await page.getByTestId("my-seo-indexing-switch");
      await expect(mySeoIndexingSwitch).toBeChecked({ checked: false });
      await expect(mySeoIndexingSwitch).toBeDisabled();
    });

    await test.step("Set to false, sets 'robots' meta on 'head' element to 'noindex,nofollow', for team page", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/team/${team.slug}`);
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("noindex,nofollow"); //disabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to false, sets 'robots' meta on 'head' element to 'noindex,nofollow', for team event page", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/team/${team.slug}/${teamEvent.slug}`);
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("noindex,nofollow"); //disabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to false, sets 'robots' meta on 'head' element to 'noindex,nofollow', for user page", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/${orgMember.username}`);
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("noindex,nofollow"); //disabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to false, sets 'robots' meta on 'head' element to 'noindex,nofollow', for user eventtype page", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/${orgMember.username}/${userEvent.slug}`);
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("noindex,nofollow"); //disabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to true, sets 'robots' meta on 'head' element to 'index,follow', for team page", async () => {
      await page.goto(`/settings/organizations/profile`);
      const orgSeoIndexingSwitch = await page.getByTestId(`${org.id}-seo-indexing-switch`);
      await orgSeoIndexingSwitch.click();
      await expect(orgSeoIndexingSwitch).toBeChecked();

      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/team/${team.slug}`);
          await page.reload();
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("index,follow"); //enabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to true, sets 'robots' meta on 'head' element to 'index,follow', for team event page", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/team/${team.slug}/${teamEvent.slug}`);
          await page.reload();
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("index,follow"); //enabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to true and user's 'Allow search engine indexing' setting also set to true, user's setting is respected, for user page", async () => {
      await page.goto(`/settings/my-account/general`);
      const mySeoIndexingSwitch = await page.getByTestId("my-seo-indexing-switch");
      await expect(mySeoIndexingSwitch).toBeEnabled();
      await expect(mySeoIndexingSwitch).toBeChecked();

      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/${orgMember.username}`);
          await page.reload();
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("index,follow"); //enabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to true and user's 'Allow search engine indexing' setting also set to true, user's setting is respected, for user eventtype page", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/${orgMember.username}/${userEvent.slug}`);
          await page.reload();
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("index,follow"); //enabled seo-indexing
          return { url: result.url };
        }
      );
    });

    await test.step("Set to false and user's 'Allow search engine indexing' setting was true, org's setting is prioritized, for user eventtype page", async () => {
      await page.goto(`/settings/organizations/profile`);
      const orgSeoIndexingSwitch = await page.getByTestId(`${org.id}-seo-indexing-switch`);
      await orgSeoIndexingSwitch.click();
      await expect(orgSeoIndexingSwitch).toBeChecked({ checked: false });

      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          const result = await goToUrlWithErrorHandling(`/${orgMember.username}/${userEvent.slug}`);
          await page.reload();
          const metaTag = await page.locator('head > meta[name="robots"]');
          const metaTagValue = await metaTag.getAttribute("content");
          expect(metaTagValue).toEqual("noindex,nofollow"); //disabled seo-indexing
          return { url: result.url };
        }
      );
    });
  });
});
