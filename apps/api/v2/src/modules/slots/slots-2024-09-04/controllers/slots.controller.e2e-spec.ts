import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import { CreateScheduleInput_2024_06_11 } from "@calcom/platform-types";

const expectedSlotsUTC = {
  "2050-09-05": [
    "2050-09-05T07:00:00.000Z",
    "2050-09-05T08:00:00.000Z",
    "2050-09-05T09:00:00.000Z",
    "2050-09-05T10:00:00.000Z",
    "2050-09-05T11:00:00.000Z",
    "2050-09-05T12:00:00.000Z",
    "2050-09-05T13:00:00.000Z",
    "2050-09-05T14:00:00.000Z",
  ],
  "2050-09-06": [
    "2050-09-06T07:00:00.000Z",
    "2050-09-06T08:00:00.000Z",
    "2050-09-06T09:00:00.000Z",
    "2050-09-06T10:00:00.000Z",
    "2050-09-06T11:00:00.000Z",
    "2050-09-06T12:00:00.000Z",
    "2050-09-06T13:00:00.000Z",
    "2050-09-06T14:00:00.000Z",
  ],
  "2050-09-07": [
    "2050-09-07T07:00:00.000Z",
    "2050-09-07T08:00:00.000Z",
    "2050-09-07T09:00:00.000Z",
    "2050-09-07T10:00:00.000Z",
    "2050-09-07T11:00:00.000Z",
    "2050-09-07T12:00:00.000Z",
    "2050-09-07T13:00:00.000Z",
    "2050-09-07T14:00:00.000Z",
  ],
  "2050-09-08": [
    "2050-09-08T07:00:00.000Z",
    "2050-09-08T08:00:00.000Z",
    "2050-09-08T09:00:00.000Z",
    "2050-09-08T10:00:00.000Z",
    "2050-09-08T11:00:00.000Z",
    "2050-09-08T12:00:00.000Z",
    "2050-09-08T13:00:00.000Z",
    "2050-09-08T14:00:00.000Z",
  ],
  "2050-09-09": [
    "2050-09-09T07:00:00.000Z",
    "2050-09-09T08:00:00.000Z",
    "2050-09-09T09:00:00.000Z",
    "2050-09-09T10:00:00.000Z",
    "2050-09-09T11:00:00.000Z",
    "2050-09-09T12:00:00.000Z",
    "2050-09-09T13:00:00.000Z",
    "2050-09-09T14:00:00.000Z",
  ],
};

const expectedSlotsRome = {
  "2050-09-05": [
    "2050-09-05T09:00:00.000+02:00",
    "2050-09-05T10:00:00.000+02:00",
    "2050-09-05T11:00:00.000+02:00",
    "2050-09-05T12:00:00.000+02:00",
    "2050-09-05T13:00:00.000+02:00",
    "2050-09-05T14:00:00.000+02:00",
    "2050-09-05T15:00:00.000+02:00",
    "2050-09-05T16:00:00.000+02:00",
  ],
  "2050-09-06": [
    "2050-09-06T09:00:00.000+02:00",
    "2050-09-06T10:00:00.000+02:00",
    "2050-09-06T11:00:00.000+02:00",
    "2050-09-06T12:00:00.000+02:00",
    "2050-09-06T13:00:00.000+02:00",
    "2050-09-06T14:00:00.000+02:00",
    "2050-09-06T15:00:00.000+02:00",
    "2050-09-06T16:00:00.000+02:00",
  ],
  "2050-09-07": [
    "2050-09-07T09:00:00.000+02:00",
    "2050-09-07T10:00:00.000+02:00",
    "2050-09-07T11:00:00.000+02:00",
    "2050-09-07T12:00:00.000+02:00",
    "2050-09-07T13:00:00.000+02:00",
    "2050-09-07T14:00:00.000+02:00",
    "2050-09-07T15:00:00.000+02:00",
    "2050-09-07T16:00:00.000+02:00",
  ],
  "2050-09-08": [
    "2050-09-08T09:00:00.000+02:00",
    "2050-09-08T10:00:00.000+02:00",
    "2050-09-08T11:00:00.000+02:00",
    "2050-09-08T12:00:00.000+02:00",
    "2050-09-08T13:00:00.000+02:00",
    "2050-09-08T14:00:00.000+02:00",
    "2050-09-08T15:00:00.000+02:00",
    "2050-09-08T16:00:00.000+02:00",
  ],
  "2050-09-09": [
    "2050-09-09T09:00:00.000+02:00",
    "2050-09-09T10:00:00.000+02:00",
    "2050-09-09T11:00:00.000+02:00",
    "2050-09-09T12:00:00.000+02:00",
    "2050-09-09T13:00:00.000+02:00",
    "2050-09-09T14:00:00.000+02:00",
    "2050-09-09T15:00:00.000+02:00",
    "2050-09-09T16:00:00.000+02:00",
  ],
};

describe("Slots Endpoints", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let schedulesService: SchedulesService_2024_06_11;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;

  const userEmail = "slotss-controller-e2e@api.com";
  let user: User;
  let eventTypeId: number;
  let eventTypeSlug: string;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
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
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      name: "slots controller e2e",
      username: "slots-controller-e2e",
    });

    const userSchedule: CreateScheduleInput_2024_06_11 = {
      name: "working time",
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    // note(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
    await schedulesService.createUserSchedule(user.id, userSchedule);

    const event = await eventTypesRepositoryFixture.create(
      { title: "frisbee match", slug: "frisbee-match", length: 60 },
      user.id
    );
    eventTypeId = event.id;
    eventTypeSlug = event.slug;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  it("should get slots in UTC by event type id", async () => {
    return request(app.getHttpServer())
      .get(`/api/v2/slots/available?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
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

  it("should get slots in specified time zone by event type id", async () => {
    return request(app.getHttpServer())
      .get(
        `/api/v2/slots/available?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&timeZone=Europe/Rome`
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

  it("should get slots in UTC by event type slug", async () => {
    return request(app.getHttpServer())
      .get(`/api/v2/slots/available?eventTypeSlug=${eventTypeSlug}&start=2050-09-05&end=2050-09-09`)
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

  it("should get slots in specified time zone by event type slug", async () => {
    return request(app.getHttpServer())
      .get(
        `/api/v2/slots/available?eventTypeSlug=${eventTypeSlug}&start=2050-09-05&end=2050-09-09&timeZone=Europe/Rome`
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
    await userRepositoryFixture.deleteByEmail(user.email);

    await app.close();
  });
});
