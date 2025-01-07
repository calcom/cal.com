import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { SlotsModule } from "@/modules/slots/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { SelectedSlotsRepositoryFixture } from "test/fixtures/repository/selected-slots.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomNumber } from "test/utils/randomNumber";
import { withApiAuth } from "test/utils/withApiAuth";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

const expectedSlotsUTC = {
  slots: {
    "2050-09-05": [
      { time: "2050-09-05T07:00:00.000Z" },
      { time: "2050-09-05T08:00:00.000Z" },
      { time: "2050-09-05T09:00:00.000Z" },
      { time: "2050-09-05T10:00:00.000Z" },
      { time: "2050-09-05T11:00:00.000Z" },
      { time: "2050-09-05T12:00:00.000Z" },
      { time: "2050-09-05T13:00:00.000Z" },
      { time: "2050-09-05T14:00:00.000Z" },
    ],
    "2050-09-06": [
      { time: "2050-09-06T07:00:00.000Z" },
      { time: "2050-09-06T08:00:00.000Z" },
      { time: "2050-09-06T09:00:00.000Z" },
      { time: "2050-09-06T10:00:00.000Z" },
      { time: "2050-09-06T11:00:00.000Z" },
      { time: "2050-09-06T12:00:00.000Z" },
      { time: "2050-09-06T13:00:00.000Z" },
      { time: "2050-09-06T14:00:00.000Z" },
    ],
    "2050-09-07": [
      { time: "2050-09-07T07:00:00.000Z" },
      { time: "2050-09-07T08:00:00.000Z" },
      { time: "2050-09-07T09:00:00.000Z" },
      { time: "2050-09-07T10:00:00.000Z" },
      { time: "2050-09-07T11:00:00.000Z" },
      { time: "2050-09-07T12:00:00.000Z" },
      { time: "2050-09-07T13:00:00.000Z" },
      { time: "2050-09-07T14:00:00.000Z" },
    ],
    "2050-09-08": [
      { time: "2050-09-08T07:00:00.000Z" },
      { time: "2050-09-08T08:00:00.000Z" },
      { time: "2050-09-08T09:00:00.000Z" },
      { time: "2050-09-08T10:00:00.000Z" },
      { time: "2050-09-08T11:00:00.000Z" },
      { time: "2050-09-08T12:00:00.000Z" },
      { time: "2050-09-08T13:00:00.000Z" },
      { time: "2050-09-08T14:00:00.000Z" },
    ],
    "2050-09-09": [
      { time: "2050-09-09T07:00:00.000Z" },
      { time: "2050-09-09T08:00:00.000Z" },
      { time: "2050-09-09T09:00:00.000Z" },
      { time: "2050-09-09T10:00:00.000Z" },
      { time: "2050-09-09T11:00:00.000Z" },
      { time: "2050-09-09T12:00:00.000Z" },
      { time: "2050-09-09T13:00:00.000Z" },
      { time: "2050-09-09T14:00:00.000Z" },
    ],
  },
};

