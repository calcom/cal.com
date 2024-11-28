import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
  createOrganization,
  Timezones,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, test, expect } from "vitest";

import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import removeMember from "./removeMember.handler";

describe("removeMember", () => {
  setupAndTeardown();

  test("should remove a member from a team", async () => {
    const org = await createOrganization({ name: "acme", slug: "acme" });

    const organizer = getOrganizer({
      name: "Organizer",
      email: "organizer@example.com",
      id: 101,
      organizationId: org.id,
      schedules: [TestData.schedules.IstWorkHours],
      teams: [
        {
          team: { id: 2, name: "Team 1", slug: "team-1", parentId: org.id },
          membership: { accepted: true, role: MembershipRole.ADMIN },
        },
        {
          team: { id: org.id, name: org.name, slug: org.slug, parentId: undefined },
          membership: { accepted: true, role: MembershipRole.OWNER },
        },
      ],
    });

    const otherTeamMembers = [
      {
        name: "Other Team Member 1",
        username: "other-team-member-1",
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        email: "other-team-member-1@example.com",
        id: 102,
        schedules: [TestData.schedules.IstEveningShift],
        teams: [
          {
            team: { id: 2, name: "Team 1", slug: "team-1", parentId: org.id },
            membership: { accepted: true },
          },
          {
            team: { id: org.id, name: org.name, slug: org.slug, parentId: undefined },
            membership: { accepted: true },
          },
        ],
      },
    ];

    await createBookingScenario(
      getScenarioData(
        {
          eventTypes: [
            {
              id: 1,
              slug: "round-robin-event",
              schedulingType: SchedulingType.ROUND_ROBIN,
              length: 30,
              hosts: [
                {
                  userId: 101,
                  isFixed: false,
                },
                {
                  userId: 102,
                  isFixed: false,
                },
              ],
            },
          ],
          organizer,
          usersApartFromOrganizer: otherTeamMembers,
          apps: [TestData.apps["daily-video"]],
        },
        org
      )
    );

    //Logged in user is admin of the org
    const ctx = {
      user: {
        id: organizer.id,
        name: organizer.name,
      } as NonNullable<TrpcSessionUser>,
    };

    await removeMember({
      ctx,
      input: {
        teamIds: [org.id],
        memberIds: [102],
        isOrg: true,
      },
    });

    //Check if the remaining memberships are correct
    const remainingMemberships = await prismaMock.membership.findMany({
      where: {
        teamId: 2,
      },
      select: {
        userId: true,
      },
    });

    expect(remainingMemberships.length).toBe(1);

    //Check if the event type has the correct hosts
    const eventType = await prismaMock.eventType.findUnique({
      where: {
        id: 1,
      },
      select: {
        hosts: true,
      },
    });

    expect(eventType?.hosts?.length).toBe(1);
  });
});
