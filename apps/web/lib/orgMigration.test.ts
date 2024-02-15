import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { WEBSITE_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { MembershipRole, Prisma } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { moveTeamToOrg, moveUserToOrg, removeTeamFromOrg, removeUserFromOrg } from "./orgMigration";

const WEBSITE_PROTOCOL = new URL(WEBSITE_URL).protocol;
describe("orgMigration", () => {
  describe("moveUserToOrg", () => {
    describe("when user email does not match orgAutoAcceptEmail", () => {
      it(`should migrate a user to become a part of an organization with ADMIN role
          - username in the organization should be automatically derived from email when it isn't passed`, async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@example.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1-example",
          },
          targetOrg: {
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "ADMIN",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        const dbOrg = await createOrg({
          name: data.targetOrg.name,
          slug: data.targetOrg.slug,
        });

        const team1 = await createTeamOutsideOrg({
          name: "Team-1",
          slug: "team-1",
        });

        // Make userToMigrate part of team-1
        await addMemberShipOfUserWithTeam({
          teamId: team1.id,
          userId: dbUserToMigrate.id,
          role: "MEMBER",
          accepted: true,
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });

        await expectTeamToBeNotPartOfAnyOrganization({
          teamId: team1.id,
        });

        expectUserRedirectToBeEnabled({
          from: {
            username: data.userToMigrate.username,
          },
          to: data.userToMigrate.expectedUsernameInOrg,
          orgSlug: data.targetOrg.slug,
        });
      });

      it("should migrate a user to become a part of an organization(which has slug set) with MEMBER role", async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@example.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1-example",
          },
          targetOrg: {
            id: 1,
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "MEMBER",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        const dbOrg = await createOrg({
          slug: data.targetOrg.slug,
          name: data.targetOrg.name,
        });

        await moveUserToOrg({
          user: {
            id: dbOrg.id,
          },
          targetOrg: {
            id: data.targetOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: data.targetOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });
      });

      it(`should migrate a user to become a part of an organization(which has no slug but requestedSlug) with MEMBER role
        1. Should set the slug as requestedSlug for the organization(so that the redirect doesnt take to an unpublished organization page)`, async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@example.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1-example",
          },
          targetOrg: {
            name: "Org 1",
            requestedSlug: "org1",
          },
          membershipWeWant: {
            role: "MEMBER",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: "user-1@example.com",
          username: "user-1",
        });

        const dbOrg = await createOrg({
          name: data.targetOrg.name,
          metadata: {
            requestedSlug: data.targetOrg.requestedSlug,
          },
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        const organization = await prismock.team.findUnique({
          where: {
            id: dbOrg.id,
          },
        });

        expect(organization?.slug).toBe(data.targetOrg.requestedSlug);

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });
      });

      it("should migrate a user along with its teams(without other members)", async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@example.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1-example",
            teams: [
              {
                name: "Team 100",
                slug: "team-100",
              },
              {
                name: "Team 101",
                slug: "team-101",
              },
            ],
          },
          targetOrg: {
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "MEMBER",
          } as const,
          userPartOfTeam1: {
            username: "user-2",
            email: "user-2@example.com",
          },
          userPartOfTeam2: {
            username: "user-3",
            email: "user-3@example.com",
          },
        };

        // Create user to migrate
        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        // Create another user that would be part of team-1 along with userToMigrate
        const userPartOfTeam1 = await createUserOutsideOrg({
          email: data.userPartOfTeam1.email,
          username: data.userPartOfTeam1.username,
        });

        // Create another user that would be part of team-2 along with userToMigrate
        const userPartOfTeam2 = await createUserOutsideOrg({
          email: data.userPartOfTeam2.email,
          username: data.userPartOfTeam2.username,
        });

        const team1 = await createTeamOutsideOrg({
          name: data.userToMigrate.teams[0].name,
          slug: data.userToMigrate.teams[0].slug,
        });

        const team2 = await createTeamOutsideOrg({
          name: data.userToMigrate.teams[1].name,
          slug: data.userToMigrate.teams[1].slug,
        });

        // Make userToMigrate part of team-1
        await addMemberShipOfUserWithTeam({
          teamId: team1.id,
          userId: dbUserToMigrate.id,
          role: "MEMBER",
          accepted: true,
        });

        // Make userToMigrate part of team-2
        await addMemberShipOfUserWithTeam({
          teamId: team2.id,
          userId: dbUserToMigrate.id,
          role: "MEMBER",
          accepted: true,
        });

        // Make userPartofTeam1 part of team-1
        await addMemberShipOfUserWithTeam({
          teamId: team1.id,
          userId: userPartOfTeam1.id,
          role: "MEMBER",
          accepted: true,
        });

        // Make userPartofTeam2 part of team2
        await addMemberShipOfUserWithTeam({
          teamId: team2.id,
          userId: userPartOfTeam2.id,
          role: "MEMBER",
          accepted: true,
        });

        const dbOrg = await createOrg({
          name: data.targetOrg.name,
          slug: data.targetOrg.slug,
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: true,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });

        await expectTeamToBeAPartOfOrg({
          teamId: team1.id,
          orgId: dbOrg.id,
          teamSlugInOrg: team1.slug,
        });

        await expectTeamToBeAPartOfOrg({
          teamId: team2.id,
          orgId: dbOrg.id,
          teamSlugInOrg: team2.slug,
        });

        await expectUserToBeNotAPartOfTheOrg({
          userId: userPartOfTeam1.id,
          orgId: dbOrg.id,
          username: data.userPartOfTeam1.username,
        });

        await expectUserToBeNotAPartOfTheOrg({
          userId: userPartOfTeam2.id,
          orgId: dbOrg.id,
          username: data.userPartOfTeam2.username,
        });
      });

      it(`should migrate a user to become a part of an organization
      - username in the organization should same as provided to moveUserToOrg`, async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@example.com",
            usernameInOrgThatWeWant: "user-1-in-org",
          },
          targetOrg: {
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "ADMIN",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        const dbOrg = await createOrg({
          name: data.targetOrg.name,
          slug: data.targetOrg.slug,
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            username: data.userToMigrate.usernameInOrgThatWeWant,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.usernameInOrgThatWeWant,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });

        expectUserRedirectToBeEnabled({
          from: {
            username: data.userToMigrate.username,
          },
          to: data.userToMigrate.usernameInOrgThatWeWant,
          orgSlug: data.targetOrg.slug,
        });
      });

      it(`should be able to re-migrate an already migrated user fixing things as we do it
          - Redirect should correctly determine the nonOrgUsername so that on repeat migrations, the original user link doesn't break`, async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@example.com",
            // Because example.com isn't the orgAutoAcceptEmail
            usernameWeWantInOrg: "user-1-in-org",
          },
          targetOrg: {
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "MEMBER",
          } as const,
        };

        const dbOrg = await createOrg({
          name: data.targetOrg.name,
          slug: data.targetOrg.slug,
        });

        const dbUserToMigrate = await createUserInsideTheOrg(
          {
            email: data.userToMigrate.email,
            username: data.userToMigrate.username,
          },
          dbOrg.id
        );

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            username: data.userToMigrate.usernameWeWantInOrg,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.usernameWeWantInOrg,
          // membership role should be updated
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            username: data.userToMigrate.usernameWeWantInOrg,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.usernameWeWantInOrg,
          // membership role should be updated
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });

        expectUserRedirectToBeEnabled({
          from: {
            username: data.userToMigrate.username,
          },
          to: data.userToMigrate.usernameWeWantInOrg,
          orgSlug: data.targetOrg.slug,
        });

        console.log(await prismock.tempOrgRedirect.findMany({}));
      });

      describe("Failures handling", () => {
        it("migration should fail if the username already exists in the organization", async () => {
          const data = {
            userToMigrate: {
              username: "user-1",
              email: "user-1@example.com",
              // Because example.com isn't the orgAutoAcceptEmail
              expectedUsernameInOrg: "user-1-example",
            },
            targetOrg: {
              name: "Org 1",
              slug: "org1",
            },
            membershipWeWant: {
              role: "MEMBER",
            } as const,
          };

          const dbOrg = await createOrg({
            name: data.targetOrg.name,
            slug: data.targetOrg.slug,
          });

          await createUserInsideTheOrg(
            {
              email: data.userToMigrate.email,
              username: data.userToMigrate.username,
            },
            dbOrg.id
          );

          // User with same username exists outside the org as well as inside the org
          const dbUserToMigrate = await createUserOutsideOrg({
            email: data.userToMigrate.email,
            username: data.userToMigrate.username,
          });

          expect(() => {
            return moveUserToOrg({
              user: {
                id: dbUserToMigrate.id,
              },
              targetOrg: {
                id: dbOrg.id,
                username: data.userToMigrate.username,
                membership: {
                  role: data.membershipWeWant.role,
                },
              },
              shouldMoveTeams: false,
            });
          }).rejects.toThrowError("already exists");
        });

        it("should fail the migration if the target org doesn't exist", async () => {
          const data = {
            userToMigrate: {
              username: "user-1",
              email: "user-1@example.com",
              // Because example.com isn't the orgAutoAcceptEmail
              expectedUsernameInOrg: "user-1-example",
            },
            targetOrg: {
              name: "Org 1",
              slug: "org1",
            },
            membershipWeWant: {
              role: "MEMBER",
            } as const,
          };

          const dbOrg = await createOrg({
            name: data.targetOrg.name,
            slug: data.targetOrg.slug,
          });

          await createUserInsideTheOrg(
            {
              email: data.userToMigrate.email,
              username: data.userToMigrate.username,
            },
            dbOrg.id
          );

          // User with same username exists outside the org as well as inside the org
          const dbUserToMigrate = await createUserOutsideOrg({
            email: data.userToMigrate.email,
            username: data.userToMigrate.username,
          });

          expect(() => {
            return moveUserToOrg({
              user: {
                id: dbUserToMigrate.id,
              },
              targetOrg: {
                // Non existent teamId
                id: 1001,
                username: data.userToMigrate.username,
                membership: {
                  role: data.membershipWeWant.role,
                },
              },
              shouldMoveTeams: false,
            });
          }).rejects.toThrowError(/Org .* not found/);
        });

        it("should fail the migration if the target teamId is not an organization", async () => {
          const data = {
            userToMigrate: {
              username: "user-1",
              email: "user-1@example.com",
              // Because example.com isn't the orgAutoAcceptEmail
              expectedUsernameInOrg: "user-1-example",
            },
            targetOrg: {
              name: "Org 1",
              slug: "org1",
            },
            membershipWeWant: {
              role: "MEMBER",
            } as const,
          };

          // Create a team instead of an organization
          const dbOrgWhichIsActuallyATeam = await createTeamOutsideOrg({
            name: data.targetOrg.name,
            slug: data.targetOrg.slug,
          });

          const dbUserToMigrate = await createUserOutsideOrg({
            email: data.userToMigrate.email,
            username: data.userToMigrate.username,
          });

          expect(() => {
            return moveUserToOrg({
              user: {
                id: dbUserToMigrate.id,
              },
              targetOrg: {
                // Non existent teamId
                id: dbOrgWhichIsActuallyATeam.id,
                username: data.userToMigrate.username,
                membership: {
                  role: data.membershipWeWant.role,
                },
              },
              shouldMoveTeams: false,
            });
          }).rejects.toThrowError(/is not an Org/);
        });

        it("should fail the migration if the user is part of any other organization", async () => {
          const data = {
            userToMigrate: {
              username: "user-1",
              email: "user-1@example.com",
              // Because example.com isn't the orgAutoAcceptEmail
              expectedUsernameInOrg: "user-1-example",
            },
            targetOrg: {
              name: "Org 1",
              slug: "org1",
            },
            membershipWeWant: {
              role: "MEMBER",
            } as const,
          };

          const dbOrg = await createOrg({
            name: data.targetOrg.name,
            slug: data.targetOrg.slug,
          });

          const dbOrgOther = await createOrg({
            name: data.targetOrg.name,
            slug: data.targetOrg.slug,
          });

          const dbUserToMigrate = await createUserInsideTheOrg(
            {
              email: data.userToMigrate.email,
              username: data.userToMigrate.username,
            },
            dbOrgOther.id
          );

          expect(() => {
            return moveUserToOrg({
              user: {
                id: dbUserToMigrate.id,
              },
              targetOrg: {
                // Non existent teamId
                id: dbOrg.id,
                username: data.userToMigrate.username,
                membership: {
                  role: data.membershipWeWant.role,
                },
              },
              shouldMoveTeams: false,
            });
          }).rejects.toThrowError(/already a part of different organization/);
        });
      });
    });

    describe("when user email matches orgAutoAcceptEmail", () => {
      const orgSettings = {
        orgAutoAcceptEmail: "org1.com",
      } as const;

      it(`should migrate a user to become a part of an organization with ADMIN role`, async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@org1.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1",
          },
          targetOrg: {
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "ADMIN",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        const dbOrg = await createOrg({
          slug: data.targetOrg.slug,
          name: data.targetOrg.name,
          organizationSettings: {
            create: {
              ...orgSettings,
            },
          },
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });

        expectUserRedirectToBeEnabled({
          from: {
            username: data.userToMigrate.username,
          },
          to: data.userToMigrate.expectedUsernameInOrg,
          orgSlug: data.targetOrg.slug,
        });
      });

      it("should migrate a user to become a part of an organization(which has slug set) with MEMBER role", async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@org1.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1",
          },
          targetOrg: {
            name: "Org 1",
            slug: "org1",
          },
          membershipWeWant: {
            role: "MEMBER",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        const dbOrg = await createOrg({
          slug: data.targetOrg.slug,
          name: data.targetOrg.name,
          organizationSettings: {
            create: {
              ...orgSettings,
            },
          },
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });
      });

      it(`should migrate a user to become a part of an organization(which has no slug but requestedSlug) with MEMBER role
        1. Should set the slug as requestedSlug for the organization(so that the redirect doesnt take to an unpublished organization page)`, async () => {
        const data = {
          userToMigrate: {
            username: "user-1",
            email: "user-1@org1.com",
            // Because example.com isn't the orgAutoAcceptEmail
            expectedUsernameInOrg: "user-1",
          },
          targetOrg: {
            name: "Org 1",
            requestedSlug: "org1",
          },
          membershipWeWant: {
            role: "MEMBER",
          } as const,
        };

        const dbUserToMigrate = await createUserOutsideOrg({
          email: data.userToMigrate.email,
          username: data.userToMigrate.username,
        });

        const dbOrg = await createOrg({
          name: data.targetOrg.name,
          metadata: {
            requestedSlug: data.targetOrg.requestedSlug,
          },
          organizationSettings: {
            create: {
              ...orgSettings,
            },
          },
        });

        await moveUserToOrg({
          user: {
            id: dbUserToMigrate.id,
          },
          targetOrg: {
            id: dbOrg.id,
            membership: {
              role: data.membershipWeWant.role,
            },
          },
          shouldMoveTeams: false,
        });

        const organization = await prismock.team.findUnique({
          where: {
            id: dbOrg.id,
          },
        });

        expect(organization?.slug).toBe(data.targetOrg.requestedSlug);

        await expectUserToBeAPartOfOrg({
          userId: dbUserToMigrate.id,
          orgId: dbOrg.id,
          usernameInOrg: data.userToMigrate.expectedUsernameInOrg,
          expectedMembership: { role: data.membershipWeWant.role, accepted: true },
        });
      });
    });
  });

  describe("moveTeamToOrg", () => {
    it(`should migrate a team to become a part of an organization`, async () => {
      const data = {
        teamToMigrate: {
          id: 1,
          name: "Team 1",
          slug: "team1",
          newSlug: "team1-new-slug",
        },
        targetOrg: {
          id: 2,
          name: "Org 1",
          slug: "org1",
        },
      };

      await prismock.team.create({
        data: {
          id: data.teamToMigrate.id,
          slug: data.teamToMigrate.slug,
          name: data.teamToMigrate.name,
        },
      });

      await prismock.team.create({
        data: {
          id: data.targetOrg.id,
          slug: data.targetOrg.slug,
          name: data.targetOrg.name,
          isOrganization: true,
        },
      });

      await moveTeamToOrg({
        teamId: data.teamToMigrate.id,
        targetOrg: {
          id: data.targetOrg.id,
          teamSlug: data.teamToMigrate.newSlug,
        },
      });

      await expectTeamToBeAPartOfOrg({
        teamId: data.teamToMigrate.id,
        orgId: data.targetOrg.id,
        teamSlugInOrg: data.teamToMigrate.newSlug,
      });

      expectTeamRedirectToBeEnabled({
        from: {
          teamSlug: data.teamToMigrate.slug,
        },
        to: data.teamToMigrate.newSlug,
        orgSlug: data.targetOrg.slug,
      });
    });
    it.todo("should migrate a team with members");
    it.todo("Try migrating an already migrated team");
  });

  describe("removeUserFromOrg", () => {
    it(`should remove a user from an organization but he should remain in team`, async () => {
      const data = {
        userToUnmigrate: {
          username: "user1-in-org1",
          email: "user-1@example.com",
          usernameBeforeMovingToOrg: "user1",
        },
        targetOrg: {
          name: "Org 1",
          slug: "org1",
        },
        membershipWeWant: {
          role: "ADMIN",
        } as const,
      };

      const dbOrg = await createOrg({
        slug: data.targetOrg.slug,
        name: data.targetOrg.name,
      });

      const dbTeamOutsideOrg = await createTeamOutsideOrg({
        slug: "team-1",
        name: "Team 1",
      });

      const dbUser = await createUserInsideTheOrg(
        {
          email: data.userToUnmigrate.email,
          username: data.userToUnmigrate.username,
          metadata: {
            migratedToOrgFrom: {
              username: data.userToUnmigrate.usernameBeforeMovingToOrg,
            },
          },
        },
        dbOrg.id
      );

      await addMemberShipOfUserWithOrg({
        userId: dbUser.id,
        teamId: dbTeamOutsideOrg.id,
        role: "MEMBER",
        accepted: true,
      });

      await addMemberShipOfUserWithTeam({
        userId: dbUser.id,
        teamId: dbOrg.id,
        role: data.membershipWeWant.role,
        accepted: true,
      });

      const userToUnmigrate = await prismock.user.findUnique({
        where: {
          id: dbUser.id,
        },
        include: {
          organization: true,
        },
      });

      if (!userToUnmigrate?.organizationId || !userToUnmigrate.organization) {
        throw new Error(
          `Couldn't setup user to unmigrate properly userToUnMigrate: ${{
            organizationId: userToUnmigrate?.organizationId,
            organization: !!userToUnmigrate?.organization,
          }}`
        );
      }

      await removeUserFromOrg({
        userId: dbUser.id,
        targetOrgId: dbOrg.id,
      });

      await expectUserToBeNotAPartOfTheOrg({
        userId: dbUser.id,
        orgId: dbOrg.id,
        username: data.userToUnmigrate.usernameBeforeMovingToOrg,
      });

      await expectUserToBeAPartOfTeam({
        userId: dbUser.id,
        teamId: dbTeamOutsideOrg.id,
        expectedMembership: {
          role: "MEMBER",
          accepted: true,
        },
      });

      expectUserRedirectToBeNotEnabled({
        from: {
          username: data.userToUnmigrate.username,
        },
      });
    });
  });

  describe("removeTeamFromOrg", () => {
    it(`should remove a team from an organization`, async () => {
      const data = {
        teamToUnmigrate: {
          name: "Team 1",
          slug: "team1",
        },
        targetOrg: {
          name: "Org 1",
          slug: "org1",
        },
      };

      const targetOrg = await prismock.team.create({
        data: {
          slug: data.targetOrg.slug,
          name: data.targetOrg.name,
          metadata: {
            isOrganization: true,
          },
        },
      });

      const { id: teamToUnMigrateId } = await prismock.team.create({
        data: {
          slug: data.teamToUnmigrate.slug,
          name: data.teamToUnmigrate.name,
          parent: {
            connect: {
              id: targetOrg.id,
            },
          },
        },
      });

      const teamToUnmigrate = await prismock.team.findUnique({
        where: {
          id: teamToUnMigrateId,
        },
        include: {
          parent: true,
        },
      });

      if (!teamToUnmigrate?.parent || !teamToUnmigrate.parentId) {
        throw new Error(`Couldn't setup team to unmigrate properly ID:${teamToUnMigrateId}`);
      }

      await removeTeamFromOrg({
        teamId: teamToUnMigrateId,
        targetOrgId: targetOrg.id,
      });

      await expectTeamToBeNotPartOfAnyOrganization({
        teamId: teamToUnMigrateId,
      });

      expectTeamRedirectToBeNotEnabled({
        from: {
          teamSlug: data.teamToUnmigrate.slug,
        },
        to: data.teamToUnmigrate.slug,
        orgSlug: data.targetOrg.slug,
      });
    });

    it(`should remove a team from an organization with it's members`, async () => {
      const data = {
        teamToUnmigrate: {
          name: "Team 1",
          slug: "team1",
          members: [
            {
              username: "user1-example",
              email: "user1@example.com",
              usernameBeforeMovingToOrg: "user1",
            },
          ],
        },
        targetOrg: {
          name: "Org 1",
          slug: "org1",
        },
      };

      const targetOrg = await prismock.team.create({
        data: {
          slug: data.targetOrg.slug,
          name: data.targetOrg.name,
          metadata: {
            isOrganization: true,
          },
        },
      });

      const { id: teamToUnMigrateId } = await prismock.team.create({
        data: {
          slug: data.teamToUnmigrate.slug,
          name: data.teamToUnmigrate.name,
          parent: {
            connect: {
              id: targetOrg.id,
            },
          },
        },
      });

      const teamToUnmigrate = await prismock.team.findUnique({
        where: {
          id: teamToUnMigrateId,
        },
        include: {
          parent: true,
        },
      });

      if (!teamToUnmigrate?.parent || !teamToUnmigrate.parentId) {
        throw new Error(`Couldn't setup team to unmigrate properly ID:${teamToUnMigrateId}`);
      }

      const member1OfTeam = await createUserInsideTheOrg(
        {
          email: data.teamToUnmigrate.members[0].email,
          username: data.teamToUnmigrate.members[0].username,
          metadata: {
            migratedToOrgFrom: {
              username: data.teamToUnmigrate.members[0].usernameBeforeMovingToOrg,
            },
          },
        },
        targetOrg.id
      );

      addMemberShipOfUserWithOrg({
        userId: member1OfTeam.id,
        teamId: targetOrg.id,
        role: "MEMBER",
        accepted: true,
      });

      addMemberShipOfUserWithTeam({
        teamId: teamToUnmigrate.id,
        userId: member1OfTeam.id,
        role: "MEMBER",
        accepted: true,
      });

      expectUserToBeAPartOfOrg({
        userId: member1OfTeam.id,
        orgId: targetOrg.id,
        usernameInOrg: data.teamToUnmigrate.members[0].username,
        expectedMembership: {
          role: "MEMBER",
          accepted: true,
        },
      });

      expectUserToBeAPartOfTeam({
        userId: member1OfTeam.id,
        teamId: teamToUnmigrate.id,
        expectedMembership: {
          role: "MEMBER",
          accepted: true,
        },
      });

      await removeTeamFromOrg({
        teamId: teamToUnMigrateId,
        targetOrgId: targetOrg.id,
      });

      await expectTeamToBeNotPartOfAnyOrganization({
        teamId: teamToUnMigrateId,
      });

      expectTeamRedirectToBeNotEnabled({
        from: {
          teamSlug: data.teamToUnmigrate.slug,
        },
        to: data.teamToUnmigrate.slug,
        orgSlug: data.targetOrg.slug,
      });

      expectUserRedirectToBeNotEnabled({
        from: {
          username: data.teamToUnmigrate.members[0].usernameBeforeMovingToOrg,
        },
      });

      expectUserToBeNotAPartOfTheOrg({
        userId: member1OfTeam.id,
        orgId: targetOrg.id,
        username: data.teamToUnmigrate.members[0].usernameBeforeMovingToOrg,
      });

      expectUserToBeNotAPartOfTheTeam({
        userId: member1OfTeam.id,
        teamId: targetOrg.id,
        username: data.teamToUnmigrate.members[0].usernameBeforeMovingToOrg,
      });
    });
  });
});