const expectedSlotsRome = {
  slots: {
    "2050-09-05": [
      { time: "2050-09-05T09:00:00.000+02:00" },
      { time: "2050-09-05T10:00:00.000+02:00" },
      { time: "2050-09-05T11:00:00.000+02:00" },
      { time: "2050-09-05T12:00:00.000+02:00" },
      { time: "2050-09-05T13:00:00.000+02:00" },
      { time: "2050-09-05T14:00:00.000+02:00" },
      { time: "2050-09-05T15:00:00.000+02:00" },
      { time: "2050-09-05T16:00:00.000+02:00" },
    ],
    "2050-09-06": [
      { time: "2050-09-06T09:00:00.000+02:00" },
      { time: "2050-09-06T10:00:00.000+02:00" },
      { time: "2050-09-06T11:00:00.000+02:00" },
      { time: "2050-09-06T12:00:00.000+02:00" },
      { time: "2050-09-06T13:00:00.000+02:00" },
      { time: "2050-09-06T14:00:00.000+02:00" },
      { time: "2050-09-06T15:00:00.000+02:00" },
      { time: "2050-09-06T16:00:00.000+02:00" },
    ],
    "2050-09-07": [
      { time: "2050-09-07T09:00:00.000+02:00" },
      { time: "2050-09-07T10:00:00.000+02:00" },
      { time: "2050-09-07T11:00:00.000+02:00" },
      { time: "2050-09-07T12:00:00.000+02:00" },
      { time: "2050-09-07T13:00:00.000+02:00" },
      { time: "2050-09-07T14:00:00.000+02:00" },
      { time: "2050-09-07T15:00:00.000+02:00" },
      { time: "2050-09-07T16:00:00.000+02:00" },
    ],
    "2050-09-08": [
      { time: "2050-09-08T09:00:00.000+02:00" },
      { time: "2050-09-08T10:00:00.000+02:00" },
      { time: "2050-09-08T11:00:00.000+02:00" },
      { time: "2050-09-08T12:00:00.000+02:00" },
      { time: "2050-09-08T13:00:00.000+02:00" },
      { time: "2050-09-08T14:00:00.000+02:00" },
      { time: "2050-09-08T15:00:00.000+02:00" },
      { time: "2050-09-08T16:00:00.000+02:00" },
    ],
    "2050-09-09": [
      { time: "2050-09-09T09:00:00.000+02:00" },
      { time: "2050-09-09T10:00:00.000+02:00" },
      { time: "2050-09-09T11:00:00.000+02:00" },
      { time: "2050-09-09T12:00:00.000+02:00" },
      { time: "2050-09-09T13:00:00.000+02:00" },
      { time: "2050-09-09T14:00:00.000+02:00" },
      { time: "2050-09-09T15:00:00.000+02:00" },
      { time: "2050-09-09T16:00:00.000+02:00" },
    ],
  },
};

const expectedSlotsUTCRange = {
  slots: {
    "2050-09-05": [
      { startTime: "2050-09-05T07:00:00.000Z", endTime: "2050-09-05T08:00:00.000Z" },
      { startTime: "2050-09-05T08:00:00.000Z", endTime: "2050-09-05T09:00:00.000Z" },
      { startTime: "2050-09-05T09:00:00.000Z", endTime: "2050-09-05T10:00:00.000Z" },
      { startTime: "2050-09-05T10:00:00.000Z", endTime: "2050-09-05T11:00:00.000Z" },
      { startTime: "2050-09-05T11:00:00.000Z", endTime: "2050-09-05T12:00:00.000Z" },
      { startTime: "2050-09-05T12:00:00.000Z", endTime: "2050-09-05T13:00:00.000Z" },
      { startTime: "2050-09-05T13:00:00.000Z", endTime: "2050-09-05T14:00:00.000Z" },
      { startTime: "2050-09-05T14:00:00.000Z", endTime: "2050-09-05T15:00:00.000Z" },
    ],
    "2050-09-06": [
      { startTime: "2050-09-06T07:00:00.000Z", endTime: "2050-09-06T08:00:00.000Z" },
      { startTime: "2050-09-06T08:00:00.000Z", endTime: "2050-09-06T09:00:00.000Z" },
      { startTime: "2050-09-06T09:00:00.000Z", endTime: "2050-09-06T10:00:00.000Z" },
      { startTime: "2050-09-06T10:00:00.000Z", endTime: "2050-09-06T11:00:00.000Z" },
      { startTime: "2050-09-06T11:00:00.000Z", endTime: "2050-09-06T12:00:00.000Z" },
      { startTime: "2050-09-06T12:00:00.000Z", endTime: "2050-09-06T13:00:00.000Z" },
      { startTime: "2050-09-06T13:00:00.000Z", endTime: "2050-09-06T14:00:00.000Z" },
      { startTime: "2050-09-06T14:00:00.000Z", endTime: "2050-09-06T15:00:00.000Z" },
    ],
    "2050-09-07": [
      { startTime: "2050-09-07T07:00:00.000Z", endTime: "2050-09-07T08:00:00.000Z" },
      { startTime: "2050-09-07T08:00:00.000Z", endTime: "2050-09-07T09:00:00.000Z" },
      { startTime: "2050-09-07T09:00:00.000Z", endTime: "2050-09-07T10:00:00.000Z" },
      { startTime: "2050-09-07T10:00:00.000Z", endTime: "2050-09-07T11:00:00.000Z" },
      { startTime: "2050-09-07T11:00:00.000Z", endTime: "2050-09-07T12:00:00.000Z" },
      { startTime: "2050-09-07T12:00:00.000Z", endTime: "2050-09-07T13:00:00.000Z" },
      { startTime: "2050-09-07T13:00:00.000Z", endTime: "2050-09-07T14:00:00.000Z" },
      { startTime: "2050-09-07T14:00:00.000Z", endTime: "2050-09-07T15:00:00.000Z" },
    ],
    "2050-09-08": [
      { startTime: "2050-09-08T07:00:00.000Z", endTime: "2050-09-08T08:00:00.000Z" },
      { startTime: "2050-09-08T08:00:00.000Z", endTime: "2050-09-08T09:00:00.000Z" },
      { startTime: "2050-09-08T09:00:00.000Z", endTime: "2050-09-08T10:00:00.000Z" },
      { startTime: "2050-09-08T10:00:00.000Z", endTime: "2050-09-08T11:00:00.000Z" },
      { startTime: "2050-09-08T11:00:00.000Z", endTime: "2050-09-08T12:00:00.000Z" },
      { startTime: "2050-09-08T12:00:00.000Z", endTime: "2050-09-08T13:00:00.000Z" },
      { startTime: "2050-09-08T13:00:00.000Z", endTime: "2050-09-08T14:00:00.000Z" },
      { startTime: "2050-09-08T14:00:00.000Z", endTime: "2050-09-08T15:00:00.000Z" },
    ],
    "2050-09-09": [
      { startTime: "2050-09-09T07:00:00.000Z", endTime: "2050-09-09T08:00:00.000Z" },
      { startTime: "2050-09-09T08:00:00.000Z", endTime: "2050-09-09T09:00:00.000Z" },
      { startTime: "2050-09-09T09:00:00.000Z", endTime: "2050-09-09T10:00:00.000Z" },
      { startTime: "2050-09-09T10:00:00.000Z", endTime: "2050-09-09T11:00:00.000Z" },
      { startTime: "2050-09-09T11:00:00.000Z", endTime: "2050-09-09T12:00:00.000Z" },
      { startTime: "2050-09-09T12:00:00.000Z", endTime: "2050-09-09T13:00:00.000Z" },
      { startTime: "2050-09-09T13:00:00.000Z", endTime: "2050-09-09T14:00:00.000Z" },
      { startTime: "2050-09-09T14:00:00.000Z", endTime: "2050-09-09T15:00:00.000Z" },
    ],
  },
};

