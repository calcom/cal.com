import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { User, Team, Membership, Profile } from "@calcom/prisma/client";

describe("Organizations Users Endpoints", () => {
  describe("Member role", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;

    const userEmail = "member@org.com";
    let user: User;
    let org: Team;
    let membership: Membership;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: "Test org",
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      membership = await membershipFixtures.addUserToOrg(user, org, "MEMBER", true);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });
    it("should return true", () => {
      expect(true).toBeTruthy();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should not be able to find org users", async () => {
      return request(app.getHttpServer()).get(`/v2/organizations/${org.id}/users`).expect(403);
    });

    it("should not be able to create a new org user", async () => {
      return request(app.getHttpServer()).post(`/v2/organizations/${org.id}/users`).expect(403);
    });

    it("should not be able to update an org user", async () => {
      return request(app.getHttpServer()).patch(`/v2/organizations/${org.id}/users/${user.id}`).expect(403);
    });

    it("should not be able to delete an org user", async () => {
      return request(app.getHttpServer()).delete(`/v2/organizations/${org.id}/users/${user.id}`).expect(403);
    });
  });
});