async function expectUserToBeAPartOfOrg({
  userId,
  orgId,
  expectedMembership,
  usernameInOrg,
}: {
  userId: number;
  orgId: number;
  usernameInOrg: string;
  expectedMembership: {
    role: MembershipRole;
    accepted: boolean;
  };
}) {
  const migratedUser = await prismock.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      teams: true,
    },
  });
  if (!migratedUser) {
    throw new Error(`User with id ${userId} does not exist`);
  }

  expect(migratedUser.username).toBe(usernameInOrg);
  expect(migratedUser.organizationId).toBe(orgId);

  const membership = migratedUser.teams.find(
    (membership) => membership.teamId === orgId && membership.userId === userId
  );

  expect(membership).not.toBeNull();
  if (!membership) {
    throw new Error(`User with id ${userId} is not a part of org with id ${orgId}`);
  }
  expect(membership.role).toBe(expectedMembership.role);
  expect(membership.accepted).toBe(expectedMembership.accepted);
}

async function expectUserToBeAPartOfTeam({
  userId,
  teamId,
  expectedMembership,
}: {
  userId: number;
  teamId: number;
  expectedMembership: {
    role: MembershipRole;
    accepted: boolean;
  };
}) {
  const user = await prismock.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      teams: true,
    },
  });
  if (!user) {
    throw new Error(`User with id ${userId} does not exist`);
  }

  const membership = user.teams.find(
    (membership) => membership.teamId === teamId && membership.userId === userId
  );

  expect(membership).not.toBeNull();
  if (!membership) {
    throw new Error(`User with id ${userId} is not a part of team with id ${teamId}`);
  }
  expect(membership.role).toBe(expectedMembership.role);
  expect(membership.accepted).toBe(expectedMembership.accepted);
}

