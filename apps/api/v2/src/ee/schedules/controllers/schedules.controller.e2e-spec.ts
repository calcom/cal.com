import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateScheduleInput } from "@/ee/schedules/inputs/create-schedule.input";
import { CreateScheduleOutput } from "@/ee/schedules/outputs/create-schedule.output";
import { GetSchedulesOutput } from "@/ee/schedules/outputs/get-schedules.output";
import { UpdateScheduleOutput } from "@/ee/schedules/outputs/update-schedule.output";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { AvailabilitiesModule } from "@/modules/availabilities/availabilities.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
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
import { UpdateScheduleInput } from "@calcom/platform-types";

describe("Schedules Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let scheduleRepositoryFixture: SchedulesRepositoryFixture;

    const userEmail = "schedules-controller-e2e@api.com";
    let user: User;

    let createdSchedule: CreateScheduleOutput["data"];
    const responseDefaultAvailabilityDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const responseDefaultAvailabilityStartTime = "09:00";
    const responseDefaultAvailabilityEndTime = "17:00";

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
      scheduleRepositoryFixture = new SchedulesRepositoryFixture(moduleRef);
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

    it("should create a default schedule", async () => {
      const scheduleName = "schedule-name";
      const scheduleTimeZone = "Europe/Rome";
      const isDefault = true;

      const body: CreateScheduleInput = {
        name: scheduleName,
        timeZone: scheduleTimeZone,
        isDefault,
      };

      return request(app.getHttpServer())
        .post("/api/v2/schedules")
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseData: CreateScheduleOutput = response.body;
          const schedule = responseData.data;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(schedule).toBeDefined();
          expect(schedule.isDefault).toEqual(isDefault);
          expect(schedule.timeZone).toEqual(scheduleTimeZone);
          expect(schedule.name).toEqual(scheduleName);
          expect(schedule.availability.length).toEqual(1);

          const availability = schedule.availability[0];
          expect(availability.days).toEqual(responseDefaultAvailabilityDays);
          expect(availability.startTime).toEqual(responseDefaultAvailabilityStartTime);
          expect(availability.endTime).toEqual(responseDefaultAvailabilityEndTime);

          const scheduleUser = schedule.ownerId ? await userRepositoryFixture.get(schedule.ownerId) : null;
          expect(scheduleUser?.defaultScheduleId).toEqual(responseData.data.id);
          createdSchedule = responseData.data;
        });
    });

    it("should get default schedule", async () => {
      return request(app.getHttpServer())
        .get("/api/v2/schedules/default")
        .expect(200)
        .then(async (response) => {
          const responseData: CreateScheduleOutput = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data.id).toEqual(createdSchedule.id);
          expect(responseData.data.schedule?.[0].userId).toEqual(createdSchedule.schedule[0].userId);

          const schedule = responseData.data.schedule;
          expect(schedule).toBeDefined();
          expect(schedule.length).toEqual(1);
          expect(schedule?.[0]?.days).toEqual(responseDefaultAvailabilityDays);
          expect(schedule?.[0]?.startTime).toEqual(responseDefaultAvailabilityStartTime);
          expect(schedule?.[0]?.endTime).toEqual(responseDefaultAvailabilityEndTime);
        });
    });

    it("should get schedules", async () => {
      return request(app.getHttpServer())
        .get(`/api/v2/schedules`)
        .expect(200)
        .then((response) => {
          const responseData: GetSchedulesOutput = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data?.[0].id).toEqual(createdSchedule.id);
          expect(responseData.data?.[0].schedule?.[0].userId).toEqual(createdSchedule.schedule[0].userId);

          const schedule = responseData.data?.[0].schedule;
          expect(schedule).toBeDefined();
          expect(schedule.length).toEqual(1);
          expect(schedule?.[0]?.days).toEqual(responseDefaultAvailabilityDays);
          expect(schedule?.[0]?.startTime).toEqual(responseDefaultAvailabilityStartTime);
          expect(schedule?.[0]?.endTime).toEqual(responseDefaultAvailabilityEndTime);
        });
    });

    it("should update schedule name", async () => {
      const newScheduleName = "new-schedule-name";

      const body: UpdateScheduleInput = {
        name: newScheduleName,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/schedules/${createdSchedule.id}`)
        .send(body)
        .expect(200)
        .then((response: any) => {
          const responseData: UpdateScheduleOutput = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data.schedule.name).toEqual(newScheduleName);
          expect(responseData.data.schedule.id).toEqual(createdSchedule.id);
          expect(responseData.data.schedule.userId).toEqual(createdSchedule.schedule[0].userId);

          const availability = responseData.data.schedule.availability;
          expect(availability).toBeDefined();
          expect(availability?.length).toEqual(1);
          expect(availability?.[0]?.days).toEqual(responseDefaultAvailabilityDays);
          expect(availability?.[0]?.startTime).toEqual(responseDefaultAvailabilityStartTime);
          expect(availability?.[0]?.endTime).toEqual(responseDefaultAvailabilityEndTime);

          createdSchedule.name = newScheduleName;
        });
    });

    it("should delete schedule", async () => {
      return request(app.getHttpServer()).delete(`/api/v2/schedules/${createdSchedule.id}`).expect(200);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      try {
        await scheduleRepositoryFixture.deleteById(createdSchedule.id);
      } catch (e) {}

      await app.close();
    });
  });
});
