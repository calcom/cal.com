import { SUCCESS_STATUS, X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { mockThrottlerGuard } from "test/utils/withNoThrottler";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateOrgTeamDto } from "@/modules/organizations/teams/index/inputs/create-organization-team.input";
import { OrgMeTeamOutputDto } from "@/modules/organizations/teams/index/outputs/organization-team.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Team Endpoints", () => {
  describe("User Authentication - User is Org Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let team: Team;
    let team2: Team;
    let teamCreatedViaApi: Team;
    let teamCreatedViaApi2: Team;
    let teamCreatedViaApi3: Team;

    const userEmail = `organizations-teams-admin-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      mockThrottlerGuard();

      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-teams-organization-${randomString()}`,
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: `organizations-teams-team1-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      team2 = await teamsRepositoryFixture.create({
        name: `organizations-teams-team2-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(teamsRepositoryFixture).toBeDefined();
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
          console.log("WOOOW", responseBody.data);
          expect([team2.id, team.id]).toContain(responseBody.data[0].id);
          expect([team2.id]);
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
      const teamName = `organizations-teams-api-team1-${randomString()}`;
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .send({
          name: teamName,
          slug: "team-created-via-api",
          bio: "This is our test team created via API",
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          teamCreatedViaApi = responseBody.data;
          expect(teamCreatedViaApi.name).toEqual(teamName);
          expect(teamCreatedViaApi.slug).toEqual("team-created-via-api");
          expect(teamCreatedViaApi.bio).toEqual("This is our test team created via API");
          expect(teamCreatedViaApi.parentId).toEqual(org.id);
          const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(
            user.id,
            teamCreatedViaApi.id
          );
          expect(membership?.role ?? "").toEqual("OWNER");
          expect(membership?.accepted).toEqual(true);
        });
    });

    it("should get all the teams of the authenticated org member", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams/me`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<OrgMeTeamOutputDto[]> = response.body;
          expect(responseBody.data.find((t) => t.id === teamCreatedViaApi.id)).toBeDefined();
          expect(responseBody.data.some((t) => t.accepted)).toBeTruthy();
          expect(responseBody.data.find((t) => t.id === teamCreatedViaApi.id)?.role).toBe("OWNER");
        });
    });

    it("should update the team of the org", async () => {
      const updatedTeamName = `organizations-teams-api-team1-${randomString()}-updated`;
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${teamCreatedViaApi.id}`)
        .send({
          name: updatedTeamName,
          weekStart: "Monday",
          logoUrl: "https://i.cal.com/api/avatar/b0b58752-68ad-4c0d-8024-4fa382a77752.png",
          bannerUrl: "https://i.cal.com/api/avatar/949be534-7a88-4185-967c-c020b0c0bef3.png",
        } satisfies CreateOrgTeamDto)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          teamCreatedViaApi = responseBody.data;
          expect(teamCreatedViaApi.name).toEqual(updatedTeamName);
          expect(teamCreatedViaApi.weekStart).toEqual("Monday");
          expect(teamCreatedViaApi.logoUrl).toEqual(
            "https://i.cal.com/api/avatar/b0b58752-68ad-4c0d-8024-4fa382a77752.png"
          );
          expect(teamCreatedViaApi.bannerUrl).toEqual(
            "https://i.cal.com/api/avatar/949be534-7a88-4185-967c-c020b0c0bef3.png"
          );
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

    it("should create the team of the org without auto-accepting creator", async () => {
      const teamName = `organizations-teams-api-team2-${randomString()}`;
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .send({
          name: teamName,
          autoAcceptCreator: false,
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          teamCreatedViaApi2 = responseBody.data;
          expect(teamCreatedViaApi2.name).toEqual(teamName);
          expect(teamCreatedViaApi2.parentId).toEqual(org.id);
          const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(
            user.id,
            teamCreatedViaApi2.id
          );
          expect(membership?.role ?? "").toEqual("OWNER");
          expect(membership?.accepted).toEqual(false);
        });
    });

    it("should create the team of the org with automatically set slug", async () => {
      const teamName = `Organizations Teams Automatic Slug`;
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .send({
          name: teamName,
          bio: "This is our test team created via API",
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          teamCreatedViaApi3 = responseBody.data;
          expect(teamCreatedViaApi3.name).toEqual(teamName);
          expect(teamCreatedViaApi3.slug).toEqual("organizations-teams-automatic-slug");
          expect(teamCreatedViaApi3.bio).toEqual("This is our test team created via API");
          expect(teamCreatedViaApi3.parentId).toEqual(org.id);
          const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(
            user.id,
            teamCreatedViaApi3.id
          );
          expect(membership?.role ?? "").toEqual("OWNER");
          expect(membership?.accepted).toEqual(true);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await teamsRepositoryFixture.delete(team2.id);
      await teamsRepositoryFixture.delete(teamCreatedViaApi2.id);
      await teamsRepositoryFixture.delete(teamCreatedViaApi3.id);
      await teamsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});

describe("Organizations Team Endpoints", () => {
  describe("User Authentication - User is Org Member", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let team: Team;
    let team2: Team;

    const userEmail = `organizations-teams-member-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      mockThrottlerGuard();

      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-teams-organization-${randomString()}`,
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: `organizations-teams-team1-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      team2 = await teamsRepositoryFixture.create({
        name: `organizations-teams-team2-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(teamsRepositoryFixture).toBeDefined();
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
          name: `organizations-teams-api-team1-${randomString()}`,
        } satisfies CreateOrgTeamDto)
        .expect(403);
    });

    it("should deny update the team of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}`)
        .send({
          name: `organizations-teams-api-team1-${randomString()}-updated`,
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
      await teamsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});

describe("Organizations Team Endpoints", () => {
  describe("User Authentication - User is Team Owner", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let team: Team;
    let team2: Team;

    const userEmail = `organizations-teams-owner-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      mockThrottlerGuard();

      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-teams-organization-${randomString()}`,
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      team = await teamsRepositoryFixture.create({
        name: `organizations-teams-team1-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      team2 = await teamsRepositoryFixture.create({
        name: `organizations-teams-team2-${randomString()}`,
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
          name: `organizations-teams-api-team1-${randomString()}`,
        } satisfies CreateOrgTeamDto)
        .expect(403);
    });

    it("should deny update the team of the org", async () => {
      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/teams/${team.id}`)
        .send({
          name: `organizations-teams-api-team1-${randomString()}-updated`,
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
  describe("Platform teams", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let orgRepositoryFixture: OrganizationRepositoryFixture;

    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;

    let oAuthClient1: PlatformOAuthClient;
    let oAuthClient2: PlatformOAuthClient;
    let org: Team;
    let team1: Team;
    let team2: Team;

    const userEmail = `organizations-teams-platform-owner-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      mockThrottlerGuard();

      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      orgRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await orgRepositoryFixture.create({
        name: `organizations-teams-platform-organization-${randomString()}`,
        isOrganization: true,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      oAuthClient1 = await createOAuthClient(org.id);
      oAuthClient2 = await createOAuthClient(org.id);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["redirect-uri"],
        permissions: 32,
      };
      const secret = "secret";

      return await oauthClientRepositoryFixture.create(organizationId, data, secret);
    }

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(teamsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should create first oAuth client team", async () => {
      const teamName = `organizations-teams-platform-api-team1-${randomString()}`;
      const teamMetadata = {
        key: `value ${randomString()}`,
      };
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .set(X_CAL_CLIENT_ID, oAuthClient1.id)
        .send({
          name: teamName,
          metadata: teamMetadata,
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          team1 = responseBody.data;
          expect(team1.name).toEqual(teamName);
          expect(team1.metadata).toEqual(teamMetadata);
          expect(team1.parentId).toEqual(org.id);

          const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(user.id, team1.id);

          expect(membership?.role ?? "").toEqual("OWNER");
          expect(membership?.accepted).toEqual(true);
        });
    });

    it("should create second oAuth client team", async () => {
      const teamName = `organizations-teams-platform-api-team2-${randomString()}`;
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams`)
        .set(X_CAL_CLIENT_ID, oAuthClient2.id)
        .set(X_CAL_SECRET_KEY, oAuthClient2.secret)
        .send({
          name: teamName,
        } satisfies CreateOrgTeamDto)
        .expect(201)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          team2 = responseBody.data;
          expect(team2.name).toEqual(teamName);
          expect(team2.parentId).toEqual(org.id);

          const membership = await membershipsRepositoryFixture.getUserMembershipByTeamId(user.id, team2.id);

          expect(membership?.role ?? "").toEqual("OWNER");
          expect(membership?.accepted).toEqual(true);
        });
    });

    it("should get all the platform teams correctly tied to OAuth clients", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/teams`)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<Team[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data[0].id).toEqual(team1.id);
          expect(responseBody.data[1].id).toEqual(team2.id);

          const oAuthClientTeams = await teamsRepositoryFixture.getPlatformOrgTeams(org.id, oAuthClient1.id);
          expect(oAuthClientTeams.length).toEqual(1);
          const oAuthClientTeam = oAuthClientTeams[0];
          expect(oAuthClientTeam.id).toEqual(team1.id);
          expect(oAuthClientTeam.name).toEqual(team1.name);

          const oAuthClient2Teams = await teamsRepositoryFixture.getPlatformOrgTeams(org.id, oAuthClient2.id);
          expect(oAuthClient2Teams.length).toEqual(1);
          const oAuthClientTeam2 = oAuthClient2Teams[0];
          expect(oAuthClientTeam2.id).toEqual(team2.id);
          expect(oAuthClientTeam2.name).toEqual(team2.name);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team1.id);
      await teamsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
