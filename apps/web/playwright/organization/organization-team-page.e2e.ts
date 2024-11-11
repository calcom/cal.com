import { expect } from "@playwright/test";
import { bookEventOnThisPage, doOnOrgDomain } from "playwright/lib/testUtils";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => {
  users.deleteAll();
});

test.describe("Organization Team page", () => {
  test("Team page with org domain url", async ({ page, users }) => {
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
    await orgMember.apiLogin();

    await test.step("Team page is loaded with profile and can select eventtype", async () => {
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async ({ page, goToUrlWithErrorHandling }) => {
          await goToUrlWithErrorHandling(`/team/${team.slug}`);
          await expect(page.getByTestId("team-name")).toBeVisible();
          await expect(page.getByTestId("event-type-link")).toBeVisible();
          await goToUrlWithErrorHandling(`/team/${team.slug}/${teamEvent.slug}`);
          await expect(page.getByTestId("event-title")).toBeVisible();
          await bookEventOnThisPage(page);
        }
      );
    });
  });
});