async function expectUserToBeNotAPartOfTheOrg({
  userId,
  orgId,
  username,
}: {
  userId: number;
  orgId: number;
  username: string;
}) {
  expectUserToBeNotAPartOfTheTeam({
    userId,
    teamId: orgId,
    username,
  });
}

async function expectUserToBeNotAPartOfTheTeam({
  userId,
  teamId,
  username,
}: {
  userId: number;
  teamId: number;
  username: string;
}) {
  const user = await prismock.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      teams: true,
    },
  });
  if (!user) {
    throw new Error(`User with id ${userId} does not exist`);
  }

  expect(user.username).toBe(username);
  expect(user.organizationId).toBe(null);

  const membership = user.teams.find(
    (membership) => membership.teamId === teamId && membership.userId === userId
  );

  expect(membership).toBeUndefined();
}

async function expectTeamToBeAPartOfOrg({
  teamId,
  orgId,
  teamSlugInOrg,
}: {
  teamId: number;
  orgId: number;
  teamSlugInOrg: string | null;
}) {
  const migratedTeam = await prismock.team.findUnique({
    where: {
      id: teamId,
    },
  });
  if (!migratedTeam) {
    throw new Error(`Team with id ${teamId} does not exist`);
  }

  if (!teamSlugInOrg) {
    throw new Error(`teamSlugInOrg should be defined`);
  }
  expect(migratedTeam.parentId).toBe(orgId);
  expect(migratedTeam.slug).toBe(teamSlugInOrg);
}

