import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { ConferencingAppsOutputDto } from "@/modules/conferencing/outputs/get-conferencing-apps.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { CredentialsRepositoryFixture } from "test/fixtures/repository/credentials.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import {
  GOOGLE_CALENDAR_ID,
  GOOGLE_CALENDAR_TYPE,
  GOOGLE_MEET,
  GOOGLE_MEET_TYPE,
  SUCCESS_STATUS,
} from "@calcom/platform-constants";
import type { ApiSuccessResponse } from "@calcom/platform-types";
import type { User } from "@calcom/prisma/client";

describe("Conferencing Endpoints", () => {
  describe("conferencing controller e2e tests", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let credentialsRepositoryFixture: CredentialsRepositoryFixture;

    const userEmail = `conferencing-user-${randomString()}@api.com`;
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      credentialsRepositoryFixture = new CredentialsRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should get all the conferencing apps of the auth user", async () => {
      return request(app.getHttpServer())
        .get(`/v2/conferencing`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<ConferencingAppsOutputDto[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toEqual([]);
        });
    });

    it("should fail to connect google meet if google calendar is not connected ", async () => {
      return request(app.getHttpServer())
        .post(`/v2/conferencing/google-meet/connect`)
        .expect(400)
        .then(async () => {
          await credentialsRepositoryFixture.create(GOOGLE_CALENDAR_TYPE, {}, user.id, GOOGLE_CALENDAR_ID);
        });
    });

    it("should connect google meet if google calendar is connected ", async () => {
      return request(app.getHttpServer())
        .post(`/v2/conferencing/google-meet/connect`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<ConferencingAppsOutputDto[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
        });
    });

    it("should set google meet as default conferencing app", async () => {
      return request(app.getHttpServer())
        .post(`/v2/conferencing/google-meet/default`)
        .expect(200)
        .then(async () => {
          const updatedUser = await userRepositoryFixture.get(user.id);

          expect(updatedUser).toBeDefined();

          if (updatedUser) {
            const metadata = updatedUser.metadata as { defaultConferencingApp?: { appSlug?: string } };
            expect(metadata?.defaultConferencingApp?.appSlug).toEqual(GOOGLE_MEET);
          }
        });
    });

    it("should get all the conferencing apps of the auth user, and contain google meet", async () => {
      return request(app.getHttpServer())
        .get(`/v2/conferencing`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<ConferencingAppsOutputDto[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const googleMeet = responseBody.data.find((app) => app.type === GOOGLE_MEET_TYPE);
          expect(googleMeet?.userId).toEqual(user.id);
        });
    });

    it("should disconnect google meet", async () => {
      return request(app.getHttpServer()).delete(`/v2/conferencing/google-meet/disconnect`).expect(200);
    });

    it("should get all the conferencing apps of the auth user, and not contain google meet", async () => {
      return request(app.getHttpServer())
        .get(`/v2/conferencing`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<ConferencingAppsOutputDto[]> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const googleMeet = responseBody.data.find((app) => app.type === GOOGLE_MEET_TYPE);
          expect(googleMeet).toBeUndefined();
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await app.close();
    });
  });
});
