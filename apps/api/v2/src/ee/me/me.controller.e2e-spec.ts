import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { UserReturned } from "@/ee/me/me.controller";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { AvailabilitiesModule } from "@/modules/availabilities/availabilities.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withAccessTokenAuth } from "test/utils/withAccessTokenAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiSuccessResponse } from "@calcom/platform-types";

describe("Me Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;

    const userEmail = "me-controller-e2e@api.com";
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withAccessTokenAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, AvailabilitiesModule, UsersModule],
          providers: [SchedulesRepository, SchedulesService],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should get user associated with access token", async () => {
      return request(app.getHttpServer())
        .get("/api/v2/me")
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<UserReturned> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data?.id).toEqual(user.id);
          expect(responseBody.data?.email).toEqual(user.email);
          expect(responseBody.data?.timeFormat).toEqual(user.timeFormat);
          expect(responseBody.data?.defaultScheduleId).toEqual(user.defaultScheduleId);
          expect(responseBody.data?.weekStart).toEqual(user.weekStart);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await app.close();
    });
  });
});
