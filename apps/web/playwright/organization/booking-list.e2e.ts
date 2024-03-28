import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { createTeamEventType } from "../fixtures/users";
import { test } from "../lib/fixtures";
import type { Fixtures } from "../lib/fixtures";
import {
  assertBookingVisibleFor,
  bookTimeSlot,
  doOnOrgDomain,
  NotFoundPageTextAppDir,
  selectFirstAvailableTimeSlotNextMonth,
  testName,
} from "../lib/testUtils";

test.describe("Bookings list for organizations", () => {
  test.afterEach(({ orgs, users }) => {
    orgs.deleteAll();
    users.deleteAll();
  });

  test.describe("Team Event", () => {
    test("Collective EventType booking list", async ({ page, users, orgs }) => {
      const { org, orgOwner, orgAdmin, team1owner, team2owner, commonUser, team1_teammate1 } =
        await createOrg(orgs, users);

      const { team: team1 } = await team1owner.getFirstTeamMembership();
      const scenario = {
        schedulingType: SchedulingType.COLLECTIVE,
        teamEventTitle: `collective-team-event`,
        teamEventSlug: slugify(`collective-team-event-${randomString(5)}`),
      };
      const eventType = await createTeamEventType(team1owner, team1, scenario);
      const { id: eventId, slug: evnetSlug } = eventType;

      await prisma.host.createMany({
        data: [
          {
            userId: commonUser.id,
            eventTypeId: eventId,
            isFixed: true,
          },
          {
            userId: team1_teammate1.id,
            eventTypeId: eventId,
            isFixed: true,
          },
        ],
      });

      // to test if booking is visible to team admin/owner even if he is not part of the booking
      await prisma.host.deleteMany({
        where: {
          userId: team1owner.id,
          eventTypeId: eventId,
        },
      });

      await expectPageToBeNotFound({ page, url: `/team/${team1.slug}/${eventType.slug}` });
      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async () => {
          await bookTeamEvent({ page, team: team1, event: eventType });
        }
      );
      // booking should be visible for the Org OWNER even though he is not part of the booking
      await assertBookingVisibleFor(orgOwner, page, eventType, true);
      // booking should be visible for the Org ADMIN even though he is not part of the booking
      await assertBookingVisibleFor(orgAdmin, page, eventType, true);
      // booking should be visible for the team host even though he is not part of the booking
      await assertBookingVisibleFor(team1owner, page, eventType, true);
      // booking should not be visible for other team host, because its a team1 team-event
      await assertBookingVisibleFor(team2owner, page, eventType, false);
      // booking should be visible for commonUser as he is part of the booking
      await assertBookingVisibleFor(commonUser, page, eventType, true);
      // booking should be visible for team1_teammate1 as he is part of the booking
      await assertBookingVisibleFor(team1_teammate1, page, eventType, true);
    });

    test("Round Robin EventType booking list", async ({ page, users, orgs }) => {
      const { org, orgOwner, orgAdmin, team1owner, team2owner, commonUser, team1_teammate1 } =
        await createOrg(orgs, users);

      const { team: team1 } = await team1owner.getFirstTeamMembership();
      const scenario = {
        schedulingType: SchedulingType.ROUND_ROBIN,
        teamEventTitle: `round-robin-team-event`,
        teamEventSlug: slugify(`round-robin-team-event-${randomString(5)}`),
      };

      const eventType = await createTeamEventType(team1owner, team1, scenario);
      const { id: eventId } = eventType;
      await prisma.host.createMany({
        data: [
          {
            userId: commonUser.id,
            eventTypeId: eventId,
          },
          {
            userId: team1_teammate1.id,
            eventTypeId: eventId,
          },
        ],
      });

      await prisma.host.deleteMany({
        where: {
          userId: team1owner.id,
          eventTypeId: eventId,
        },
      });

      await expectPageToBeNotFound({ page, url: `/team/${team1.slug}/${eventType.slug}` });

      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async () => {
          await bookTeamEvent({ page, team: team1, event: eventType });
        }
      );
      // booking should be visible for the Org OWNER even though he is not part of the booking
      await assertBookingVisibleFor(orgOwner, page, eventType, true);
      // booking should be visible for the Org ADMIN even though he is not part of the booking
      await assertBookingVisibleFor(orgAdmin, page, eventType, true);
      // booking should be visible for the team host even though he is not part of the booking
      await assertBookingVisibleFor(team1owner, page, eventType, true);
      // booking should not be visible for other team host
      await assertBookingVisibleFor(team2owner, page, eventType, false);
    });

    test("Managed EventType booking list", async ({ page, users, orgs }) => {
      const { org, orgOwner, orgAdmin, team1owner, team2owner, commonUser, team1_teammate1 } =
        await createOrg(orgs, users);

      const { team: team1 } = await team1owner.getFirstTeamMembership();

      await team1owner.apiLogin();
      await page.goto(`/event-types?dialog=new&eventPage=team%2F${team1.slug}&teamId=${team1.id}`);
      await page.getByTestId("managed-event-type").click();
      await page.getByTestId("event-type-quick-chat").click();
      await page.getByTestId("event-type-quick-chat").fill("managed-event");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByTestId("vertical-tab-assignment").click();

      await page.getByRole("combobox", { name: "assignment-dropdown" }).fill("commonUser");
      await page.getByRole("combobox", { name: "assignment-dropdown" }).press("Enter");
      await page.getByRole("combobox", { name: "assignment-dropdown" }).fill("team1_teammate1");
      await page.getByRole("combobox", { name: "assignment-dropdown" }).press("Enter");
      await page.getByTestId("update-eventtype").click();

      const eventType = await team1owner.getFirstTeamEvent(team1.id);

      await expectPageToBeNotFound({ page, url: `/${commonUser.username}/${eventType.slug}` });

      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async () => {
          await bookUserEvent({ page, user: commonUser, event: eventType });
        }
      );

      // booking should be visible for the Org OWNER even though he is not part of the booking
      await assertBookingVisibleFor(orgOwner, page, eventType, true);
      // booking should be visible for the Org ADMIN even though he is not part of the booking
      await assertBookingVisibleFor(orgAdmin, page, eventType, true);
      // booking should be visible for the team host even though he is not part of the booking
      await assertBookingVisibleFor(team1owner, page, eventType, true);
      // booking should not be visible for other team host
      await assertBookingVisibleFor(team2owner, page, eventType, false);
    });
  });

  test.describe("User Event", () => {
    test("User personal booking list", async ({ page, users, orgs }) => {
      const { org, orgOwner, orgAdmin, team1owner, team2owner, commonUser, team1_teammate1 } =
        await createOrg(orgs, users);

      const event = await commonUser.getFirstEventAsOwner();

      await page.goto(`/${commonUser.username}/${event.slug}`);
      // Shouldn't be servable on the non-org domain
      await expect(page.locator(`text=${NotFoundPageTextAppDir}`)).toBeVisible();

      await doOnOrgDomain(
        {
          orgSlug: org.slug,
          page,
        },
        async () => {
          await bookUserEvent({ page, user: commonUser, event });
        }
      );
      // booking should be visible for the Org OWNER
      await assertBookingVisibleFor(orgOwner, page, event, true);
      // booking should be visible for the Org ADMIN
      await assertBookingVisibleFor(orgAdmin, page, event, true);
      // booking should be visible for the team host
      await assertBookingVisibleFor(team1owner, page, event, true);
      // booking should be visible for other team host because commonUser is part of both teams
      await assertBookingVisibleFor(team2owner, page, event, true);
      // booking should be visible for commonUser as he is part of the booking
      await assertBookingVisibleFor(commonUser, page, event, true);
      // booking should not be visible for team1_teammate1
      await assertBookingVisibleFor(team1_teammate1, page, event, false);
    });
  });
});

