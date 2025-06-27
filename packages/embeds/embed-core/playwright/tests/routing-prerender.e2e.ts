import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { SchedulingType } from "@calcom/prisma/enums";
import { test } from "@calcom/web/playwright/lib/fixtures";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { doOnOrgDomain } from "@calcom/web/playwright/lib/testUtils";

import { getEmbedIframe, bookEvent, expectEmbedIFrameToBeVisible } from "../lib/testUtils";

// in parallel mode sometimes handleNewBooking endpoint throws "No available users found" error, this never happens in serial mode.
test.describe.configure({ mode: "serial" });

async function fillRoutingRequiredAttributes(
  page: Page,
  { skills, location, email }: { skills: string; location: string; email: string }
) {
  await page.fill("#cal-booking-place-routingFormFullPrerender-input-email", email);
  await page.selectOption("#cal-booking-place-routingFormFullPrerender-select-skills", skills);
  await page.selectOption("#cal-booking-place-routingFormFullPrerender-select-location", location);
}

async function fillRestOfTheFormAndSubmit(page: Page) {
  await page.fill("#cal-booking-place-routingFormFullPrerender-input-name", "John Doe");
  await page.click("#cta-routingFormFullPrerender");
}

//TODO: Change these tests to use a user/eventType per embed type atleast. This is so that we can test different themes,layouts configured in App or per EventType
test.describe.only("Popup Tests", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test.only("should open embed iframe on click - Configured with hide eventType details", async ({
    page,
    embeds,
    users,
  }) => {
    const userFixture = await users.create(
      { username: "routing-forms" },
      {
        hasTeam: true,
        isOrg: true,
        hasSubteam: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
        seedRoutingFormWithAttributeRouting: true,
        seedRoutingForms: true,
      }
    );

    const orgMembership = await userFixture.getOrgMembership();
    const teamMembership = await userFixture.getFirstTeamMembership();
    const routingForm = userFixture.routingForms[0];

    const calNamespace = "routingFormFullPrerender";
    await embeds.gotoPlayground({
      calNamespace,
      url: `/embed/routing-playground.html?only=ns:${calNamespace}&param.formId=${routingForm.id}&calOrigin=${WEBAPP_URL}`,
    });

    await doOnOrgDomain({ orgSlug: orgMembership.team.slug, page }, async ({ page }) => {
      await fillRoutingRequiredAttributes(page, {
        skills: "JavaScript",
        location: "London",
        email: "embed-user@example.com",
      });

      const prerenderedIframe = await expectPrerenderedIframe({
        page,
        calNamespace,
        calLink: `/team/${teamMembership.team.slug}/team-javascript`,
        embeds,
      });

      await fillRestOfTheFormAndSubmit(page);
      await expectEmbedIFrameToBeVisible({ calNamespace, page });
      await bookEvent({ frame: prerenderedIframe, page });
    });
  });
});

async function expectPrerenderedIframe({
  page,
  calNamespace,
  calLink,
  embeds,
}: {
  page: Page;
  calNamespace: string;
  calLink: string;
  embeds: Fixtures["embeds"];
}) {
  const prerenderedIframe = await getEmbedIframe({ calNamespace, page, pathname: calLink });

  if (!prerenderedIframe) {
    throw new Error("Prerendered iframe not found");
  }
  await expect(prerenderedIframe).toBeEmbedCalLink(
    calNamespace,
    embeds.getActionFiredDetails,
    {
      pathname: calLink,
    },
    true
  );
  return prerenderedIframe;
}
