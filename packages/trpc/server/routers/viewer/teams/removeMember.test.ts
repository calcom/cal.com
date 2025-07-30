import prismaMock from "../../../../../../tests/libs/__mocks__/prisma";

import {
  createOrganization,
  getOrganizer,
  createBookingScenario,
  getScenarioData,
  TestData,
  Timezones,
} from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test, expect } from "vitest";

import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";

import type { TrpcSessionUser } from "../../../types";
import removeMember from "./removeMember.handler";

describe("removeMember", () => {
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

    test("Should update username to format ${username}-${userId} when removing user from organization", async () => {
      const org = await createOrganization({
        name: "Test Org",
        slug: "testorg",
      });

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
        ],
      });

      const memberToRemove = {
        name: "Member To Remove",
        username: "member-to-remove",
        timeZone: Timezones["+5:30"],
        defaultScheduleId: null,
        email: "member-to-remove@example.com",
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
        ],
      };

      await createBookingScenario(
        getScenarioData(
          {
            eventTypes: [],
            organizer,
            usersApartFromOrganizer: [memberToRemove],
            apps: [TestData.apps["daily-video"]],
          },
          org
        )
      );

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

      const updatedUser = await prismaMock.user.findUnique({
        where: { id: 102 },
        select: { username: true, organizationId: true },
      });

      expect(updatedUser?.username).toBe("member-to-remove-102");
      expect(updatedUser?.organizationId).toBe(null);
    });
  });
});
