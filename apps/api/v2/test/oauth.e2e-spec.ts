import { AppModule } from "@/app.module";
import { HttpExceptionFilter } from "@/filters/http-exception.filter";
import { PrismaExceptionFilter } from "@/filters/prisma-exception.filter";
import { AuthModule } from "@/modules/auth/auth.module";
import { NextAuthStrategy } from "@/modules/auth/strategy";
import { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import { UpdateOAuthClientInput } from "@/modules/oauth/input/update-oauth-client";
import { OAuthClientModule } from "@/modules/oauth/oauth-client.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UserModule } from "@/modules/repositories/user/user-repository.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { Membership, PlatformOAuthClient, Team, User } from "@prisma/client";
import * as request from "supertest";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";

import { bootstrap } from "../src/app";
import { MembershipFixtures } from "./fixtures/membership.fixtures";
import { TeamFixtures } from "./fixtures/team.fixtures";
import { UsersFixtures } from "./fixtures/users.fixtures";
import { NextAuthMockStrategy } from "./mocks/next-auth-mock.strategy";
import { withNextAuth } from "./utils/withNextAuth";

describe("OAuth Client Endpoints", () => {
  describe("User Not Authenticated", () => {
    let appWithoutAuth: INestApplication;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [PrismaExceptionFilter, HttpExceptionFilter],
        imports: [AppModule, OAuthClientModule, UserModule, AuthModule, PrismaModule],
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
      return request(appWithoutAuth.getHttpServer()).put("/api/v2/oauth-clients/1234").expect(401);
    });
    it(`/delete/:id`, () => {
      return request(appWithoutAuth.getHttpServer()).delete("/api/v2/oauth-clients/1234").expect(401);
    });

    afterAll(async () => {
      await appWithoutAuth.close();
    });
  });

  describe("User Is Authenticated", () => {
    let usersFixtures: UsersFixtures;
    let membershipFixtures: MembershipFixtures;
    let teamFixtures: TeamFixtures;
    let user: User;
    let org: Team;
    let app: INestApplication;
    const userEmail = "test-e2e@api.com";

    beforeAll(async () => {
      const moduleRef = await withNextAuth(
        userEmail,
        Test.createTestingModule({
          providers: [PrismaExceptionFilter, HttpExceptionFilter],
          imports: [AppModule, OAuthClientModule, UserModule, AuthModule, PrismaModule],
        })
      ).compile();
      const strategy = moduleRef.get(NextAuthStrategy);
      expect(strategy).toBeInstanceOf(NextAuthMockStrategy);
      usersFixtures = new UsersFixtures(moduleRef);
      membershipFixtures = new MembershipFixtures(moduleRef);
      teamFixtures = new TeamFixtures(moduleRef);
      user = await usersFixtures.create({
        email: userEmail,
      });
      org = await teamFixtures.create({
        name: "apiOrg",
        metadata: {
          isOrganization: true,
          orgAutoAcceptEmail: "api.com",
          isOrganizationVerified: true,
          isOrganizationConfigured: true,
        },
      });
      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    describe("User is not in an organization", () => {
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
        return request(app.getHttpServer()).put("/api/v2/oauth-clients/1234").expect(403);
      });
      it(`/delete/:id`, () => {
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
        return request(app.getHttpServer()).put("/api/v2/oauth-clients/1234").expect(403);
      });
      it(`/delete/:id`, () => {
        return request(app.getHttpServer()).delete("/api/v2/oauth-clients/1234").expect(403);
      });

      afterAll(async () => {
        await membershipFixtures.delete(membership.id);
      });
    });

    describe("User is part of an organization as Admin", () => {
      let membership: Membership;
      let client: { client_id: string; client_secret: string };
      const oAuthClientName = "test-oauth-client-admin";

      beforeAll(async () => {
        membership = await membershipFixtures.addUserToOrg(user, org, "ADMIN", true);
      });

      it(`/POST`, () => {
        const body: CreateOAuthClientInput = {
          name: oAuthClientName,
          redirect_uris: ["http://test-oauth-client.com"],
          permissions: 32,
        };
        return request(app.getHttpServer())
          .post("/api/v2/oauth-clients")
          .send(body)
          .expect(201)
          .then((response) => {
            const responseBody: ApiSuccessResponse<{ client_id: string; client_secret: string }> =
              response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.client_id).toBeDefined();
            expect(responseBody.data.client_secret).toBeDefined();
            client = {
              client_id: responseBody.data.client_id,
              client_secret: responseBody.data.client_secret,
            };
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
          .get(`/api/v2/oauth-clients/${client.client_id}`)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(oAuthClientName);
          });
      });
      it(`/PUT/:id`, () => {
        const clientUpdatedName = "test-oauth-client-updated";
        const body: UpdateOAuthClientInput = { name: clientUpdatedName };
        return request(app.getHttpServer())
          .put(`/api/v2/oauth-clients/${client.client_id}`)
          .send(body)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(clientUpdatedName);
          });
      });
      it(`/delete/:id`, () => {
        return request(app.getHttpServer()).delete(`/api/v2/oauth-clients/${client.client_id}`).expect(204);
      });

      afterAll(async () => {
        await membershipFixtures.delete(membership.id);
      });
    });

    describe("User is part of an organization as Owner", () => {
      let membership: Membership;
      let client: { client_id: string; client_secret: string };
      const oAuthClientName = "test-oauth-client-owner";
      const oAuthClientPermissions = 32;

      beforeAll(async () => {
        membership = await membershipFixtures.addUserToOrg(user, org, "OWNER", true);
      });

      it(`/POST`, () => {
        const body: CreateOAuthClientInput = {
          name: oAuthClientName,
          redirect_uris: ["http://test-oauth-client.com"],
          permissions: 32,
        };
        return request(app.getHttpServer())
          .post("/api/v2/oauth-clients")
          .send(body)
          .expect(201)
          .then((response) => {
            const responseBody: ApiSuccessResponse<{ client_id: string; client_secret: string }> =
              response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.client_id).toBeDefined();
            expect(responseBody.data.client_secret).toBeDefined();
            client = {
              client_id: responseBody.data.client_id,
              client_secret: responseBody.data.client_secret,
            };
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
          .get(`/api/v2/oauth-clients/${client.client_id}`)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(oAuthClientName);
            expect(responseBody.data.name).toEqual(oAuthClientName);
          });
      });
      it(`/PUT/:id`, () => {
        const clientUpdatedName = "test-oauth-client-updated";
        const body: UpdateOAuthClientInput = { name: clientUpdatedName };
        return request(app.getHttpServer())
          .put(`/api/v2/oauth-clients/${client.client_id}`)
          .send(body)
          .expect(200)
          .then((response) => {
            const responseBody: ApiSuccessResponse<PlatformOAuthClient> = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.name).toEqual(clientUpdatedName);
          });
      });
      it(`/delete/:id`, () => {
        return request(app.getHttpServer()).delete(`/api/v2/oauth-clients/${client.client_id}`).expect(204);
      });

      afterAll(async () => {
        await membershipFixtures.delete(membership.id);
      });
    });

    afterAll(async () => {
      teamFixtures.delete(org.id);
      usersFixtures.delete(user.id);
      await app.close();
    });
  });
});
