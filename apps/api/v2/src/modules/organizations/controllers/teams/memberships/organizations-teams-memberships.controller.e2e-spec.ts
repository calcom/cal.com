import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrgTeamMembershipDto } from "@/modules/organizations/inputs/create-organization-team-membership.input";
import { UpdateOrgTeamMembershipDto } from "@/modules/organizations/inputs/update-organization-team-membership.input";
import { OrgTeamMembershipOutputDto } from "@/modules/organizations/outputs/organization-teams-memberships.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
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
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { Membership, Team } from "@calcom/prisma/client";

describe("Organizations Teams Memberships Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let orgTeam: Team;
    let nonOrgTeam: Team;
    let teamEventType: EventType;
    let managedEventType: EventType;
    let membership: Membership;
    let membership2: Membership;
    let membershipCreatedViaApi: OrgTeamMembershipOutputDto;

    const userEmail = "org-admin-membership-teams-controller-e2e@api.com";
    const userEmail2 = "org-member-membership-teams-controller-e2e@api.com";
    const nonOrgUserEmail = "non-org-member-membership-teams-controller-e2e@api.com";

    const invitedUserEmail = "org-member-invited-membership-teams-controller-e2e@api.com";

    let user: User;
    let user2: User;
    let nonOrgUser: User;

    let userToInviteViaApi: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
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

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });
      user2 = await userRepositoryFixture.create({
        email: userEmail2,
        username: userEmail2,
      });

      nonOrgUser = await userRepositoryFixture.create({
        email: nonOrgUserEmail,
        username: nonOrgUserEmail,
      });

      userToInviteViaApi = await userRepositoryFixture.create({
        email: invitedUserEmail,
        username: invitedUserEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
        isOrganization: true,
      });

      orgTeam = await teamsRepositoryFixture.create({
        name: "Org Team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: orgTeam.id },
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
          connect: { id: orgTeam.id },
        },
        title: "Managed Event Type",
        slug: "managed-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      nonOrgTeam = await teamsRepositoryFixture.create({
        name: "Non Org Team",
        isOrganization: false,
      });

      membership = await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: orgTeam.id } },
      });

      membership2 = await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user2.id } },
        team: { connect: { id: orgTeam.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user2.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: userToInviteViaApi.id } },
        team: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: nonOrgUser.id } },
        team: { connect: { id: nonOrgTeam.id } },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${user.id}`,
        username: userEmail,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${user2.id}`,
        username: userEmail2,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: user2.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${userToInviteViaApi.id}`,
        username: invitedUserEmail,
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: userToInviteViaApi.id,
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should get all the memberships of the org's team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership.id);
          expect(responseBody.data[1].id).toEqual(membership2.id);
          expect(responseBody.data.length).toEqual(2);
        });
    });

    it("should fail to get all the memberships of team which is not in the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${nonOrgTeam.id}/memberships`)
        .expect(404);
    });

    it("should get all the memberships of the org's team paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships?skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(membership2.id);
          expect(responseBody.data[0].userId).toEqual(user2.id);
          expect(responseBody.data.length).toEqual(1);
        });
    });

    it("should fail if org does not exist", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/120494059/teams/${orgTeam.id}/memberships`)
        .expect(403);
    });

    it("should get the membership of the org's team", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships/${membership.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membership.id);
          expect(responseBody.data.userId).toEqual(user.id);
          expect(responseBody.data.user.email).toEqual(user.email);
        });
    });

    it("should fail to get the membership of a team not in the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${nonOrgTeam.id}/memberships/${membership.id}`)
        .expect(404);
    });

    it("should fail to create the membership of a team not in the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${nonOrgTeam.id}/memberships`)
        .send({
          userId: userToInviteViaApi.id,
          accepted: true,
          role: "MEMBER",
        } satisfies CreateOrgTeamMembershipDto)
        .expect(404);
    });

    it("should have created the membership of the org's team and assigned team wide events", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships`)
        .send({
          userId: userToInviteViaApi.id,
          accepted: true,
          role: "MEMBER",
        } satisfies CreateOrgTeamMembershipDto)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.teamId).toEqual(orgTeam.id);
          expect(membershipCreatedViaApi.role).toEqual("MEMBER");
          expect(membershipCreatedViaApi.userId).toEqual(userToInviteViaApi.id);
          expect(membershipCreatedViaApi.user.email).toEqual(userToInviteViaApi.email);
          userHasCorrectEventTypes(membershipCreatedViaApi.userId);
        });
    });

    async function userHasCorrectEventTypes(userId: number) {
      const managedEventTypes = await eventTypesRepositoryFixture.getAllUserEventTypes(userId);
      const teamEventTypes = await eventTypesRepositoryFixture.getAllTeamEventTypes(orgTeam.id);
      expect(managedEventTypes?.length).toEqual(1);
      expect(teamEventTypes?.length).toEqual(2);
      const collectiveEvenType = teamEventTypes?.find((eventType) => eventType.slug === teamEventType.slug);
      expect(collectiveEvenType).toBeTruthy();
      const userHost = collectiveEvenType?.hosts.find((host) => host.userId === userId);
      expect(userHost).toBeTruthy();
      expect(managedEventTypes?.find((eventType) => eventType.slug === managedEventType.slug)).toBeTruthy();
    }

    it("should fail to create the membership of the org's team for a non org user", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships`)
        .send({
          userId: nonOrgUser.id,
          accepted: true,
          role: "MEMBER",
        } satisfies CreateOrgTeamMembershipDto)
        .expect(422);
    });

    it("should update the membership of the org's team", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships/${membershipCreatedViaApi.id}`)
        .send({
          role: "OWNER",
        } satisfies UpdateOrgTeamMembershipDto)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          membershipCreatedViaApi = responseBody.data;
          expect(membershipCreatedViaApi.role).toEqual("OWNER");
        });
    });

    it("should delete the membership of the org's team we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgTeamMembershipOutputDto> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(membershipCreatedViaApi.id);
        });
    });

    it("should fail to get the membership of the org's team we just deleted", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships/${membershipCreatedViaApi.id}`)
        .expect(404);
    });

    it("should fail if the membership does not exist", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/memberships/123132145`)
        .expect(404);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(userToInviteViaApi.email);
      await userRepositoryFixture.deleteByEmail(nonOrgUser.email);
      await userRepositoryFixture.deleteByEmail(user2.email);
      await organizationsRepositoryFixture.delete(org.id);
      await teamsRepositoryFixture.delete(nonOrgTeam.id);
      await app.close();
    });
  });
});