async function expectTeamToBeNotPartOfAnyOrganization({ teamId }: { teamId: number }) {
  const team = await prismock.team.findUnique({
    where: {
      id: teamId,
    },
  });
  if (!team) {
    throw new Error(`Team with id ${teamId} does not exist`);
  }

  expect(team.parentId).toBe(null);
}

async function expectUserRedirectToBeEnabled({
  from,
  to,
  orgSlug,
}: {
  from: { username: string } | { teamSlug: string };
  to: string;
  orgSlug: string;
}) {
  expectRedirectToBeEnabled({
    from,
    to,
    orgSlug,
    redirectType: RedirectType.User,
  });
}

async function expectTeamRedirectToBeEnabled({
  from,
  to,
  orgSlug,
}: {
  from: { username: string } | { teamSlug: string };
  to: string;
  orgSlug: string;
}) {
  expectRedirectToBeEnabled({
    from,
    to,
    orgSlug,
    redirectType: RedirectType.Team,
  });
}

async function expectUserRedirectToBeNotEnabled({
  from,
}: {
  from: { username: string } | { teamSlug: string };
}) {
  expectRedirectToBeNotEnabled({
    from,
  });
}

async function expectTeamRedirectToBeNotEnabled({
  from,
}: {
  from: { username: string } | { teamSlug: string };
  to: string;
  orgSlug: string;
}) {
  expectRedirectToBeNotEnabled({
    from,
  });
}

