import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { AvailabilitiesModule } from "@/modules/availabilities/availabilities.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withAccessTokenAuth } from "test/utils/withAccessTokenAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { UserResponse } from "@calcom/platform-types";
import { ApiSuccessResponse } from "@calcom/platform-types";

describe("Me Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesRepositoryFixture: SchedulesRepositoryFixture;

    const userEmail = "me-controller-e2e@api.com";
    let user: User;

    beforeAll(async () => {
      const moduleRef = await withAccessTokenAuth(
        userEmail,
        Test.createTestingModule({
          imports: [
            AppModule,
            PrismaModule,
            AvailabilitiesModule,
            UsersModule,
            TokensModule,
            SchedulesModule,
          ],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      schedulesRepositoryFixture = new SchedulesRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
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
        .get("/v2/me")
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.id).toEqual(user.id);
          expect(responseBody.data.email).toEqual(user.email);
          expect(responseBody.data.timeFormat).toEqual(user.timeFormat);
          expect(responseBody.data.defaultScheduleId).toEqual(user.defaultScheduleId);
          expect(responseBody.data.weekStart).toEqual(user.weekStart);
          expect(responseBody.data.timeZone).toEqual(user.timeZone);
        });
    });

    it("should update user associated with access token", async () => {
      const body: UpdateManagedUserInput = { timeZone: "Europe/Rome" };

      return request(app.getHttpServer())
        .patch("/v2/me")
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.id).toEqual(user.id);
          expect(responseBody.data.email).toEqual(user.email);
          expect(responseBody.data.timeFormat).toEqual(user.timeFormat);
          expect(responseBody.data.defaultScheduleId).toEqual(user.defaultScheduleId);
          expect(responseBody.data.weekStart).toEqual(user.weekStart);
          expect(responseBody.data.timeZone).toEqual(body.timeZone);

          if (user.defaultScheduleId) {
            const defaultSchedule = await schedulesRepositoryFixture.getById(user.defaultScheduleId);
            expect(defaultSchedule?.timeZone).toEqual(body.timeZone);
          }
        });
    });

    it("should not update user associated with access token given invalid timezone", async () => {
      const bodyWithIncorrectTimeZone: UpdateManagedUserInput = { timeZone: "Narnia/Woods" };

      return request(app.getHttpServer()).patch("/v2/me").send(bodyWithIncorrectTimeZone).expect(400);
    });

    it("should not update user associated with access token given invalid time format", async () => {
      const bodyWithIncorrectTimeFormat: UpdateManagedUserInput = { timeFormat: 100 };

      return request(app.getHttpServer()).patch("/v2/me").send(bodyWithIncorrectTimeFormat).expect(400);
    });

    it("should not update user associated with access token given invalid week start", async () => {
      const bodyWithIncorrectWeekStart: UpdateManagedUserInput = { weekStart: "waba luba dub dub" };

      return request(app.getHttpServer()).patch("/v2/me").send(bodyWithIncorrectWeekStart).expect(400);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await app.close();
    });
  });
});
