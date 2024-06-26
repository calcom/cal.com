import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateScheduleInput_2024_06_11,
  CreateScheduleOutput_2024_06_11,
  GetScheduleOutput_2024_06_11,
  GetSchedulesOutput_2024_06_11,
  ScheduleAvailabilityInput_2024_06_11,
  ScheduleOutput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
  UpdateScheduleOutput_2024_06_11,
} from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

describe("Organizations Schedules Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let organizationsRepositoryFixture: TeamRepositoryFixture;

    let org: Team;

    const userEmail = "mr-robot@schedules-api.com";
    let user: User;

    let createdSchedule: ScheduleOutput_2024_06_11;

    const createScheduleInput: CreateScheduleInput_2024_06_11 = {
      name: "work",
      timeZone: "Europe/Rome",
      isDefault: true,
    };

    const defaultAvailability: ScheduleAvailabilityInput_2024_06_11[] = [
      {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        startTime: "09:00",
        endTime: "17:00",
      },
    ];

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      ).compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new TeamRepositoryFixture(moduleRef);

      org = await organizationsRepositoryFixture.create({
        name: "Ecorp",
        isOrganization: true,
      });

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        organization: { connect: { id: org.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(organizationsRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(org).toBeDefined();
    });

    it("should create schedule for org user", async () => {
      return request(app.getHttpServer())
        .post(`/v2/organizations/${org.id}/users/${user.id}/schedules`)
        .send(createScheduleInput)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateScheduleOutput_2024_06_11 = response.body;
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
      outputSchedule: ScheduleOutput_2024_06_11 | null,
      expected: CreateScheduleInput_2024_06_11 & {
        availability: CreateScheduleInput_2024_06_11["availability"];
      } & {
        overrides: CreateScheduleInput_2024_06_11["overrides"];
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

    it("should get org schedules", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/schedules`)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSchedulesOutput_2024_06_11 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const schedules = response.body.data;
          expect(schedules.length).toEqual(1);

          const expectedSchedule = {
            ...createScheduleInput,
            availability: defaultAvailability,
            overrides: [],
          };

          outputScheduleMatchesExpected(schedules[0], expectedSchedule, 1);
        });
    });

    it("should get org user schedule", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users/${user.id}/schedules/${createdSchedule.id}`)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetScheduleOutput_2024_06_11 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const schedule = response.body.data;

          const expectedSchedule = {
            ...createScheduleInput,
            availability: defaultAvailability,
            overrides: [],
          };

          outputScheduleMatchesExpected(schedule, expectedSchedule, 1);
        });
    });

    it("should get user schedules", async () => {
      return request(app.getHttpServer())
        .get(`/v2/organizations/${org.id}/users/${user.id}/schedules/`)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSchedulesOutput_2024_06_11 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const schedules = response.body.data;
          expect(schedules.length).toEqual(1);

          const expectedSchedule = {
            ...createScheduleInput,
            availability: defaultAvailability,
            overrides: [],
          };

          outputScheduleMatchesExpected(schedules[0], expectedSchedule, 1);
        });
    });

    it("should update user schedule name", async () => {
      const newScheduleName = "updated-schedule-name";

      const body: UpdateScheduleInput_2024_06_11 = {
        name: newScheduleName,
      };

      return request(app.getHttpServer())
        .patch(`/v2/organizations/${org.id}/users/${user.id}/schedules/${createdSchedule.id}`)
        .send(body)
        .expect(200)
        .then((response: any) => {
          const responseData: UpdateScheduleOutput_2024_06_11 = response.body;
          expect(responseData.status).toEqual(SUCCESS_STATUS);
          const responseSchedule = responseData.data;

          const expectedSchedule = { ...createdSchedule, name: newScheduleName };
          outputScheduleMatchesExpected(responseSchedule, expectedSchedule, 1);

          createdSchedule = responseSchedule;
        });
    });

    it("should delete user schedule", async () => {
      return request(app.getHttpServer())
        .delete(`/v2/organizations/${org.id}/users/${user.id}/schedules/${createdSchedule.id}`)
        .expect(200);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
