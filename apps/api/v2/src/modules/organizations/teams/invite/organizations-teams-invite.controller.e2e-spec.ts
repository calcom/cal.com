import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Organizations Teams Invite Endpoints", () => {
  describe("User Authentication - User is Org Team Admin", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamsRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    let org: Team;
    let orgTeam: Team;
    let nonOrgTeam: Team;

    const userEmail = `organizations-teams-invite-admin-${randomString()}@api.com`;

    let user: User;

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
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      org = await organizationsRepositoryFixture.create({
        name: `organizations-teams-invite-organization-${randomString()}`,
        isOrganization: true,
      });

      orgTeam = await teamsRepositoryFixture.create({
        name: `organizations-teams-invite-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: org.id } },
      });

      nonOrgTeam = await teamsRepositoryFixture.create({
        name: `organizations-teams-invite-non-org-team-${randomString()}`,
        isOrganization: false,
      });

      // Admin of the org team
      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: orgTeam.id } },
      });

      // Also a member of the organization
      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: user.id } },
        team: { connect: { id: org.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it("should create a team invite", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/invite`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data.token.length).toBeGreaterThan(0);
          expect(response.body.data.inviteLink).toEqual(expect.any(String));
          expect(response.body.data.inviteLink).toContain(response.body.data.token);
        });
    });

    it("should create a new invite on each request", async () => {
      const first = await request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/invite`)
        .expect(200);
      const firstToken = first.body.data.token as string;

      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${orgTeam.id}/invite`)
        .expect(200)
        .then((response) => {
          expect(response.body.status).toEqual(SUCCESS_STATUS);
          expect(response.body.data.token).not.toEqual(firstToken);
          expect(response.body.data.inviteLink).toEqual(expect.any(String));
          expect(response.body.data.inviteLink).toContain(response.body.data.token);
        });
    });

    it("should fail for team not in organization", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/teams/${nonOrgTeam.id}/invite`)
        .expect(404);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await organizationsRepositoryFixture.delete(org.id);
      await teamsRepositoryFixture.delete(nonOrgTeam.id);
      await app.close();
    });
  });
});
