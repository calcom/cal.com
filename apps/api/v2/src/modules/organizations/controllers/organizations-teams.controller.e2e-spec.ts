import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateOrgTeamDto } from "@/modules/organizations/inputs/create-organization-team.input";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

describe("Organizations Team Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let team: Team;
    let team2: Team;
    let teamCreatedViaApi: Team;

    const userEmail = "org-admin-teams-controller-e2e@api.com";
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: "Test org team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      team2 = await teamsRepositoryFixture.create({
        name: "Test org team 2",
        isOrganization: false,
        parent: { connect: { id: org.id } },
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

    it("should get all the teams of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(team.id);
          expect(responseBody.data[1].id).toEqual(team2.id);
        });
    });

    it("should get all the teams of the org paginated", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams?skip=1&take=1`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(team2.id);
        });
    });

    it("should fail if org does not exist", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/120494059/teams`).expect(403);
    });

    it("should get the team of the org", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${team.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(team.id);
          expect(responseBody.data.parentId).toEqual(team.parentId);
        });
    });

    it("should create the team of the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .send({
          name: "Team created via API",
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          teamCreatedViaApi = responseBody.data;
          expect(teamCreatedViaApi.name).toEqual("Team created via API");
          expect(teamCreatedViaApi.parentId).toEqual(org.id);
        });
    });

    it("should update the team of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${teamCreatedViaApi.id}`)
        .send({
          name: "Team created via API Updated",
        } satisfies CreateOrgTeamDto)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          teamCreatedViaApi = responseBody.data;
          expect(teamCreatedViaApi.name).toEqual("Team created via API Updated");
          expect(teamCreatedViaApi.parentId).toEqual(org.id);
        });
    });

    it("should delete the team of the org we created via api", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/teams/${teamCreatedViaApi.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data.id).toEqual(teamCreatedViaApi.id);
          expect(responseBody.data.parentId).toEqual(teamCreatedViaApi.parentId);
        });
    });

    it("should fail to get the team of the org we just deleted", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/${teamCreatedViaApi.id}`)
        .expect(404);
    });

    it("should fail if the team does not exist", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams/123132145`).expect(404);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(team2.id);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});

describe("Organizations Team Endpoints", () => {
  describe("User Authentication - User is Org Member", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let team: Team;
    let team2: Team;

    const userEmail = "org-member-teams-controller-e2e@api.com";
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: "Test org team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      team2 = await teamsRepositoryFixture.create({
        name: "Test org team 2",
        isOrganization: false,
        parent: { connect: { id: org.id } },
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

    it("should deny get all the teams of the org", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams`).expect(403);
    });

    it("should deny get all the teams of the org paginated", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams?skip=1&take=1`).expect(403);
    });

    it("should deny get the team of the org", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams/${team.id}`).expect(403);
    });

    it("should deny create the team of the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .send({
          name: "Team created via API",
        } satisfies CreateOrgTeamDto)
        .expect(403);
    });

    it("should deny update the team of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}`)
        .send({
          name: "Team created via API Updated",
        } satisfies CreateOrgTeamDto)
        .expect(403);
    });

    it("should deny delete the team of the org we created via api", async () => {
      return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/teams/${team2.id}`).expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(team2.id);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});

describe("Organizations Team Endpoints", () => {
  describe("User Authentication - User is Team Owner", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let team: Team;
    let team2: Team;

    const userEmail = "org-member-teams-owner-controller-e2e@api.com";
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: "Test Organization",
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: "Test org team",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      team2 = await teamsRepositoryFixture.create({
        name: "Test org team 2",
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: user.id } },
        team: { connect: { id: team2.id } },
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

    it("should deny get all the teams of the org", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams`).expect(403);
    });

    it("should deny get all the teams of the org paginated", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams?skip=1&take=1`).expect(403);
    });

    it("should get the team of the org for which the user is team owner", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/teams/${team.id}`).expect(200);
    });

    it("should deny create the team of the org", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .send({
          name: "Team created via API",
        } satisfies CreateOrgTeamDto)
        .expect(403);
    });

    it("should deny update the team of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}`)
        .send({
          name: "Team created via API Updated",
        } satisfies CreateOrgTeamDto)
        .expect(403);
    });

    it("should deny delete the team of the org we created via api", async () => {
      return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/teams/${team2.id}`).expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(team2.id);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
