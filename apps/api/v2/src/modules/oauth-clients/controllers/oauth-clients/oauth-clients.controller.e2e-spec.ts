import {
  APPS_READ,
  APPS_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  PROFILE_READ,
  PROFILE_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
  SUCCESS_STATUS,
} from "@calcom/platform-constants";
import type {
  ApiSuccessResponse,
  CreateOAuthClientInput,
  UpdateOAuthClientInput,
} from "@calcom/platform-types";
import type { Membership, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { PlatformBillingRepositoryFixture } from "test/fixtures/repository/billing.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { ApiAuthMockStrategy } from "test/mocks/api-auth-mock.strategy";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { ApiAuthStrategy } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("OAuth Clients Endpoints", () => {
  describe("User Not Authenticated", () => {
    let appWithoutAuth: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, OAuthClientModule, UsersModule, AuthModule, PrismaModule],
      }).compile();
      appWithoutAuth = moduleRef.createNestApplication();
      bootstrap(appWithoutAuth as NestExpressApplication);
      await appWithoutAuth.init();
    });

    it(`/GET`, () => {
      return request(appWithoutAuth.getHttpServer()).get("/api/v2/oauth-clients").expect(401);
    });
    it(`/GET/:id`, () => {
      return request(appWithoutAuth.getHttpServer()).get("/api/v2/oauth-clients/1234").expect(401);
    });
    it(`/POST`, () => {
      return request(appWithoutAuth.getHttpServer()).post("/api/v2/oauth-clients").expect(401);
    });
    it(`/PUT/:id`, () => {
      return request(appWithoutAuth.getHttpServer()).patch("/api/v2/oauth-clients/1234").expect(401);
    });
    it(`/DELETE/:id`, () => {
      return request(appWithoutAuth.getHttpServer()).delete("/api/v2/oauth-clients/1234").expect(401);
    });

    afterAll(async () => {
      await appWithoutAuth.close();
    });
  });

  describe("Organization is not platform", () => {
    let usersFixtures: UserRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;
    let teamFixtures: TeamRepositoryFixture;
    let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;

    let user: User;
    let org: Team;
    let app: INestApplication;
    const userEmail = `oauth-clients-user-${randomString()}@api.com`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, OAuthClientModule, UsersModule, AuthModule, PrismaModule],
        })
      ).compile();
      const strategy = moduleRef.get(ApiAuthStrategy);
      expect(strategy).toBeInstanceOf(ApiAuthMockStrategy);
      usersFixtures = new UserRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);
      teamFixtures = new TeamRepositoryFixture(moduleRef);
      platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);

      user = await usersFixtures.create({
        email: userEmail,
      });
      org = await teamFixtures.create({
        name: `oauth-clients-organization-${randomString()}`,
        isOrganization: true,
        metadata: {
          isOrganization: true,
          orgAutoAcceptEmail: "api.com",
          isOrganizationVerified: true,
          isOrganizationConfigured: true,
        },
        isPlatform: false,
      });
      await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);
      await platformBillingRepositoryFixture.create(org.id);
      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    it(`/GET`, () => {
      return request(app.getHttpServer()).get("/api/v2/oauth-clients").expect(403);
    });

    afterAll(async () => {
      await teamFixtures.delete(org.id);
      await usersFixtures.delete(user.id);
      await app.close();
    });
  });

  describe("User Is Authenticated", () => {
    let usersFixtures: UserRepositoryFixture;
    let membershipFixtures: MembershipRepositoryFixture;
    let teamFixtures: TeamRepositoryFixture;
    let platformBillingRepositoryFixture: PlatformBillingRepositoryFixture;
    let oAuthClientsRepositoryFixture: OAuthClientRepositoryFixture;

    let user: User;
    let org: Team;
    let app: INestApplication;
    const userEmail = `oauth-clients-user-${randomString()}@api.com`;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, OAuthClientModule, UsersModule, AuthModule, PrismaModule],
        })
      ).compile();
      const strategy = moduleRef.get(ApiAuthStrategy);
      expect(strategy).toBeInstanceOf(ApiAuthMockStrategy);
      usersFixtures = new UserRepositoryFixture(moduleRef);
      membershipFixtures = new MembershipRepositoryFixture(moduleRef);
      teamFixtures = new TeamRepositoryFixture(moduleRef);
      platformBillingRepositoryFixture = new PlatformBillingRepositoryFixture(moduleRef);
      oAuthClientsRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);

      user = await usersFixtures.create({
        email: userEmail,
      });
      org = await teamFixtures.create({
        name: `oauth-clients-organization-${randomString()}`,
        isOrganization: true,
        metadata: {
          isOrganization: true,
          orgAutoAcceptEmail: "api.com",
          isOrganizationVerified: true,
          isOrganizationConfigured: true,
        },
        isPlatform: true,
      });
      await platformBillingRepositoryFixture.create(org.id);
      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    describe("User is not part of an organization", () => {
      it(`/GET`, () => {
        return request(app.getHttpServer()).get("/api/v2/oauth-clients").expect(403);
      });
      it(`/GET/:id`, () => {
        return request(app.getHttpServer()).get("/api/v2/oauth-clients/1234").expect(403);
      });
      it(`/POST`, () => {
        return request(app.getHttpServer()).post("/api/v2/oauth-clients").expect(403);
      });
      it(`/PUT/:id`, () => {
        return request(app.getHttpServer()).patch("/api/v2/oauth-clients/1234").expect(403);
      });
      it(`/DELETE/:id`, () => {
        return request(app.getHttpServer()).delete("/api/v2/oauth-clients/1234").expect(403);
      });
    });

    describe("User is part of an organization as Member", () => {
      let membership: Membership;
      beforeAll(async () => {
        membership = await membershipFixtures.addUserToOrg(user, org, "MEMBER", true);
      });

      it(`/GET`, () => {
        return request(app.getHttpServer()).get("/api/v2/oauth-clients").expect(200);
      });
      it(`/GET/:id - oAuth client does not exist`, () => {
        return request(app.getHttpServer()).get("/api/v2/oauth-clients/1234").expect(404);
      });
      it(`/POST`, () => {
        return request(app.getHttpServer()).post("/api/v2/oauth-clients").expect(403);
      });
      it(`/PUT/:id`, () => {
        return request(app.getHttpServer()).patch("/api/v2/oauth-clients/1234").expect(403);
      });
      it(`/DELETE/:id`, () => {
        return request(app.getHttpServer()).delete("/api/v2/oauth-clients/1234").expect(403);
      });

      afterAll(async () => {
        await membershipFixtures.delete(membership.id);
      });
    });

    describe("User is part of an organization as Admin", () => {
      let membership: Membership;
      let client: { clientId: string; clientSecret: string };
      const oAuthClientName = `oauth-clients-admin-${randomString()}`;

      beforeAll(async () => {
        membership = await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);
      });

      it(`/POST`, async () => {
        const body: CreateOAuthClientInput = {
          name: oAuthClientName,
          redirectUris: ["http://test-oauth-client.com"],
          permissions: ["BOOKING_READ", "PROFILE_WRITE"],
        };
        return request(app.getHttpServer())
          .post("/api/v2/oauth-clients")
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<{ clientId: string; clientSecret: string }> =
              response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.clientId).toBeDefined();
            expect(responseBody.data.clientSecret).toBeDefined();
            client = {
              clientId: responseBody.data.clientId,
              clientSecret: responseBody.data.clientSecret,
            };
            const dbOAuthClient = await oAuthClientsRepositoryFixture.get(client.clientId);
            expect(dbOAuthClient).toBeDefined();
            expect(dbOAuthClient?.permissions).toEqual(BOOKING_READ + PROFILE_WRITE);
          });
      });
      it(`/GET`, () => {
        return request(app.getHttpServer())
          .get("/api/v2/oauth-clients")
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient[]> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data).toBeInstanceOf(Array);
            expect(responseBody.data[0].name).toEqual(oAuthClientName);
          });
      });
      it(`/GET/:id`, () => {
        return request(app.getHttpServer())
          .get(`/api/v2/oauth-clients/${client.clientId}`)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(oAuthClientName);
          });
      });
      it(`/PUT/:id`, () => {
        const clientUpdatedName = `oauth-clients-admin-updated-${randomString()}`;
        const body: UpdateOAuthClientInput = { name: clientUpdatedName };
        return request(app.getHttpServer())
          .patch(`/api/v2/oauth-clients/${client.clientId}`)
          .send(body)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(clientUpdatedName);
          });
      });
      it(`/DELETE/:id`, () => {
        return request(app.getHttpServer()).delete(`/api/v2/oauth-clients/${client.clientId}`).expect(200);
      });

      afterAll(async () => {
        await membershipFixtures.delete(membership.id);
      });
    });

    describe("User is part of an organization as Owner", () => {
      let membership: Membership;
      let client: { clientId: string; clientSecret: string };
      const oAuthClientName = `oauth-clients-owner-${randomString()}`;
      const oAuthClientPermissions: CreateOAuthClientInput["permissions"] = [
        "EVENT_TYPE_READ",
        "EVENT_TYPE_WRITE",
        "BOOKING_READ",
        "BOOKING_WRITE",
        "SCHEDULE_READ",
        "SCHEDULE_WRITE",
        "APPS_READ",
        "APPS_WRITE",
        "PROFILE_READ",
        "PROFILE_WRITE",
      ];

      beforeAll(async () => {
        membership = await membershipFixtures.addUserToOrg(user, org, "OWNER", true);
      });

      it(`/POST`, () => {
        const body: CreateOAuthClientInput = {
          name: oAuthClientName,
          redirectUris: ["http://test-oauth-client.com"],
          permissions: ["*"],
        };
        return request(app.getHttpServer())
          .post("/api/v2/oauth-clients")
          .send(body)
          .expect(201)
          .then(async (response) => {
            const responseBody: ApiSuccessResponse<{ clientId: string; clientSecret: string }> =
              response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.clientId).toBeDefined();
            expect(responseBody.data.clientSecret).toBeDefined();
            client = {
              clientId: responseBody.data.clientId,
              clientSecret: responseBody.data.clientSecret,
            };
            const dbOAuthClient = await oAuthClientsRepositoryFixture.get(client.clientId);
            expect(dbOAuthClient).toBeDefined();
            expect(dbOAuthClient?.permissions).toEqual(
              EVENT_TYPE_READ +
                EVENT_TYPE_WRITE +
                BOOKING_READ +
                BOOKING_WRITE +
                SCHEDULE_READ +
                SCHEDULE_WRITE +
                APPS_READ +
                APPS_WRITE +
                PROFILE_READ +
                PROFILE_WRITE
            );
          });
      });

      it(`/GET`, () => {
        return request(app.getHttpServer())
          .get("/api/v2/oauth-clients")
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient[]> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data).toBeInstanceOf(Array);
            expect(responseBody.data[0].name).toEqual(oAuthClientName);
            expect(responseBody.data[0].permissions).toEqual(oAuthClientPermissions);
          });
      });
      it(`/GET/:id`, () => {
        return request(app.getHttpServer())
          .get(`/api/v2/oauth-clients/${client.clientId}`)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(oAuthClientName);
            expect(responseBody.data.permissions).toEqual(oAuthClientPermissions);
          });
      });
      it(`/PUT/:id`, () => {
        const clientUpdatedName = `oauth-clients-owner-updated-${randomString()}`;
        const body: UpdateOAuthClientInput = { name: clientUpdatedName };
        return request(app.getHttpServer())
          .patch(`/api/v2/oauth-clients/${client.clientId}`)
          .send(body)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(clientUpdatedName);
          });
      });
      it(`/DELETE/:id`, () => {
        return request(app.getHttpServer()).delete(`/api/v2/oauth-clients/${client.clientId}`).expect(200);
      });

      afterAll(async () => {
        await membershipFixtures.delete(membership.id);
      });
    });

    afterAll(async () => {
      await teamFixtures.delete(org.id);
      await usersFixtures.delete(user.id);
      await platformBillingRepositoryFixture.deleteSubscriptionForTeam(org.id);
      await app.close();
    });
  });
});
