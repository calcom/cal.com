import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesRepository } from "@/ee/schedules/schedules.repository";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { ScheduleResponse } from "@/ee/schedules/zod/response/response";
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

describe("Schedules Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;

    const userEmail = "test-e2e@api.com";
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

    it("should create a schedule", async () => {
      const scheduleName = "schedule-name";
      const scheduleTimeZone = "Europe/Rome";
      const availabilityDays = [1, 2, 3, 4, 5];
      const availabilityStartTime = "09:00:00";
      const availabilityEndTime = "17:00:00";

      const body = {
        name: scheduleName,
        timeZone: scheduleTimeZone,
        availabilities: [
          {
            days: availabilityDays,
            startTime: availabilityStartTime,
            endTime: availabilityEndTime,
          },
        ],
      };

      return request(app.getHttpServer())
        .post("/api/v2/schedules")
        .send(body)
        .expect(201)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedule: ScheduleResponse }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedule).toBeDefined();
          expect(responseBody.data.schedule.id).toBeDefined();
          expect(responseBody.data.schedule.userId).toEqual(user.id);
          expect(responseBody.data.schedule.name).toEqual(scheduleName);
          expect(responseBody.data.schedule.timeZone).toEqual(scheduleTimeZone);

          expect(responseBody.data.schedule.availability).toBeDefined();
          expect(responseBody.data.schedule.availability?.length).toEqual(1);
          expect(responseBody.data.schedule.availability?.[0]?.days).toEqual(availabilityDays);
          expect(responseBody.data.schedule.availability?.[0]?.startTime).toEqual(availabilityStartTime);
          expect(responseBody.data.schedule.availability?.[0]?.endTime).toEqual(availabilityEndTime);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await app.close();
    });
  });
});