async function expectRedirectToBeEnabled({
  from,
  to,
  orgSlug,
  redirectType,
}: {
  from: { username: string } | { teamSlug: string };
  to: string;
  orgSlug: string;
  redirectType: RedirectType;
}) {
  let tempOrgRedirectWhere = null;
  let tempOrgRedirectThatShouldNotExistWhere = null;
  if ("username" in from) {
    tempOrgRedirectWhere = {
      from_type_fromOrgId: {
        from: from.username,
        type: RedirectType.User,
        fromOrgId: 0,
      },
    };

    // Normally with user migration `from.username != to`
    if (from.username !== to) {
      // There must not be a redirect setup from=To to something else as that would cause double redirection
      tempOrgRedirectThatShouldNotExistWhere = {
        from_type_fromOrgId: {
          from: to,
          type: RedirectType.User,
          fromOrgId: 0,
        },
      };
    }
  } else if ("teamSlug" in from) {
    tempOrgRedirectWhere = {
      from_type_fromOrgId: {
        from: from.teamSlug,
        type: RedirectType.Team,
        fromOrgId: 0,
      },
    };

    if (from.teamSlug !== to) {
      // There must not be a redirect setup from=To to something else as that would cause double redirection
      tempOrgRedirectThatShouldNotExistWhere = {
        from_type_fromOrgId: {
          from: to,
          type: RedirectType.Team,
          fromOrgId: 0,
        },
      };
    }
  } else {
    throw new Error("Atleast one of userId or teamId should be present in from");
  }
  const redirect = await prismock.tempOrgRedirect.findUnique({
    where: tempOrgRedirectWhere,
  });

  if (tempOrgRedirectThatShouldNotExistWhere) {
    const redirectThatShouldntBeThere = await prismock.tempOrgRedirect.findUnique({
      where: tempOrgRedirectThatShouldNotExistWhere,
    });
    expect(redirectThatShouldntBeThere).toBeNull();
  }

  expect(redirect).not.toBeNull();
  expect(redirect?.toUrl).toBe(`${WEBSITE_PROTOCOL}//${orgSlug}.cal.local:3000/${to}`);
  if (!redirect) {
    throw new Error(`Redirect doesn't exist for ${JSON.stringify(tempOrgRedirectWhere)}`);
  }
  expect(redirect.type).toBe(redirectType);
}

