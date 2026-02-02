import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_04_15 } from "@calcom/platform-constants";
import type { UpdateScheduleInput_2024_04_15 } from "@calcom/platform-types";
import type { User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { CreateScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/create-schedule.output";
import { GetSchedulesOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/get-schedules.output";
import { UpdateScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/update-schedule.output";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Schedules Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let scheduleRepositoryFixture: SchedulesRepositoryFixture;

    const userEmail = `schedules-2024-04-15-user-${randomString()}@api.com`;
    let user: User;

    let createdSchedule: CreateScheduleOutput_2024_04_15["data"];
    const scheduleName = `schedules-2024-04-15-schedule-${randomString()}`;
    const defaultAvailabilityDays = [1, 2, 3, 4, 5];
    const defaultAvailabilityStartTime = "1970-01-01T09:00:00.000Z";
    const defaultAvailabilityEndTime = "1970-01-01T17:00:00.000Z";

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule, SchedulesModule_2024_04_15],
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

    it("should not create an invalid schedule", async () => {
      const scheduleTimeZone = "Europe/Rome";
      const isDefault = true;

      const body = {
        name: scheduleName,
        timeZone: scheduleTimeZone,
        isDefault,
        availabilities: [
          {
            days: ["Monday"],
            endTime: "11:15",
            startTime: "10:00",
          },
        ],
      };

      return request(app.getHttpServer())
        .post("/api/v2/schedules")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        .send(body)
        .expect(400)
        .then(async (response) => {
          expect(response.body.status).toEqual("error");
          expect(response.body.error.message).toEqual(
            "Invalid datestring format. Expected format(ISO8061): 2025-04-12T13:17:56.324Z. Received: 11:15"
          );
        });
    });

    it("should create a default schedule", async () => {
      const isDefault = true;

      const body: CreateScheduleInput_2024_04_15 = {
        name: scheduleName,
        timeZone: "Europe/Rome",
        isDefault,
      };

      return request(app.getHttpServer())
        .post("/api/v2/schedules")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        .send(body)
        .expect(201)
        .then(async (response) => {
          const responseData: CreateScheduleOutput_2024_04_15 = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data.isDefault).toEqual(isDefault);
          expect(responseData.data.timeZone).toEqual("Europe/Rome");
          expect(responseData.data.name).toEqual(scheduleName);

          const schedule = responseData.data.schedule;
          expect(schedule).toBeDefined();
          expect(schedule.length).toEqual(1);
          expect(schedule?.[0]?.days).toEqual(defaultAvailabilityDays);
          expect(schedule?.[0]?.startTime).toEqual(defaultAvailabilityStartTime);
          expect(schedule?.[0]?.endTime).toEqual(defaultAvailabilityEndTime);

          const scheduleUser = schedule?.[0].userId
            ? await userRepositoryFixture.get(schedule?.[0].userId)
            : null;
          expect(scheduleUser?.defaultScheduleId).toEqual(responseData.data.id);
          createdSchedule = responseData.data;
        });
    });

    it("should get default schedule", async () => {
      return request(app.getHttpServer())
        .get("/api/v2/schedules/default")
        .expect(200)
        .then(async (response) => {
          const responseData: CreateScheduleOutput_2024_04_15 = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data.id).toEqual(createdSchedule.id);
          expect(responseData.data.schedule?.[0].userId).toEqual(createdSchedule.schedule[0].userId);

          const schedule = responseData.data.schedule;
          expect(schedule).toBeDefined();
          expect(schedule.length).toEqual(1);
          expect(schedule?.[0]?.days).toEqual(defaultAvailabilityDays);
          expect(schedule?.[0]?.startTime).toEqual(defaultAvailabilityStartTime);
          expect(schedule?.[0]?.endTime).toEqual(defaultAvailabilityEndTime);
        });
    });

    it("should get schedules", async () => {
      return request(app.getHttpServer())
        .get(`/api/v2/schedules`)
        .expect(200)
        .then((response) => {
          const responseData: GetSchedulesOutput_2024_04_15 = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data?.[0].id).toEqual(createdSchedule.id);
          expect(responseData.data?.[0].schedule?.[0].userId).toEqual(createdSchedule.schedule[0].userId);

          const schedule = responseData.data?.[0].schedule;
          expect(schedule).toBeDefined();
          expect(schedule.length).toEqual(1);
          expect(schedule?.[0]?.days).toEqual(defaultAvailabilityDays);
          expect(schedule?.[0]?.startTime).toEqual(defaultAvailabilityStartTime);
          expect(schedule?.[0]?.endTime).toEqual(defaultAvailabilityEndTime);
        });
    });

    it("should update schedule name", async () => {
      const newScheduleName = `schedules-2024-04-15-schedule-${randomString()}`;

      const body: UpdateScheduleInput_2024_04_15 = {
        name: newScheduleName,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/schedules/${createdSchedule.id}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_04_15)
        .send(body)
        .expect(200)
        .then((response: any) => {
          const responseData: UpdateScheduleOutput_2024_04_15 = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          expect(responseData.data).toBeDefined();
          expect(responseData.data.schedule.name).toEqual(newScheduleName);
          expect(responseData.data.schedule.id).toEqual(createdSchedule.id);
          expect(responseData.data.schedule.userId).toEqual(createdSchedule.schedule[0].userId);

          const availability = responseData.data.schedule.availability;
          expect(availability).toBeDefined();
          expect(availability?.length).toEqual(1);
          expect(availability?.[0]?.days).toEqual(defaultAvailabilityDays);
          expect(availability?.[0]?.startTime).toEqual(defaultAvailabilityStartTime);
          expect(availability?.[0]?.endTime).toEqual(defaultAvailabilityEndTime);

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
      } catch (_e) {}

      await app.close();
    });
  });
});