async function bookUserEvent({
  page,
  user,
  event,
}: {
  page: Page;
  user: {
    username: string | null;
    name: string | null;
  };
  event: { slug: string; title: string };
}) {
  await page.goto(`/${user.username}/${event.slug}`);

  await selectFirstAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page);
  await expect(page.getByTestId("success-page")).toBeVisible();

  // The title of the booking
  const BookingTitle = `${event.title} between ${user.name} and ${testName}`;
  await expect(page.getByTestId("booking-title")).toHaveText(BookingTitle);
  // The booker should be in the attendee list
  await expect(page.getByTestId(`attendee-name-${testName}`)).toHaveText(testName);
}

async function bookTeamEvent({
  page,
  team,
  event,
}: {
  page: Page;
  team: {
    slug: string | null;
    name: string | null;
  };
  event: { slug: string; title: string };
}) {
  // Note that even though the default way to access a team booking in an organization is to not use /team in the URL, but it isn't testable with playwright as the rewrite is taken care of by Next.js config which can't handle on the fly org slug's handling
  // So, we are using /team in the URL to access the team booking
  // There are separate tests to verify that the next.config.js rewrites are working
  // Also there are additional checkly tests that verify absolute e2e flow. They are in __checks__/organization.spec.ts
  await page.goto(`/team/${team.slug}/${event.slug}`);

  await selectFirstAvailableTimeSlotNextMonth(page);
  await bookTimeSlot(page);
  await expect(page.getByTestId("success-page")).toBeVisible();

  // The title of the booking
  const BookingTitle = `${event.title} between ${team.name} and ${testName}`;
  await expect(page.getByTestId("booking-title")).toHaveText(BookingTitle);
  // The booker should be in the attendee list
  await expect(page.getByTestId(`attendee-name-${testName}`)).toHaveText(testName);
}

