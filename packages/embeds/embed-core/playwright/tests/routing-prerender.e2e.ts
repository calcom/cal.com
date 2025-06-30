import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { test } from "@calcom/web/playwright/lib/fixtures";
import type { Fixtures } from "@calcom/web/playwright/lib/fixtures";
import { doOnOrgDomain } from "@calcom/web/playwright/lib/testUtils";

import {
  getEmbedIframe,
  bookEvent,
  expectEmbedIFrameToBeVisible,
  expectActualFormResponseConnectedToQueuedFormResponse,
} from "../lib/testUtils";

// in parallel mode sometimes handleNewBooking endpoint throws "No available users found" error, this never happens in serial mode.
test.describe.configure({ mode: "serial" });

async function fillRoutingRequiredAttributes(
  page: Page,
  { skills, location, email }: { skills: string; location: string; email: string }
) {
  await page.fill("#cal-booking-place-routingFormFullPrerender-input-email", email);
  await page.selectOption("#cal-booking-place-routingFormFullPrerender-select-skills", skills);
  await page.selectOption("#cal-booking-place-routingFormFullPrerender-select-location", location);

  return {
    skills,
    location,
    email,
  };
}

async function fillRestOfTheFormAndSubmit(page: Page) {
  const name = "John Doe";
  await page.fill("#cal-booking-place-routingFormFullPrerender-input-name", name);
  await page.click("#cta-routingFormFullPrerender");

  return {
    name,
  };
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
      url: `/embed/routing-playground.html?only=ns:${calNamespace}&param.formId=${routingForm.id}&calOrigin=${WEBAPP_URL}&cal.embed.logging=1`,
    });

    await doOnOrgDomain({ orgSlug: orgMembership.team.slug, page }, async ({ page }) => {
      const { skills, location, email } = await fillRoutingRequiredAttributes(page, {
        skills: "JavaScript",
        location: "London",
        email: "embed-user@example.com", // This is the email that will be used to book the event
      });

      // Routes to the team booking page with params cal.routingFormResponseId, cal.routedTeamMemberIds
      // Sample URL: http://app.cal.local:3000/team/team-0-1751270109394/team-javascript/embed?cal.teamId=103&cal.orgId=104&Rating=5&embed=routingFormFullPrerender&debug=true&only=ns%3AroutingFormFullPrerender&param.formId=bed2a37b-8bf7-4eb9-9b9e-4adf33bd9470&calOrigin=http%3A%2F%2Fapp.cal.remote%3A3000&cal.embed.logging=1&cal.embed.pageType=team.event.booking.slots&cal.action=eventTypeRedirectUrl&cal.queuedFormResponseId=cmcit0aos0006j5o4qctc2oyy&cal.embed.connectVersion=0&form=bed2a37b-8bf7-4eb9-9b9e-4adf33bd9470&skills=JavaScript&Location=London&name=John+Doe&Email=undefined&Manager=John+Doe&embedType=modal&guest=undefined&cal.routingFormResponseId=14&month=2025-07&date=2025-07-02&slot=2025-07-02T08%3A00%3A00.000Z
      const { prerenderedIframe, queuedFormResponseId } = await expectPrerenderedRoutedTeamBookingPage({
        page,
        calNamespace,
        calLink: `/team/${teamMembership.team.slug}/team-javascript`,
        embeds,
        routedTeamMemberIds: [teamMembership.userId.toString()],
        routingForm,
      });

      const { name } = await fillRestOfTheFormAndSubmit(page);
      await expectEmbedIFrameToBeVisible({ calNamespace, page });
      await expectActualFormResponseConnectedToQueuedFormResponse({
        queuedFormResponse: { id: queuedFormResponseId },
        actualFormResponse: {
          name,
          skills,
          Location: location,
          Email: email,
        },
        page,
      });
      await bookEvent({ frame: prerenderedIframe, page });
    });
  });
});

async function expectPrerenderedRoutedTeamBookingPage({
  page,
  calNamespace,
  calLink,
  embeds,
  routingForm,
  routedTeamMemberIds,
}: {
  page: Page;
  calNamespace: string;
  calLink: string;
  embeds: Fixtures["embeds"];
  routingForm: {
    id: string;
  };
  routedTeamMemberIds: string[];
}) {
  const prerenderedIframe = await getEmbedIframe({ calNamespace, page, pathname: calLink });

  if (!prerenderedIframe) {
    throw new Error("Prerendered iframe not found");
  }

  // As Routing Form is unique to the test, we can expect responses to be provided by the test itself.
  // So, the only response should be the one that is provided by the test itself.
  const queuedResponse = await prisma.app_RoutingForms_QueuedFormResponse.findFirst({
    where: {
      formId: routingForm.id,
    },
  });

  const routingFormResponse = await prisma.app_RoutingForms_FormResponse.findFirst({
    where: {
      formId: routingForm.id,
    },
  });

  if (!queuedResponse) {
    throw new Error("Couldn't find the queued response");
  }

  if (routingFormResponse) {
    throw new Error(
      `Routing form response shouldn't have been recorded. Found one with id: ${routingFormResponse.id}`
    );
  }

  await expect(prerenderedIframe).toBeEmbedCalLink(
    calNamespace,
    embeds.getActionFiredDetails,
    {
      pathname: calLink,
      searchParams: {
        "cal.queuedFormResponseId": queuedResponse.id,
        "cal.routedTeamMemberIds": routedTeamMemberIds.join(","),
      },
    },
    true
  );
  return prerenderedIframe;
}