const expectedSlotsRomeRange = {
  slots: {
    "2050-09-05": [
      { startTime: "2050-09-05T09:00:00.000+02:00", endTime: "2050-09-05T10:00:00.000+02:00" },
      { startTime: "2050-09-05T10:00:00.000+02:00", endTime: "2050-09-05T11:00:00.000+02:00" },
      { startTime: "2050-09-05T11:00:00.000+02:00", endTime: "2050-09-05T12:00:00.000+02:00" },
      { startTime: "2050-09-05T12:00:00.000+02:00", endTime: "2050-09-05T13:00:00.000+02:00" },
      { startTime: "2050-09-05T13:00:00.000+02:00", endTime: "2050-09-05T14:00:00.000+02:00" },
      { startTime: "2050-09-05T14:00:00.000+02:00", endTime: "2050-09-05T15:00:00.000+02:00" },
      { startTime: "2050-09-05T15:00:00.000+02:00", endTime: "2050-09-05T16:00:00.000+02:00" },
      { startTime: "2050-09-05T16:00:00.000+02:00", endTime: "2050-09-05T17:00:00.000+02:00" },
    ],
    "2050-09-06": [
      { startTime: "2050-09-06T09:00:00.000+02:00", endTime: "2050-09-06T10:00:00.000+02:00" },
      { startTime: "2050-09-06T10:00:00.000+02:00", endTime: "2050-09-06T11:00:00.000+02:00" },
      { startTime: "2050-09-06T11:00:00.000+02:00", endTime: "2050-09-06T12:00:00.000+02:00" },
      { startTime: "2050-09-06T12:00:00.000+02:00", endTime: "2050-09-06T13:00:00.000+02:00" },
      { startTime: "2050-09-06T13:00:00.000+02:00", endTime: "2050-09-06T14:00:00.000+02:00" },
      { startTime: "2050-09-06T14:00:00.000+02:00", endTime: "2050-09-06T15:00:00.000+02:00" },
      { startTime: "2050-09-06T15:00:00.000+02:00", endTime: "2050-09-06T16:00:00.000+02:00" },
      { startTime: "2050-09-06T16:00:00.000+02:00", endTime: "2050-09-06T17:00:00.000+02:00" },
    ],
    "2050-09-07": [
      { startTime: "2050-09-07T09:00:00.000+02:00", endTime: "2050-09-07T10:00:00.000+02:00" },
      { startTime: "2050-09-07T10:00:00.000+02:00", endTime: "2050-09-07T11:00:00.000+02:00" },
      { startTime: "2050-09-07T11:00:00.000+02:00", endTime: "2050-09-07T12:00:00.000+02:00" },
      { startTime: "2050-09-07T12:00:00.000+02:00", endTime: "2050-09-07T13:00:00.000+02:00" },
      { startTime: "2050-09-07T13:00:00.000+02:00", endTime: "2050-09-07T14:00:00.000+02:00" },
      { startTime: "2050-09-07T14:00:00.000+02:00", endTime: "2050-09-07T15:00:00.000+02:00" },
      { startTime: "2050-09-07T15:00:00.000+02:00", endTime: "2050-09-07T16:00:00.000+02:00" },
      { startTime: "2050-09-07T16:00:00.000+02:00", endTime: "2050-09-07T17:00:00.000+02:00" },
    ],
    "2050-09-08": [
      { startTime: "2050-09-08T09:00:00.000+02:00", endTime: "2050-09-08T10:00:00.000+02:00" },
      { startTime: "2050-09-08T10:00:00.000+02:00", endTime: "2050-09-08T11:00:00.000+02:00" },
      { startTime: "2050-09-08T11:00:00.000+02:00", endTime: "2050-09-08T12:00:00.000+02:00" },
      { startTime: "2050-09-08T12:00:00.000+02:00", endTime: "2050-09-08T13:00:00.000+02:00" },
      { startTime: "2050-09-08T13:00:00.000+02:00", endTime: "2050-09-08T14:00:00.000+02:00" },
      { startTime: "2050-09-08T14:00:00.000+02:00", endTime: "2050-09-08T15:00:00.000+02:00" },
      { startTime: "2050-09-08T15:00:00.000+02:00", endTime: "2050-09-08T16:00:00.000+02:00" },
      { startTime: "2050-09-08T16:00:00.000+02:00", endTime: "2050-09-08T17:00:00.000+02:00" },
    ],
    "2050-09-09": [
      { startTime: "2050-09-09T09:00:00.000+02:00", endTime: "2050-09-09T10:00:00.000+02:00" },
      { startTime: "2050-09-09T10:00:00.000+02:00", endTime: "2050-09-09T11:00:00.000+02:00" },
      { startTime: "2050-09-09T11:00:00.000+02:00", endTime: "2050-09-09T12:00:00.000+02:00" },
      { startTime: "2050-09-09T12:00:00.000+02:00", endTime: "2050-09-09T13:00:00.000+02:00" },
      { startTime: "2050-09-09T13:00:00.000+02:00", endTime: "2050-09-09T14:00:00.000+02:00" },
      { startTime: "2050-09-09T14:00:00.000+02:00", endTime: "2050-09-09T15:00:00.000+02:00" },
      { startTime: "2050-09-09T15:00:00.000+02:00", endTime: "2050-09-09T16:00:00.000+02:00" },
      { startTime: "2050-09-09T16:00:00.000+02:00", endTime: "2050-09-09T17:00:00.000+02:00" },
    ],
  },
};

