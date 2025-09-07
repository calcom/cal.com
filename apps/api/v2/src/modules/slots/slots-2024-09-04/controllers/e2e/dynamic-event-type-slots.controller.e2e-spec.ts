import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import {
  expectedSlotsRome,
  expectedSlotsUTC,
} from "@/modules/slots/slots-2024-09-04/controllers/e2e/expected-slots";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import type { CreateScheduleInput_2024_06_11 } from "@calcom/platform-types";
import type { Profile, User, Team } from "@calcom/prisma/client";

describe("Slots 2024-09-04 Endpoints", () => {
  describe("Dynamic event type slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    const userEmailOne = `slots-2024-09-04-user-1-dynamic-slots-${randomString()}@api.com`;
    const userEmailTwo = `slots-2024-09-04-user-2-dynamic-slots-${randomString()}@api.com`;

    let organization: Team;
    let userOne: User;
    let userTwo: User;
    let orgProfileOne: Profile;
    let orgProfileTwo: Profile;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmailOne,
        Test.createTestingModule({
          imports: [
            AppModule,
            PrismaModule,
            UsersModule,
            TokensModule,
            SchedulesModule_2024_06_11,
            SlotsModule_2024_09_04,
          ],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_06_11>(SchedulesService_2024_06_11);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      const orgSlug = `slots-2024-09-04-org-${randomString()}`;
      organization = await organizationsRepositoryFixture.create({
        name: orgSlug,
        isOrganization: true,
        slug: orgSlug,
      });

      userOne = await userRepositoryFixture.create({
        email: userEmailOne,
        name: userEmailOne,
        username: userEmailOne,
      });

      userTwo = await userRepositoryFixture.create({
        email: userEmailTwo,
        name: userEmailTwo,
        username: userEmailTwo,
      });

      orgProfileOne = await profileRepositoryFixture.create({
        uid: `usr-${userOne.id}`,
        username: "teammate-one",
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: userOne.id,
          },
        },
      });

      orgProfileTwo = await profileRepositoryFixture.create({
        uid: `usr-${userTwo.id}`,
        username: "teammate-two",
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: userTwo.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_06_11 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      // note(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
      await schedulesService.createUserSchedule(userOne.id, userSchedule);
      await schedulesService.createUserSchedule(userTwo.id, userSchedule);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should get slots in UTC by usernames", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?usernames=${orgProfileOne.username},${orgProfileTwo.username}&organizationSlug=${organization.slug}&start=2050-09-05&end=2050-09-09&duration=60`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);
          expect(slots).toEqual(expectedSlotsUTC);
        });
    });

    it("should get slots in specified timezone and in specified duration by usernames", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?usernames=${orgProfileOne.username},${orgProfileTwo.username}&organizationSlug=${organization.slug}&start=2050-09-05&end=2050-09-09&duration=60&timeZone=Europe/Rome`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);
          expect(slots).toEqual(expectedSlotsRome);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userOne.email);
      await userRepositoryFixture.deleteByEmail(userTwo.email);
      await organizationsRepositoryFixture.delete(organization.id);
      await app.close();
    });
  });
});