async function expectPageToBeNotFound({ page, url }: { page: Page; url: string }) {
  await page.goto(`${url}`);
  await expect(page.locator(`text=${NotFoundPageTextAppDir}`)).toBeVisible();
}

const createOrg = async (orgs: Fixtures["orgs"], userFixture: Fixtures["users"]) => {
  const org = await orgs.create({
    name: "TestOrg",
  });
  const orgOwner = await userFixture.create({
    name: "org-owner",
    organizationId: org.id,
    roleInOrganization: MembershipRole.OWNER,
  });

  const orgAdmin = await userFixture.create({
    name: "org-admin",
    organizationId: org.id,
    roleInOrganization: MembershipRole.ADMIN,
  });
  const team1owner = await userFixture.create({
    name: "team-owner-1",
    organizationId: org.id,
    roleInOrganization: MembershipRole.MEMBER,
  });
  const team2owner = await userFixture.create({
    name: "team-owner-2",
    organizationId: org.id,
    roleInOrganization: MembershipRole.MEMBER,
  });
  const commonUser = await userFixture.create({
    name: "commonUser",
    organizationId: org.id,
    roleInOrganization: MembershipRole.MEMBER,
  });
  const team1_teammate1 = await userFixture.create({
    name: "team1_teammate1",
    organizationId: org.id,
    roleInOrganization: MembershipRole.MEMBER,
  });
  const team2_teammate1 = await userFixture.create({
    name: "team2_teammate1",
    organizationId: org.id,
    roleInOrganization: MembershipRole.MEMBER,
  });
  const teamOne = await prisma.team.create({
    data: {
      name: "bookings-test-team-1",
      slug: slugify(`bookings-test-team-2-${randomString(5)}`),
      parentId: org.id,
    },
  });

  const teamTwo = await prisma.team.create({
    data: {
      name: "bookings-test-team-2",
      slug: slugify(`bookings-test-team-2-${randomString(5)}`),
      parentId: org.id,
    },
  });

  // create memberships
  await prisma.membership.createMany({
    data: [
      {
        userId: team1owner.id,
        teamId: teamOne.id,
        accepted: true,
        role: "OWNER",
      },
      {
        userId: commonUser.id,
        teamId: teamOne.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: team1_teammate1.id,
        teamId: teamOne.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: team2owner.id,
        teamId: teamTwo.id,
        accepted: true,
        role: "OWNER",
      },
      {
        userId: commonUser.id,
        teamId: teamTwo.id,
        accepted: true,
        role: "MEMBER",
      },
      {
        userId: team2_teammate1.id,
        teamId: teamTwo.id,
        accepted: true,
        role: "MEMBER",
      },
    ],
  });
  return {
    org,
    orgOwner,
    orgAdmin,
    team1owner,
    team2owner,
    commonUser,
    team1_teammate1,
    team2_teammate1,
    teamOne,
    teamTwo,
  };
};