describe("Slots Endpoints", () => {
  describe("Individual user slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let selectedSlotsRepositoryFixture: SelectedSlotsRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    const userEmail = `slots-${randomNumber()}-controller-e2e@api.com`;
    const userName = "bob";
    let user: User;
    let eventTypeId: number;
    let eventTypeSlug: string;
    let reservedSlotUid: string;

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
            SlotsModule,
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
      selectedSlotsRepositoryFixture = new SelectedSlotsRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        name: "bob slot",
        username: userName,
      });

      // nxte(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
      await schedulesService.createUserDefaultSchedule(user.id, "Europe/Rome");

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
        .get(`/api/v2/slots/available?eventTypeId=${eventTypeId}&startTime=2050-09-05&endTime=2050-09-10`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsUTC,
          });
        });
    });

    it("should get slots in specified time zone by event type id", async () => {
      return request(app.getHttpServer())
        .get(
          `/api/v2/slots/available?eventTypeId=${eventTypeId}&startTime=2050-09-05&endTime=2050-09-10&timeZone=Europe/Rome`
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsRome,
          });
        });
    });

    it("should get slots in UTC by event type id in range format", async () => {
      return request(app.getHttpServer())
        .get(
          `/api/v2/slots/available?eventTypeId=${eventTypeId}&startTime=2050-09-05&endTime=2050-09-10&slotFormat=range`
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsUTCRange,
          });
        });
    });

    it("should get slots in specified time zone by event type id in range format", async () => {
      return request(app.getHttpServer())
        .get(
          `/api/v2/slots/available?eventTypeId=${eventTypeId}&startTime=2050-09-05&endTime=2050-09-10&timeZone=Europe/Rome&slotFormat=range`
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsRomeRange,
          });
        });
    });

    it("should get slots in UTC by event type slug", async () => {
      return request(app.getHttpServer())
        .get(
          `/api/v2/slots/available?eventTypeSlug=${eventTypeSlug}&usernameList[]=${userName}&startTime=2050-09-05&endTime=2050-09-10`
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsUTC,
          });
        });
    });

    it("should get slots in specified time zone by event type slug", async () => {
      return request(app.getHttpServer())
        .get(
          `/api/v2/slots/available?eventTypeSlug=${eventTypeSlug}&usernameList[]=${userName}&startTime=2050-09-05&endTime=2050-09-10&timeZone=Europe/Rome`
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsRome,
          });
        });
    });

    it("should reserve a slot and it should not appear in available slots", async () => {
      const slotStartTime = "2050-09-05T10:00:00.000Z";
      const reserveResponse = await request(app.getHttpServer())
        .post(`/api/v2/slots/reserve`)
        .send({
          eventTypeId,
          slotUtcStartDate: slotStartTime,
          slotUtcEndDate: "2050-09-05T11:00:00.000Z",
        })
        .expect(201);

      const reserveResponseBody = reserveResponse.body;
      expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
      const uid: string = reserveResponseBody.data;
      expect(uid).toBeDefined();
      if (!uid) {
        throw new Error("Reserved slot uid is undefined");
      }
      reservedSlotUid = uid;

      const response = await request(app.getHttpServer())
        .get(`/api/v2/slots/available?eventTypeId=${eventTypeId}&startTime=2050-09-05&endTime=2050-09-10`)
        .expect(200);

      const responseBody = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots.slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC.slots["2050-09-05"].filter(
        (slot) => slot.time !== slotStartTime
      );
      expect(slots).toEqual({
        slots: { ...expectedSlotsUTC.slots, "2050-09-05": expectedSlotsUTC2050_09_05 },
      });
    });

    it("should delete reserved slot", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v2/slots/selected-slot?uid=${reservedSlotUid}`)
        .expect(200);
    });

    it("should do a booking and slot should not be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      await bookingsRepositoryFixture.create({
        uid: `booking-uid-${eventTypeId}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        metadata: {},
        responses: {
          name: "tester",
          email: "tester@example.com",
          guests: [],
        },
        user: {
          connect: {
            id: user.id,
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v2/slots/available?eventTypeId=${eventTypeId}&startTime=2050-09-05&endTime=2050-09-10`)
        .expect(200);

      const responseBody = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots.slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC.slots["2050-09-05"].filter(
        (slot) => slot.time !== startTime
      );
      expect(slots).toEqual({
        slots: { ...expectedSlotsUTC.slots, "2050-09-05": expectedSlotsUTC2050_09_05 },
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await selectedSlotsRepositoryFixture.deleteByUId(reservedSlotUid);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);

      await app.close();
    });
  });
});
