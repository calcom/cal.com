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
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withAccessTokenAuth } from "test/utils/withAccessTokenAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ScheduleWithAvailabilities, ScheduleWithAvailabilitiesForWeb } from "@calcom/platform-libraries";
import { ApiSuccessResponse } from "@calcom/platform-types";

describe("Schedules Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let scheduleRepositoryFixture: SchedulesRepositoryFixture;

    const userEmail = "schedules-controller-e2e@api.com";
    let user: User;

    let createdSchedule: ScheduleResponse;

    beforeAll(async () => {
      const moduleRef = await withAccessTokenAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, AvailabilitiesModule, UsersModule],
          providers: [SchedulesRepository, SchedulesService],
        })
      ).compile();

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

      const body = {
        name: scheduleName,
        timeZone: scheduleTimeZone,
      };

      return request(app.getHttpServer())
        .post("/api/v2/schedules")
        .send(body)
        .expect(201)
        .then(async (response) => {
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
          const defaultAvailabilityDays = [1, 2, 3, 4, 5];
          const defaultAvailabilityStartTime = "09:00:00";
          const defaultAvailabilityEndTime = "17:00:00";

          expect(responseBody.data.schedule.availability?.[0]?.days).toEqual(defaultAvailabilityDays);
          expect(responseBody.data.schedule.availability?.[0]?.startTime).toEqual(
            defaultAvailabilityStartTime
          );
          expect(responseBody.data.schedule.availability?.[0]?.endTime).toEqual(defaultAvailabilityEndTime);

          const scheduleUser = await userRepositoryFixture.get(responseBody.data.schedule.userId);
          expect(scheduleUser?.defaultScheduleId).toEqual(responseBody.data.schedule.id);
          await scheduleRepositoryFixture.deleteById(responseBody.data.schedule.id);
          await scheduleRepositoryFixture.deleteAvailabilities(responseBody.data.schedule.id);
        });
    });

    it("should create a schedule", async () => {
      const scheduleName = "schedule-name";
      const scheduleTimeZone = "Europe/Rome";
      const availabilityDays = [1, 2, 3, 4, 5, 6];
      const availabilityStartTime = "11:00:00";
      const availabilityEndTime = "14:00:00";

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
        .then(async (response) => {
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

          createdSchedule = responseBody.data.schedule;

          const scheduleUser = await userRepositoryFixture.get(responseBody.data.schedule.userId);
          expect(scheduleUser?.defaultScheduleId).toEqual(responseBody.data.schedule.id);
        });
    });

    it("should get default schedule", async () => {
      return request(app.getHttpServer())
        .get("/api/v2/schedules/default")
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedule: ScheduleResponse }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedule).toBeDefined();
          expect(responseBody.data.schedule.id).toBeDefined();
          expect(responseBody.data.schedule.userId).toEqual(createdSchedule.userId);
          expect(responseBody.data.schedule.name).toEqual(createdSchedule.name);
          expect(responseBody.data.schedule.timeZone).toEqual(createdSchedule.timeZone);

          expect(responseBody.data.schedule.availability).toBeDefined();
          expect(responseBody.data.schedule.availability?.length).toEqual(1);

          expect(responseBody.data.schedule.availability?.[0]?.days).toEqual(
            createdSchedule.availability?.[0]?.days
          );
          expect(responseBody.data.schedule.availability?.[0]?.startTime).toEqual(
            createdSchedule.availability?.[0]?.startTime
          );
          expect(responseBody.data.schedule.availability?.[0]?.endTime).toEqual(
            createdSchedule.availability?.[0]?.endTime
          );
        });
    });

    it("should get schedule", async () => {
      return request(app.getHttpServer())
        .get(`/api/v2/schedules/${createdSchedule.id}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedule: ScheduleResponse }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedule).toBeDefined();
          expect(responseBody.data.schedule.id).toBeDefined();
          expect((responseBody.data.schedule as ScheduleWithAvailabilitiesForWeb).dateOverrides).toBeFalsy();
          expect(responseBody.data.schedule.userId).toEqual(createdSchedule.userId);
          expect(responseBody.data.schedule.name).toEqual(createdSchedule.name);
          expect(responseBody.data.schedule.timeZone).toEqual(createdSchedule.timeZone);

          expect(responseBody.data.schedule.availability).toBeDefined();
          expect(responseBody.data.schedule.availability?.length).toEqual(1);

          expect(responseBody.data.schedule.availability?.[0]?.days).toEqual(
            createdSchedule.availability?.[0]?.days
          );
          expect(responseBody.data.schedule.availability?.[0]?.startTime).toEqual(
            createdSchedule.availability?.[0]?.startTime
          );
          expect(responseBody.data.schedule.availability?.[0]?.endTime).toEqual(
            createdSchedule.availability?.[0]?.endTime
          );
        });
    });

    it("should get schedule for atom", async () => {
      const forAtomQueryParam = "?for=atom";
      return request(app.getHttpServer())
        .get(`/api/v2/schedules/${createdSchedule.id}${forAtomQueryParam}`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedule: ScheduleWithAvailabilitiesForWeb }> =
            response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedule).toBeDefined();
          expect(responseBody.data.schedule.id).toBeDefined();
          expect(responseBody.data.schedule.dateOverrides).toBeDefined();
          expect((responseBody.data.schedule as ScheduleWithAvailabilities).userId).toBeFalsy();
          expect(responseBody.data.schedule.name).toEqual(createdSchedule.name);
          expect(responseBody.data.schedule.timeZone).toEqual(createdSchedule.timeZone);

          expect(responseBody.data.schedule.availability).toBeDefined();
          expect(responseBody.data.schedule.availability?.length).toEqual(7);

          const dateStart = new Date(responseBody.data.schedule.availability?.[1]?.[0]?.start);
          const dateEnd = new Date(responseBody.data.schedule.availability?.[1]?.[0]?.end);

          const dateStartHours = dateStart.getUTCHours().toString().padStart(2, "0");
          const dateStartMinutes = dateStart.getUTCMinutes().toString().padStart(2, "0");
          const dateStartSeconds = dateStart.getUTCSeconds().toString().padStart(2, "0");
          const dateEndHours = dateEnd.getUTCHours().toString().padStart(2, "0");
          const dateEndMinutes = dateEnd.getUTCMinutes().toString().padStart(2, "0");
          const dateEndSeconds = dateEnd.getUTCSeconds().toString().padStart(2, "0");

          const expectedStart = `${dateStartHours}:${dateStartMinutes}:${dateStartSeconds}`;
          const expectedEnd = `${dateEndHours}:${dateEndMinutes}:${dateEndSeconds}`;

          expect(expectedStart).toEqual(createdSchedule.availability?.[0]?.startTime);
          expect(expectedEnd).toEqual(createdSchedule.availability?.[0]?.endTime);
        });
    });

    it("should get schedules", async () => {
      return request(app.getHttpServer())
        .get(`/api/v2/schedules`)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedules: ScheduleResponse[] }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedules).toBeDefined();
          expect(responseBody.data.schedules.length).toEqual(1);

          const fetchedSchedule = responseBody.data.schedules[0];
          expect(fetchedSchedule).toBeDefined();
          expect(fetchedSchedule.userId).toEqual(createdSchedule.userId);
          expect(fetchedSchedule.name).toEqual(createdSchedule.name);
          expect(fetchedSchedule.timeZone).toEqual(createdSchedule.timeZone);

          expect(fetchedSchedule.availability).toBeDefined();
          expect(fetchedSchedule.availability?.length).toEqual(1);

          expect(fetchedSchedule.availability?.[0]?.days).toEqual(createdSchedule.availability?.[0]?.days);
          expect(fetchedSchedule.availability?.[0]?.startTime).toEqual(
            createdSchedule.availability?.[0]?.startTime
          );
          expect(fetchedSchedule.availability?.[0]?.endTime).toEqual(
            createdSchedule.availability?.[0]?.endTime
          );
        });
    });

    it("should update schedule name", async () => {
      const newScheduleName = "new-schedule-name";

      const body = {
        name: newScheduleName,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/schedules/${createdSchedule.id}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedule: ScheduleResponse }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedule).toBeDefined();
          expect(responseBody.data.schedule.id).toBeDefined();
          expect(responseBody.data.schedule.userId).toEqual(createdSchedule.userId);
          expect(responseBody.data.schedule.name).toEqual(newScheduleName);
          expect(responseBody.data.schedule.timeZone).toEqual(createdSchedule.timeZone);

          expect(responseBody.data.schedule.availability).toBeDefined();
          expect(responseBody.data.schedule.availability?.length).toEqual(1);

          expect(responseBody.data.schedule.availability?.[0]?.days).toEqual(
            createdSchedule.availability?.[0]?.days
          );
          expect(responseBody.data.schedule.availability?.[0]?.startTime).toEqual(
            createdSchedule.availability?.[0]?.startTime
          );
          expect(responseBody.data.schedule.availability?.[0]?.endTime).toEqual(
            createdSchedule.availability?.[0]?.endTime
          );

          createdSchedule = responseBody.data.schedule;
        });
    });

    it("should update schedule availabilities", async () => {
      const newAvailabilityDays = [2, 4];
      const newAvailabilityStartTime = "19:00:00";
      const newAvailabilityEndTime = "20:00:00";

      const body = {
        availabilities: [
          {
            days: newAvailabilityDays,
            startTime: newAvailabilityStartTime,
            endTime: newAvailabilityEndTime,
          },
        ],
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/schedules/${createdSchedule.id}`)
        .send(body)
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<{ schedule: ScheduleResponse }> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          expect(responseBody.data.schedule).toBeDefined();
          expect(responseBody.data.schedule.id).toBeDefined();
          expect(responseBody.data.schedule.userId).toEqual(createdSchedule.userId);
          expect(responseBody.data.schedule.name).toEqual(createdSchedule.name);
          expect(responseBody.data.schedule.timeZone).toEqual(createdSchedule.timeZone);

          expect(responseBody.data.schedule.availability).toBeDefined();
          expect(responseBody.data.schedule.availability?.length).toEqual(1);

          expect(responseBody.data.schedule.availability?.[0]?.days).toEqual(newAvailabilityDays);
          expect(responseBody.data.schedule.availability?.[0]?.startTime).toEqual(newAvailabilityStartTime);
          expect(responseBody.data.schedule.availability?.[0]?.endTime).toEqual(newAvailabilityEndTime);

          createdSchedule = responseBody.data.schedule;
        });
    });

    it("should delete schedule", async () => {
      return request(app.getHttpServer()).delete(`/api/v2/schedules/${createdSchedule.id}`).expect(200);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await app.close();
    });
  });
});
