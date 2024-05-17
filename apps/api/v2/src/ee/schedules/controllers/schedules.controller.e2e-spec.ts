import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule } from "@/ee/schedules/schedules.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
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
import {
  CreateScheduleInput,
  CreateScheduleOutput,
  GetScheduleOutput,
  GetSchedulesOutput,
  ScheduleOutput,
  UpdateScheduleOutput,
} from "@calcom/platform-types";
import { UpdateScheduleInput } from "@calcom/platform-types";

describe("Schedules Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let scheduleRepositoryFixture: SchedulesRepositoryFixture;

    const userEmail = "schedules-controller-e2e@api.com";
    let user: User;

    const createScheduleInput: CreateScheduleInput = {
      name: "work",
      timeZone: "Europe/Rome",
      isDefault: true,
    };

    const defaultAvailability: CreateScheduleInput["availability"] = [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "09:00",
        endTime: "17:00",
      },
    ];

    let createdSchedule: CreateScheduleOutput["data"];

    beforeAll(async () => {
      const moduleRef = await withAccessTokenAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule, SchedulesModule],
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
      return request(app.getHttpServer())
        .post("/api/v2/schedules")
        .send(createScheduleInput)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateScheduleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          createdSchedule = response.body.data;

          const expectedSchedule = {
            ...createScheduleInput,
            availability: defaultAvailability,
            overrides: [],
          };
          outputScheduleMatchesExpected(createdSchedule, expectedSchedule, 1);

          const scheduleOwner = createdSchedule.ownerId
            ? await userRepositoryFixture.get(createdSchedule.ownerId)
            : null;
          expect(scheduleOwner?.defaultScheduleId).toEqual(createdSchedule.id);
        });
    });

    function outputScheduleMatchesExpected(
      outputSchedule: ScheduleOutput | null,
      expected: CreateScheduleInput & { availability: CreateScheduleInput["availability"] } & {
        overrides: CreateScheduleInput["overrides"];
      },
      expectedAvailabilityLength: number
    ) {
      expect(outputSchedule).toBeTruthy();
      expect(outputSchedule?.name).toEqual(expected.name);
      expect(outputSchedule?.timeZone).toEqual(expected.timeZone);
      expect(outputSchedule?.isDefault).toEqual(expected.isDefault);
      expect(outputSchedule?.availability.length).toEqual(expectedAvailabilityLength);

      const outputScheduleAvailability = outputSchedule?.availability[0];
      expect(outputScheduleAvailability).toBeDefined();
      expect(outputScheduleAvailability?.days).toEqual(expected.availability?.[0].days);
      expect(outputScheduleAvailability?.startTime).toEqual(expected.availability?.[0].startTime);
      expect(outputScheduleAvailability?.endTime).toEqual(expected.availability?.[0].endTime);

      expect(JSON.stringify(outputSchedule?.overrides)).toEqual(JSON.stringify(expected.overrides));
    }

    it("should get default schedule", async () => {
      return request(app.getHttpServer())
        .get("/api/v2/schedules/default")
        .expect(200)
        .then(async (response) => {
          const responseBody: GetScheduleOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const outputSchedule = responseBody.data;

          const expectedSchedule = {
            ...createScheduleInput,
            availability: defaultAvailability,
            overrides: [],
          };
          outputScheduleMatchesExpected(outputSchedule, expectedSchedule, 1);
        });
    });

    it("should get schedules", async () => {
      return request(app.getHttpServer())
        .get(`/api/v2/schedules`)
        .expect(200)
        .then((response) => {
          const responseBody: GetSchedulesOutput = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const outputSchedule = responseBody.data[0];

          const expectedSchedule = {
            ...createScheduleInput,
            availability: defaultAvailability,
            overrides: [],
          };
          outputScheduleMatchesExpected(outputSchedule, expectedSchedule, 1);
        });
    });

    it("should update schedule name", async () => {
      const newScheduleName = "updated-schedule-name";

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
          const responseSchedule = responseData.data;

          const expectedSchedule = { ...createdSchedule, name: newScheduleName };
          outputScheduleMatchesExpected(responseSchedule, expectedSchedule, 1);

          createdSchedule = responseSchedule;
        });
    });

    it("should add overrides", async () => {
      const overrides = [
        {
          date: "2026-05-05",
          startTime: "10:00",
          endTime: "12:00",
        },
      ];

      const body: UpdateScheduleInput = {
        overrides,
      };

      return request(app.getHttpServer())
        .patch(`/api/v2/schedules/${createdSchedule.id}`)
        .send(body)
        .expect(200)
        .then((response: any) => {
          const responseData: UpdateScheduleOutput = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          const responseSchedule = responseData.data;

          const expectedSchedule = { ...createdSchedule, overrides };
          outputScheduleMatchesExpected(responseSchedule, expectedSchedule, 1);

          createdSchedule = responseSchedule;
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
