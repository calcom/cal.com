import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { EventType, Membership, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { CreateTeamMembershipInput } from "@/modules/teams/memberships/inputs/create-team-membership.input";
import { UpdateTeamMembershipInput } from "@/modules/teams/memberships/inputs/update-team-membership.input";
import { CreateTeamMembershipOutput } from "@/modules/teams/memberships/outputs/create-team-membership.output";
import { GetTeamMembershipOutput } from "@/modules/teams/memberships/outputs/get-team-membership.output";
import { GetTeamMembershipsOutput } from "@/modules/teams/memberships/outputs/get-team-memberships.output";
import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import { UpdateTeamMembershipOutput } from "@/modules/teams/memberships/outputs/update-team-membership.output";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Teams Memberships Endpoints", () => {
  describe("User Authentication - User is Team Admin", () => {
    let app: INestApplication;

    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;
    let teamEventType: EventType;
    let managedEventType: EventType;
    let teamAdminMembership: Membership;
    let teamMemberMembership: Membership;
    let membershipCreatedViaApi: TeamMembershipOutput;

    const teamAdminEmail = `alice-admin-${randomString()}@api.com`;
    const teamMemberEmail = `bob-member-${randomString()}@api.com`;
    const nonTeamUserEmail = `charlie-outsider-${randomString()}@api`;

    const invitedUserEmail = `david-invited-${randomString()}@api.com`;

    let teamAdmin: User;
    let teamMember: User;
    let nonTeamUser: User;

    let teammateInvitedViaApi: User;

    const metadata = {
      some: "key",
    };
    const bio = "This is a bio";

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        teamAdminEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      teamAdmin = await userRepositoryFixture.create({
        email: teamAdminEmail,
        username: teamAdminEmail,
        bio,
        metadata,
      });

      teamMember = await userRepositoryFixture.create({
        email: teamMemberEmail,
        username: teamMemberEmail,
        bio,
        metadata,
      });

      nonTeamUser = await userRepositoryFixture.create({
        email: nonTeamUserEmail,
        username: nonTeamUserEmail,
      });

      teammateInvitedViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
        bio,
        metadata,
      });

      team = await teamsRepositoryFixture.create({
        name: `Team-${randomString()}`,
        isOrganization: false,
      });

      teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: "Collective Event Type",
        slug: "collective-event-type",
        length: 30,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      managedEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "MANAGED",
        team: {
          connect: { id: team.id },
        },
        title: "Managed Event Type",
        slug: "managed-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      teamAdminMembership = await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: teamAdmin.id } },
        team: { connect: { id: team.id } },
      });

      teamMemberMembership = await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamMember.id } },
        team: { connect: { id: team.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teamAdmin.id}`,
        username: teamAdminEmail,
        organization: {
          connect: {
            id: team.id,
          },
        },
        user: {
          connect: {
            id: teamAdmin.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teamMember.id}`,
        username: teamMemberEmail,
        organization: {
          connect: {
            id: team.id,
          },
        },
        user: {
          connect: {
            id: teamMember.id,
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should get all the memberships of the team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(2);
          expect(responseBody.data[0].id).toEqual(teamAdminMembership.id);
          expect(responseBody.data[1].id).toEqual(teamMemberMembership.id);
          expect(responseBody.data[0].teamId).toEqual(team.id);
          expect(responseBody.data[1].teamId).toEqual(team.id);
          expect(responseBody.data[0].userId).toEqual(teamAdmin.id);
          expect(responseBody.data[1].userId).toEqual(teamMember.id);
          expect(responseBody.data[0].role).toEqual("ADMIN");
          expect(responseBody.data[1].role).toEqual("MEMBER");
          expect(responseBody.data[0].user.bio).toEqual(teamAdmin.bio);
          expect(responseBody.data[1].user.bio).toEqual(teamMember.bio);
          expect(responseBody.data[0].user.metadata).toEqual(teamAdmin.metadata);
          expect(responseBody.data[1].user.metadata).toEqual(teamMember.metadata);
          expect(responseBody.data[0].user.email).toEqual(teamAdmin.email);
          expect(responseBody.data[1].user.email).toEqual(teamMember.email);
          expect(responseBody.data[0].user.username).toEqual(teamAdmin.username);
          expect(responseBody.data[1].user.username).toEqual(teamMember.username);
        });
    });

    it("should not be able to access memberships if not part of the team", async () => {
      return request(app.getHttpServer()).get(`/v2/teams/9999/memberships`).expect(403);
    });

    it("should get all the memberships of the org's team paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(teamMemberMembership.id);
          expect(responseBody.data[0].userId).toEqual(teamMember.id);
          expect(responseBody.data[0].role).toEqual("MEMBER");
          expect(responseBody.data[0].user.bio).toEqual(teamMember.bio);
          expect(responseBody.data[0].user.metadata).toEqual(teamMember.metadata);
          expect(responseBody.data[0].user.email).toEqual(teamMember.email);
          expect(responseBody.data[0].user.username).toEqual(teamMember.username);
          expect(responseBody.data.length).toEqual(1);
          expect(responseBody.data[0].teamId).toEqual(team.id);
        });
    });

    it("should get membership of the team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships/${teamAdminMembership.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(teamAdminMembership.id);
          expect(responseBody.data.userId).toEqual(teamAdmin.id);
          expect(responseBody.data.role).toEqual("ADMIN");
          expect(responseBody.data.user.bio).toEqual(teamAdmin.bio);
          expect(responseBody.data.user.metadata).toEqual(teamAdmin.metadata);
          expect(responseBody.data.user.email).toEqual(teamAdmin.email);
          expect(responseBody.data.user.username).toEqual(teamAdmin.username);
        });
    });

    it("should have created the membership of the org's team and assigned team wide events", async () => {
      const createTeamMembershipBody: CreateTeamMembershipInput = {
        userId: teammateInvitedViaApi.id,
        accepted: true,
        role: "MEMBER",
      };

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/memberships`)
        .send(createTeamMembershipBody)
        .expect(201)
        .then((response) => {
          const responseBody: CreateTeamMembershipOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.teamId).toEqual(team.id);
          expect(membershipCreatedViaApi.role).toEqual("MEMBER");
          expect(membershipCreatedViaApi.user.bio).toEqual(teammateInvitedViaApi.bio);
          expect(membershipCreatedViaApi.user.metadata).toEqual(teammateInvitedViaApi.metadata);
          expect(membershipCreatedViaApi.user.email).toEqual(teammateInvitedViaApi.email);
          expect(membershipCreatedViaApi.user.username).toEqual(teammateInvitedViaApi.username);
          expect(membershipCreatedViaApi.userId).toEqual(teammateInvitedViaApi.id);
          userHasCorrectEventTypes(membershipCreatedViaApi.userId);
        });
    });

    async function userHasCorrectEventTypes(userId: number) {
      const managedEventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(userId);
      const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
      expect(managedEventTypes?.length).toEqual(1);
      expect(teamEventTypes?.length).toEqual(2);
      const collectiveEvenType = teamEventTypes?.find((eventType) => eventType.slug === teamEventType.slug);
      expect(collectiveEvenType).toBeTruthy();
      const userHost = collectiveEvenType?.hosts.find((host) => host.userId === userId);
      expect(userHost).toBeTruthy();
      expect(managedEventTypes?.find((eventType) => eventType.slug === managedEventType.slug)).toBeTruthy();
    }

    it("should update the membership of the org's team", async () => {
      const updateTeamMembershipBody: UpdateTeamMembershipInput = {
        role: "OWNER",
      };

      return request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/memberships/${membershipCreatedViaApi.id}`)
        .send(updateTeamMembershipBody)
        .expect(200)
        .then((response) => {
          const responseBody: UpdateTeamMembershipOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.role).toEqual("OWNER");
          expect(membershipCreatedViaApi.user.bio).toEqual(teammateInvitedViaApi.bio);
          expect(membershipCreatedViaApi.user.metadata).toEqual(teammateInvitedViaApi.metadata);
          expect(membershipCreatedViaApi.user.email).toEqual(teammateInvitedViaApi.email);
          expect(membershipCreatedViaApi.user.username).toEqual(teammateInvitedViaApi.username);
        });
    });

    it("should assign team wide events when membership transitions from accepted=false to accepted=true via PATCH", async () => {
      const pendingUserEmail = `pending-user-${randomString()}@api.com`;
      const pendingUser = await userRepositoryFixture.create({
        email: pendingUserEmail,
        username: pendingUserEmail,
        bio,
        metadata,
      });

      const createPendingMembershipBody: CreateTeamMembershipInput = {
        userId: pendingUser.id,
        accepted: false,
        role: "MEMBER",
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/memberships`)
        .send(createPendingMembershipBody)
        .expect(201);

      const pendingMembership: TeamMembershipOutput = createResponse.body.data;
      expect(pendingMembership.accepted).toEqual(false);

      const teamEventTypesBeforePatch = await eventTypesRepositoryFixture.getAllTeamEventTypes(team.id);
      const collectiveEventBeforePatch = teamEventTypesBeforePatch?.find(
        (eventType) => eventType.slug === teamEventType.slug
      );
      const userHostBeforePatch = collectiveEventBeforePatch?.hosts.find(
        (host) => host.userId === pendingUser.id
      );
      expect(userHostBeforePatch).toBeFalsy();

      const updateToAcceptedBody: UpdateTeamMembershipInput = {
        accepted: true,
      };

      const patchResponse = await request(app.getHttpServer())
        .patch(`/v2/teams/${team.id}/memberships/${pendingMembership.id}`)
        .send(updateToAcceptedBody)
        .expect(200);

      const acceptedMembership: TeamMembershipOutput = patchResponse.body.data;
      expect(acceptedMembership.accepted).toEqual(true);

      await userHasCorrectEventTypes(pendingUser.id);

      await request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/memberships/${pendingMembership.id}`)
        .expect(200);

      await userRepositoryFixture.deleteByEmail(pendingUserEmail);
    });

    it("should delete the membership of the org's team we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<TeamMembershipOutput> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membershipCreatedViaApi.id);
        });
    });

    it("should fail to get the membership of the org's team we just deleted", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(404);
    });

    it("should fail if the membership does not exist", async () => {
      return request(app.getHttpServer()).get(`/v2/teams/${team.id}/memberships/123132145`).expect(404);
    });

    it("should filter memberships by single email", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${teamAdminEmail}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(1);
          expect(responseBody.data[0].user.email).toEqual(teamAdminEmail);
          expect(responseBody.data[0].userId).toEqual(teamAdmin.id);
          expect(responseBody.data[0].role).toEqual("ADMIN");
        });
    });

    it("should filter memberships by multiple emails", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${teamAdminEmail},${teamMemberEmail}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(2);

          const emails = responseBody.data.map((membership) => membership.user.email);
          expect(emails).toContain(teamAdminEmail);
          expect(emails).toContain(teamMemberEmail);

          const adminMembership = responseBody.data.find((m) => m.user.email === teamAdminEmail);
          const memberMembership = responseBody.data.find((m) => m.user.email === teamMemberEmail);

          expect(adminMembership).toBeDefined();
          expect(memberMembership).toBeDefined();
          expect(adminMembership?.role).toEqual("ADMIN");
          expect(memberMembership?.role).toEqual("MEMBER");
        });
    });

    it("should return empty array when filtering by non-existent email", async () => {
      const nonExistentEmail = `nonexistent-${randomString()}@test.com`;
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${nonExistentEmail}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(0);
        });
    });

    it("should return partial results when filtering by mix of existing and non-existent emails", async () => {
      const nonExistentEmail = `nonexistent-${randomString()}@test.com`;
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${teamAdminEmail},${nonExistentEmail}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(1);
          expect(responseBody.data[0].user.email).toEqual(teamAdminEmail);
        });
    });

    it("should work with pagination and email filtering combined", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${teamAdminEmail},${teamMemberEmail}&skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(1);
          const returnedEmail = responseBody.data[0].user.email;
          expect([teamAdminEmail, teamMemberEmail]).toContain(returnedEmail);
        });
    });

    it("should handle empty emails array gracefully", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(2);
        });
    });

    it("should handle URL encoded email addresses in filter", async () => {
      const encodedEmail = encodeURIComponent(teamAdminEmail);
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${encodedEmail}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(1);
          expect(responseBody.data[0].user.email).toEqual(teamAdminEmail);
        });
    });

    it("should filter by email and maintain all user properties", async () => {
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${teamMemberEmail}`)
        .expect(200)
        .then((response) => {
          const responseBody: GetTeamMembershipsOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.length).toEqual(1);
          const membership = responseBody.data[0];
          expect(membership.user.email).toEqual(teamMemberEmail);
          expect(membership.user.bio).toEqual(teamMember.bio);
          expect(membership.user.metadata).toEqual(teamMember.metadata);
          expect(membership.user.username).toEqual(teamMember.username);
          expect(membership.teamId).toEqual(team.id);
          expect(membership.userId).toEqual(teamMember.id);
          expect(membership.role).toEqual("MEMBER");
        });
    });

    it("should validate email array size limits", async () => {
      const tooManyEmails = Array.from({ length: 21 }, (_, i) => `test${i}@example.com`).join(",");
      return request(app.getHttpServer())
        .get(`/v2/teams/${team.id}/memberships?emails=${tooManyEmails}`)
        .expect(400);
    });

    // Auto-accept tests for sub-teams of organizations
    describe("auto-accept based on email domain for org sub-teams", () => {
      let orgWithAutoAccept: Team;
      let subteamWithAutoAccept: Team;
      let subteamEventType: EventType;
      let userWithMatchingEmail: User;
      let userWithUppercaseEmail: User;
      let userWithMatchingEmailForOverride: User;
      let userWithNonMatchingEmail: User;

      beforeAll(async () => {
        // Create org with auto-accept settings
        orgWithAutoAccept = await teamsRepositoryFixture.create({
          name: `auto-accept-org-${randomString()}`,
          isOrganization: true,
        });

        // Create organization settings with orgAutoAcceptEmail
        await teamsRepositoryFixture.createOrgSettings(orgWithAutoAccept.id, {
          orgAutoAcceptEmail: "acme.com",
          isOrganizationVerified: true,
          isOrganizationConfigured: true,
          isAdminAPIEnabled: true,
        });

        // Create subteam
        subteamWithAutoAccept = await teamsRepositoryFixture.create({
          name: `auto-accept-subteam-${randomString()}`,
          isOrganization: false,
          parent: { connect: { id: orgWithAutoAccept.id } },
        });

        // Create event type with assignAllTeamMembers
        subteamEventType = await eventTypesRepositoryFixture.createTeamEventType({
          schedulingType: "COLLECTIVE",
          team: { connect: { id: subteamWithAutoAccept.id } },
          title: "Auto Accept Event Type",
          slug: "auto-accept-event-type",
          length: 30,
          assignAllTeamMembers: true,
          bookingFields: [],
          locations: [],
        });

        // Create users with different email domains
        userWithMatchingEmail = await userRepositoryFixture.create({
          email: `alice-${randomString()}@acme.com`,
          username: `alice-${randomString()}`,
        });

        userWithUppercaseEmail = await userRepositoryFixture.create({
          email: `bob-${randomString()}@ACME.COM`,
          username: `bob-${randomString()}`,
        });

        userWithMatchingEmailForOverride = await userRepositoryFixture.create({
          email: `david-${randomString()}@acme.com`,
          username: `david-${randomString()}`,
        });

        userWithNonMatchingEmail = await userRepositoryFixture.create({
          email: `charlie-${randomString()}@external.com`,
          username: `charlie-${randomString()}`,
        });

        // Add users to org
        await membershipsRepositoryFixture.create({
          role: "MEMBER",
          accepted: true,
          user: { connect: { id: userWithMatchingEmail.id } },
          team: { connect: { id: orgWithAutoAccept.id } },
        });

        await membershipsRepositoryFixture.create({
          role: "MEMBER",
          accepted: true,
          user: { connect: { id: userWithUppercaseEmail.id } },
          team: { connect: { id: orgWithAutoAccept.id } },
        });

        await membershipsRepositoryFixture.create({
          role: "MEMBER",
          accepted: true,
          user: { connect: { id: userWithMatchingEmailForOverride.id } },
          team: { connect: { id: orgWithAutoAccept.id } },
        });

        await membershipsRepositoryFixture.create({
          role: "MEMBER",
          accepted: true,
          user: { connect: { id: userWithNonMatchingEmail.id } },
          team: { connect: { id: orgWithAutoAccept.id } },
        });

        // Create profiles for users
        await profileRepositoryFixture.create({
          uid: `usr-${userWithMatchingEmail.id}`,
          username: userWithMatchingEmail.username || `user-${userWithMatchingEmail.id}`,
          organization: { connect: { id: orgWithAutoAccept.id } },
          user: { connect: { id: userWithMatchingEmail.id } },
        });

        await profileRepositoryFixture.create({
          uid: `usr-${userWithUppercaseEmail.id}`,
          username: userWithUppercaseEmail.username || `user-${userWithUppercaseEmail.id}`,
          organization: { connect: { id: orgWithAutoAccept.id } },
          user: { connect: { id: userWithUppercaseEmail.id } },
        });

        await profileRepositoryFixture.create({
          uid: `usr-${userWithMatchingEmailForOverride.id}`,
          username:
            userWithMatchingEmailForOverride.username || `user-${userWithMatchingEmailForOverride.id}`,
          organization: { connect: { id: orgWithAutoAccept.id } },
          user: { connect: { id: userWithMatchingEmailForOverride.id } },
        });

        await profileRepositoryFixture.create({
          uid: `usr-${userWithNonMatchingEmail.id}`,
          username: userWithNonMatchingEmail.username || `user-${userWithNonMatchingEmail.id}`,
          organization: { connect: { id: orgWithAutoAccept.id } },
          user: { connect: { id: userWithNonMatchingEmail.id } },
        });

        // Make teamAdmin an admin of the org and subteam for API access
        await membershipsRepositoryFixture.create({
          role: "ADMIN",
          accepted: true,
          user: { connect: { id: teamAdmin.id } },
          team: { connect: { id: orgWithAutoAccept.id } },
        });

        await membershipsRepositoryFixture.create({
          role: "ADMIN",
          accepted: true,
          user: { connect: { id: teamAdmin.id } },
          team: { connect: { id: subteamWithAutoAccept.id } },
        });

        await profileRepositoryFixture.create({
          uid: `usr-org-${teamAdmin.id}`,
          username: teamAdmin.username || `admin-${teamAdmin.id}`,
          organization: { connect: { id: orgWithAutoAccept.id } },
          user: { connect: { id: teamAdmin.id } },
        });
      });

      it("should auto-accept when email matches orgAutoAcceptEmail for sub-team", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/teams/${subteamWithAutoAccept.id}/memberships`)
          .send({
            userId: userWithMatchingEmail.id,
            role: "MEMBER",
          } satisfies CreateTeamMembershipInput)
          .expect(201);

        const responseBody: CreateTeamMembershipOutput = response.body;
        expect(responseBody.data.accepted).toBe(true);

        // Verify EventTypes assignment
        const eventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(subteamWithAutoAccept.id);
        const eventTypeWithAssignAll = eventTypes.find((et) => et.assignAllTeamMembers);
        expect(eventTypeWithAssignAll).toBeTruthy();
        const userIsHost = eventTypeWithAssignAll?.hosts.some((h) => h.userId === userWithMatchingEmail.id);
        expect(userIsHost).toBe(true);
      });

      it("should handle case-insensitive email domain matching for sub-team", async () => {
        // User with email="bob@ACME.COM" should match orgAutoAcceptEmail="acme.com"
        const response = await request(app.getHttpServer())
          .post(`/v2/teams/${subteamWithAutoAccept.id}/memberships`)
          .send({
            userId: userWithUppercaseEmail.id,
            role: "MEMBER",
          } satisfies CreateTeamMembershipInput)
          .expect(201);

        const responseBody: CreateTeamMembershipOutput = response.body;
        expect(responseBody.data.accepted).toBe(true);
      });

      it("should ALWAYS auto-accept when email matches, even if accepted:false for sub-team", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/teams/${subteamWithAutoAccept.id}/memberships`)
          .send({
            userId: userWithMatchingEmailForOverride.id,
            role: "MEMBER",
            accepted: false,
          } satisfies CreateTeamMembershipInput)
          .expect(201);

        const responseBody: CreateTeamMembershipOutput = response.body;
        // Should override to true because email matches
        expect(responseBody.data.accepted).toBe(true);
      });

      it("should NOT auto-accept when email does not match orgAutoAcceptEmail for sub-team", async () => {
        const response = await request(app.getHttpServer())
          .post(`/v2/teams/${subteamWithAutoAccept.id}/memberships`)
          .send({
            userId: userWithNonMatchingEmail.id,
            role: "MEMBER",
          } satisfies CreateTeamMembershipInput)
          .expect(201);

        const responseBody: CreateTeamMembershipOutput = response.body;
        expect(responseBody.data.accepted).toBe(false);
      });

      afterAll(async () => {
        await userRepositoryFixture.deleteByEmail(userWithMatchingEmail.email);
        await userRepositoryFixture.deleteByEmail(userWithUppercaseEmail.email);
        await userRepositoryFixture.deleteByEmail(userWithMatchingEmailForOverride.email);
        await userRepositoryFixture.deleteByEmail(userWithNonMatchingEmail.email);
        await teamsRepositoryFixture.deleteOrgSettings(orgWithAutoAccept.id);
        await teamsRepositoryFixture.delete(subteamWithAutoAccept.id);
        await teamsRepositoryFixture.delete(orgWithAutoAccept.id);
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(teamAdmin.email);
      await userRepositoryFixture.deleteByEmail(teammateInvitedViaApi.email);
      await userRepositoryFixture.deleteByEmail(nonTeamUser.email);
      await userRepositoryFixture.deleteByEmail(teamMember.email);
      await teamsRepositoryFixture.delete(team.id);
      await app.close();
    });
  });
});
