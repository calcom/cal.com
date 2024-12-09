import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/inputs/update-organization-team-membership.input";
import { OrgTeamMembershipOutputDto } from "@/modules/organizations/outputs/organization-teams-memberships.output";
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
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { EventType, User } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomNumber } from "test/utils/randomNumber";
import { withApiAuth } from "test/utils/withApiAuth";

import { api } from "@calcom/app-store/alby";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { Membership, Team } from "@calcom/prisma/client";

describe("Teams Memberships Endpoints", () => {
  describe("User Authentication - User is Team Admin", () => {
    let app: INestApplication;

    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;
    let teamEventType: EventType;
    let managedEventType: EventType;
    let teamAdminMembership: Membership;
    let teamMemberMembership: Membership;
    let membershipCreatedViaApi: TeamMembershipOutput;

    const teamAdminEmail = `alice-admin-${randomNumber()}@api.com`;
    const teamMemberEmail = `bob-member-${randomNumber()}@api.com`;
    const nonTeamUserEmail = `charlie-outsider-${randomNumber()}@api`;

    const invitedUserEmail = `david-invited-${randomNumber()}@api.com`;

    let teamAdmin: User;
    let teamMember: User;
    let nonTeamUser: User;

    let teammateInvitedViaApi: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        teamAdminEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      teamAdmin = await userRepositoryFixture.create({
        email: teamAdminEmail,
        username: teamAdminEmail,
      });
      teamMember = await userRepositoryFixture.create({
        email: teamMemberEmail,
        username: teamMemberEmail,
      });
      nonTeamUser = await userRepositoryFixture.create({
        email: nonTeamUserEmail,
        username: nonTeamUserEmail,
      });
      teammateInvitedViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `Team-${randomNumber()}`,
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
          expect(responseBody.data.length).toEqual(1);
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
        });
    });

    it("should delete the membership of the org's team we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/teams/${team.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto> = response.body;
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