async function expectRedirectToBeNotEnabled({ from }: { from: { username: string } | { teamSlug: string } }) {
  let tempOrgRedirectWhere = null;
  if ("username" in from) {
    tempOrgRedirectWhere = {
      from_type_fromOrgId: {
        from: from.username,
        type: RedirectType.User,
        fromOrgId: 0,
      },
    };
  } else if ("teamSlug" in from) {
    tempOrgRedirectWhere = {
      from_type_fromOrgId: {
        from: from.teamSlug,
        type: RedirectType.Team,
        fromOrgId: 0,
      },
    };
  } else {
    throw new Error("Atleast one of userId or teamId should be present in from");
  }
  const redirect = await prismock.tempOrgRedirect.findUnique({
    where: tempOrgRedirectWhere,
  });
  expect(redirect).toBeNull();
}

async function createOrg(
  data: Omit<Prisma.TeamCreateArgs["data"], "metadata" | "parent"> & {
    metadata?: z.infer<typeof teamMetadataSchema>;
  }
) {
  return await prismock.team.create({
    data: {
      ...data,
      isOrganization: true,
      metadata: {
        ...(data.metadata || {}),
      },
    },
  });
}

async function createTeamOutsideOrg(
  data: Omit<Prisma.TeamCreateArgs["data"], "metadata" | "parent"> & {
    metadata?: z.infer<typeof teamMetadataSchema>;
  }
) {
  return await prismock.team.create({
    data: {
      ...data,
      parentId: null,
      metadata: {
        ...(data.metadata || {}),
        isOrganization: false,
      },
    },
  });
}

