import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Teams Invite Endpoints", () => {
  describe("User Authentication - User is Team Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;

    const userEmail = `teams-invite-admin-${randomString()}@api.com`;

    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `teams-invite-team-${randomString()}`,
        isOrganization: false,
      });

      // Admin of the team
      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it("should create a team invite", async () => {
      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/invite`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data.token.length).toBeGreaterThan(0);
          expect(response.body.data.inviteLink).toEqual(expect.any(String));
          expect(response.body.data.inviteLink).toContain(response.body.data.token);
        });
    });

    it("should create a new invite on each request", async () => {
      const first = await request(app.getHttpServer()).post(`/v2/teams/${team.id}/invite`).expect(200);
      const firstToken = first.body.data.token as string;

      return request(app.getHttpServer())
        .post(`/v2/teams/${team.id}/invite`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data.token).not.toEqual(firstToken);
          expect(response.body.data.inviteLink).toEqual(expect.any(String));
          expect(response.body.data.inviteLink).toContain(response.body.data.token);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await app.close();
    });
  });

  describe("User Authentication - User is Team Member (not Admin)", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let team: Team;

    const userEmail = `teams-invite-member-${randomString()}@api.com`;

    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `teams-invite-member-team-${randomString()}`,
        isOrganization: false,
      });

      // Regular member of the team (not admin)
      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it("should fail to create invite as non-admin member", async () => {
      return request(app.getHttpServer()).post(`/v2/teams/${team.id}/invite`).expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await app.close();
    });
  });

  describe("User Authentication - User is not a Team Member", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;

    let team: Team;

    const userEmail = `teams-invite-non-member-${randomString()}@api.com`;

    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      team = await teamsRepositoryFixture.create({
        name: `teams-invite-non-member-team-${randomString()}`,
        isOrganization: false,
      });

      // User is NOT a member of this team

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it("should fail to create invite as non-member", async () => {
      return request(app.getHttpServer()).post(`/v2/teams/${team.id}/invite`).expect(403);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await teamsRepositoryFixture.delete(team.id);
      await app.close();
    });
  });
});
