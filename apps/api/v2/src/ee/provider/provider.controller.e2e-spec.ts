import { X_CAL_SECRET_KEY, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("CalProviderController (e2e)", () => {
  let app: INestApplication;
  let userRepositoryFixture: UserRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let membershipRepositoryFixture: MembershipRepositoryFixture;
  let oAuthClientRepositoryFixture: OAuthClientRepositoryFixture;

  let user: User;
  let org: Team;
  let oAuthClientId: string;
  const oAuthClientSecret = `test-secret-${randomString()}`;
  const userEmail = `provider-controller-e2e-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    membershipRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    oAuthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    org = await teamRepositoryFixture.create({
      name: `provider-e2e-org-${randomString()}`,
      isOrganization: true,
      metadata: {
        isOrganization: true,
        orgAutoAcceptEmail: "api.com",
        isOrganizationVerified: true,
        isOrganizationConfigured: true,
      },
      isPlatform: true,
    });

    await membershipRepositoryFixture.addUserToOrg(user, org, "ADMIN", true);

    const oAuthClient = await oAuthClientRepositoryFixture.create(org.id, {
      name: `provider-e2e-client-${randomString()}`,
      redirectUris: ["http://test-provider.com"],
      permissions: 32,
    }, oAuthClientSecret);

    oAuthClientId = oAuthClient.id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("GET /v2/provider/:clientId", () => {
    it("should return 401 for invalid client id", () => {
      return request(app.getHttpServer())
        .get("/api/v2/provider/non-existent-client-id")
        .expect(401);
    });

    it("should return client data for valid client id", () => {
      return request(app.getHttpServer())
        .get(`/api/v2/provider/${oAuthClientId}`)
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual(SUCCESS_STATUS);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.clientId).toEqual(oAuthClientId);
          expect(res.body.data.organizationId).toEqual(org.id);
          expect(res.body.data.name).toBeDefined();
        });
    });
  });

  describe("GET /v2/provider/:clientId/access-token", () => {
    it("should return 401 for unauthenticated request", () => {
      return request(app.getHttpServer())
        .get(`/api/v2/provider/${oAuthClientId}/access-token`)
        .expect(401);
    });

    it("should return success when authenticated with OAuth client credentials", () => {
      return request(app.getHttpServer())
        .get(`/api/v2/provider/${oAuthClientId}/access-token`)
        .set(X_CAL_SECRET_KEY, oAuthClientSecret)
        .expect(200)
        .then((res) => {
          expect(res.body.status).toEqual(SUCCESS_STATUS);
        });
    });
  });

  afterAll(async () => {
    await oAuthClientRepositoryFixture.delete(oAuthClientId);
    await teamRepositoryFixture.delete(org.id);
    await userRepositoryFixture.delete(user.id);
    await app.close();
  });
});