async function createUserOutsideOrg(
  data: Omit<Prisma.UserCreateArgs["data"], "organization" | "movedToProfile">
) {
  return await prismock.user.create({
    data: {
      ...data,
      movedToProfileId: null,
      organizationId: null,
    },
  });
}

async function createUserInsideTheOrg(
  data: Omit<Prisma.UserUncheckedCreateInput, "organization" | "organizationId" | "id" | "movedToProfileId">,
  orgId: number
) {
  const org = await prismock.team.findUnique({
    where: {
      id: orgId,
    },
  });
  if (!org) {
    throw new Error(`Org with id ${orgId} does not exist`);
  }
  logger.debug(
    `Creating user inside org`,
    safeStringify({
      orgId,
      data,
    })
  );
  return await prismock.user.create({
    data: {
      ...data,
      organization: {
        connect: {
          id: orgId,
        },
      },
    },
  });
}

async function addMemberShipOfUserWithTeam({
  teamId,
  userId,
  role,
  accepted,
}: {
  teamId: number;
  userId: number;
  role: MembershipRole;
  accepted: boolean;
}) {
  await prismock.membership.create({
    data: {
      role,
      accepted,
      team: {
        connect: {
          id: teamId,
        },
      },
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });

  const membership = await prismock.membership.findUnique({
    where: {
      userId_teamId: {
        teamId,
        userId,
      },
    },
  });
  if (!membership) {
    throw new Error(`Membership between teamId ${teamId} and userId ${userId} couldn't be created`);
  }
}

const addMemberShipOfUserWithOrg = addMemberShipOfUserWithTeam;
