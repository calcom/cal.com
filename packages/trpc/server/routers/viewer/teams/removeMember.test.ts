import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createBookingScenario,
  TestData,
  getOrganizer,
  getScenarioData,
  Timezones,
  createOrganization,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";
import { setupAndTeardown } from "@calcom/web/test/utils/bookingScenario/setupAndTeardown";

import { describe, test, expect } from "vitest";

import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../trpc";
import removeMember from "./removeMember.handler";

describe("removeMember", () => {
  setupAndTeardown();

  describe("should remove a member from a team", () => {
    test(`1) Should remove a member from a team
          2) Should remove the member from hosts
      `, async () => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

      // Create the child team
      const childTeam = {
        id: 202,
        name: "Team 1",
        slug: "team-1",
        parentId: org.id,
      };

      const organizer = getOrganizer({
        name: "Organizer",
        email: "organizer@example.com",
        id: 101,
        organizationId: org.id,
        schedules: [TestData.schedules.IstWorkHours],
        teams: [
          {
            membership: {
              accepted: true,
              role: MembershipRole.ADMIN,
            },
            team: {
              id: org.id,
              name: "Test Org",
              slug: "testorg",
            },
          },
          {
            membership: {
              accepted: true,
              role: MembershipRole.ADMIN,
            },
            team: {
              id: childTeam.id,
              name: "Team 1",
              slug: "team-1",
              parentId: org.id,
            },
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
          organizationId: org.id,
          schedules: [TestData.schedules.IstEveningShift],
          teams: [
            {
              membership: {
                accepted: true,
                role: MembershipRole.MEMBER,
              },
              team: {
                id: org.id,
                name: "Test Org",
                slug: "testorg",
              },
            },
            {
              membership: {
                accepted: true,
                role: MembershipRole.MEMBER,
              },
              team: {
                id: childTeam.id,
                name: "Team 1",
                slug: "team-1",
                parentId: org.id,
              },
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
                teamId: childTeam.id,
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
      const remainingMemberships = await prismaMock.membership.count({
        where: {
          teamId: childTeam.id,
        },
      });

      expect(remainingMemberships).toBe(1);

      //Check if the event type has the correct hosts
      const remainingHostsCount = await prismaMock.host.count({
        where: {
          eventTypeId: 1,
        },
      });

      expect(remainingHostsCount).toBe(1);
    });
  });
});
