import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import {
  expectedSlotsRome,
  expectedSlotsRomeRange,
  expectedSlotsUTC,
  expectedSlotsUTCRange,
} from "@/modules/slots/slots-2024-09-04/controllers/e2e/expected-slots";
import { GetReservedSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-reserved-slot.output";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutputResponse_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { EventType, User } from "@prisma/client";
import { advanceTo, clear } from "jest-date-mock";
import { DateTime } from "luxon";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { AttendeeRepositoryFixture } from "test/fixtures/repository/attendee.repository.fixture";
import { BookingSeatRepositoryFixture } from "test/fixtures/repository/booking-seat.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { SelectedSlotsRepositoryFixture } from "test/fixtures/repository/selected-slots.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import {
  CreateScheduleInput_2024_06_11,
  ReserveSlotOutput_2024_09_04 as ReserveSlotOutputData_2024_09_04,
} from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

describe("Slots 2024-09-04 Endpoints", () => {
  describe("User event type slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let selectedSlotsRepositoryFixture: SelectedSlotsRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let bookingSeatsRepositoryFixture: BookingSeatRepositoryFixture;
    let attendeesRepositoryFixture: AttendeeRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let apiKeyString: string;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `slots-2024-09-04-user-${randomString()}@example.com`;
    let user: User;
    let eventTypeId: number;
    let eventTypeSlug: string;
    let eventTypeLength: number;

    let team: Team;
    const teammateUserEmail = `slots-2024-09-04-teammate-user-${randomString()}@example.com`;
    let teammateUser: User;
    let teammateUserApiKeyString: string;

    const unrelatedUserEmail = `slots-2024-09-04-unrelated-user-${randomString()}@example.com`;
    let unrelatedUser: User;
    let unrelatedUserApiKeyString: string;

    const seatedEventTypeSlug = `slots-2024-09-04-seated-event-type-${randomString()}`;
    let seatedEventType: EventType;

    const variableLengthEventTypeSlug = `slots-2024-09-04-variable-length-event-type-${randomString()}`;
    let variableLengthEventType: EventType;

    let reservedSlot: ReserveSlotOutputData_2024_09_04;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          AppModule,
          PrismaModule,
          UsersModule,
          TokensModule,
          SchedulesModule_2024_06_11,
          SlotsModule_2024_09_04,
        ],
      })
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
      bookingSeatsRepositoryFixture = new BookingSeatRepositoryFixture(moduleRef);
      attendeesRepositoryFixture = new AttendeeRepositoryFixture(moduleRef);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        name: userEmail,
        username: userEmail,
      });

      unrelatedUser = await userRepositoryFixture.create({
        email: unrelatedUserEmail,
        name: unrelatedUserEmail,
        username: unrelatedUserEmail,
      });

      teammateUser = await userRepositoryFixture.create({
        email: teammateUserEmail,
        name: teammateUserEmail,
        username: teammateUserEmail,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
      apiKeyString = keyString;

      const { keyString: unrelatedUserKeyString } = await apiKeysRepositoryFixture.createApiKey(
        unrelatedUser.id,
        null
      );
      unrelatedUserApiKeyString = unrelatedUserKeyString;

      const { keyString: teammateUserKeyString } = await apiKeysRepositoryFixture.createApiKey(
        teammateUser.id,
        null
      );
      teammateUserApiKeyString = teammateUserKeyString;

      const userSchedule: CreateScheduleInput_2024_06_11 = {
        name: `slots-2024-09-04-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      // note(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        { title: "frisbee match", slug: `slots-2024-09-04-event-type-${randomString()}`, length: 60 },
        user.id
      );
      eventTypeId = event.id;
      eventTypeSlug = event.slug;
      eventTypeLength = event.length;

      const seatedEvent = await eventTypesRepositoryFixture.create(
        {
          title: "peer coding",
          slug: seatedEventTypeSlug,
          length: 60,
          seatsPerTimeSlot: 5,
          seatsShowAttendees: true,
          seatsShowAvailabilityCount: true,
          locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
        },
        user.id
      );
      seatedEventType = seatedEvent;

      const variableLengthEvent = await eventTypesRepositoryFixture.create(
        {
          title: "frisbee match",
          slug: `slots-2024-09-04-variable-length-event-type-${randomString()}`,
          length: 15,
          metadata: { multipleDuration: [15, 30, 45, 60] },
        },
        user.id
      );
      variableLengthEventType = variableLengthEvent;

      team = await teamRepositoryFixture.create({
        name: `slots-2024-09-04-team-${randomString()}`,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammateUser.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should get slots in UTC by event type id", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
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
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09&timeZone=Europe/Rome`)
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
        .get(
          `/v2/slots?eventTypeSlug=${eventTypeSlug}&username=${user.username}&start=2050-09-05&end=2050-09-09`
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

    it("should get slots in specified time zone by event type slug", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeSlug=${eventTypeSlug}&username=${user.username}&start=2050-09-05&end=2050-09-09&timeZone=Europe/Rome`
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

    it("should get slots by event type id and with start hours specified", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05T09:00:00.000Z&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);

          const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].slice(2);
          expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });
        });
    });

    it("should get slots by event type id and with end hours specified", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09T12:00:00.000Z`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(5);

          const expectedSlotsUTC2050_09_09 = expectedSlotsUTC["2050-09-09"].slice(0, 5);
          expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-09": expectedSlotsUTC2050_09_09 });
        });
    });

    it("should get slots in specified time zone by event type id and with start hours specified", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05T09:00:00.000Z&end=2050-09-09&timeZone=Europe/Rome`
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

          const expectedSlotsRome2050_09_05 = expectedSlotsRome["2050-09-05"].slice(2);
          expect(slots).toEqual({ ...expectedSlotsRome, "2050-09-05": expectedSlotsRome2050_09_05 });
        });
    });

    it("should get slots in specified time zone by event type id and with end hours specified", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09T12:00:00.000Z&timeZone=Europe/Rome`
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

          const expectedSlotsRome2050_09_09 = expectedSlotsRome["2050-09-09"].slice(0, 5);
          expect(slots).toEqual({ ...expectedSlotsRome, "2050-09-09": expectedSlotsRome2050_09_09 });
        });
    });

    it("should get slots in UTC by event type id in range format", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-10&format=range`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
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
          `/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-10&timeZone=Europe/Rome&format=range`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: SUCCESS_STATUS,
            data: expectedSlotsRomeRange,
          });
        });
    });

    it("should get slots in UTC by event type slug in range format", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeSlug=${eventTypeSlug}&username=${user.username}&start=2050-09-05&end=2050-09-09&format=range`
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
          expect(slots).toEqual(expectedSlotsUTCRange);
        });
    });

    it("should get slots in specified time zone by event type slug in range format", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeSlug=${eventTypeSlug}&username=${user.username}&start=2050-09-05&end=2050-09-09&timeZone=Europe/Rome&format=range`
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
          expect(slots).toEqual(expectedSlotsRomeRange);
        });
    });

    it("should reserve a slot and it should not appear in available slots", async () => {
      // note(Lauris): mock current date to test slots release time
      const now = "2049-09-05T12:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T10:00:00.000Z";
      const reserveResponse = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId,
          slotStart: slotStartTime,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(201);

      const reserveResponseBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponse.body;
      expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlot: ReserveSlotOutputData_2024_09_04 = reserveResponseBody.data;
      expect(responseReservedSlot.reservationUid).toBeDefined();
      expect(responseReservedSlot.eventTypeId).toEqual(eventTypeId);
      expect(responseReservedSlot.slotStart).toEqual(slotStartTime);
      expect(responseReservedSlot.slotDuration).toEqual(eventTypeLength);
      expect(responseReservedSlot.slotEnd).toEqual(
        DateTime.fromISO(slotStartTime, { zone: "UTC" }).plus({ minutes: eventTypeLength }).toISO()
      );
      expect(responseReservedSlot.reservationDuration).toEqual(5);

      if (!responseReservedSlot.reservationUid) {
        throw new Error("Reserved slot uid is undefined");
      }

      reservedSlot = responseReservedSlot;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== slotStartTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });

      const dbSlot = await selectedSlotsRepositoryFixture.getByUid(reservedSlot.reservationUid);
      expect(dbSlot).toBeDefined();
      if (dbSlot) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlot.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 5 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
        expect(responseReservedSlot.reservationUntil).toEqual(expectedReleaseAt);
      }
      clear();
    });

    it("should get reserved slot", async () => {
      const reserveResponse = await request(app.getHttpServer())
        .get(`/v2/slots/reservations/${reservedSlot.reservationUid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const reserveResponseBody: GetReservedSlotOutput_2024_09_04 = reserveResponse.body;
      expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
      const { reservationDuration, ...rest } = reservedSlot;
      expect(reserveResponseBody.data).toEqual(rest);
    });

    it("should update a reserved slot and it should not appear in available slots", async () => {
      // note(Lauris): mock current date to test slots release time
      const now = "2049-09-05T14:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T13:00:00.000Z";
      const reserveResponse = await request(app.getHttpServer())
        .patch(`/v2/slots/reservations/${reservedSlot.reservationUid}`)
        .send({
          eventTypeId,
          slotStart: slotStartTime,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const reserveResponseBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponse.body;
      expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlot: ReserveSlotOutputData_2024_09_04 = reserveResponseBody.data;
      expect(responseReservedSlot.reservationUid).toBeDefined();
      expect(responseReservedSlot.eventTypeId).toEqual(eventTypeId);
      expect(responseReservedSlot.slotStart).toEqual(slotStartTime);
      expect(responseReservedSlot.slotDuration).toEqual(eventTypeLength);
      expect(responseReservedSlot.slotEnd).toEqual(
        DateTime.fromISO(slotStartTime, { zone: "UTC" }).plus({ minutes: eventTypeLength }).toISO()
      );
      expect(responseReservedSlot.reservationDuration).toEqual(5);

      if (!responseReservedSlot.reservationUid) {
        throw new Error("Reserved slot uid is undefined");
      }

      reservedSlot = responseReservedSlot;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== slotStartTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });

      const dbSlot = await selectedSlotsRepositoryFixture.getByUid(reservedSlot.reservationUid);
      expect(dbSlot).toBeDefined();
      if (dbSlot) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlot.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 5 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
        expect(responseReservedSlot.reservationUntil).toEqual(expectedReleaseAt);
      }
      clear();
    });

    it("should delete reserved slot and it should not appear in available slots", async () => {
      await request(app.getHttpServer())
        .delete(`/v2/slots/reservations/${reservedSlot.reservationUid}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);
      expect(slots).toEqual({ ...expectedSlotsUTC });
    });

    it("should not be able reserve a slot with custom duration if no auth is provided", async () => {
      await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId,
          slotStart: "2050-09-05T10:00:00.000Z",
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(401);
    });

    it("should not be able reserve a slot with custom duration if provided auth user is not owner of event type nor shares team membership with owner", async () => {
      await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId,
          slotStart: "2050-09-05T10:00:00.000Z",
          reservationDuration: 10,
        })
        .set({ Authorization: `Bearer cal_test_${unrelatedUserApiKeyString}` })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(403);
    });

    it("should reserve a slot as event type owner with custom duration and it should not appear in available slots", async () => {
      // note(Lauris): mock current date to test slots release time
      const now = "2049-09-05T12:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T10:00:00.000Z";
      const reserveResponse = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
        .send({
          eventTypeId,
          slotStart: slotStartTime,
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(201);

      const reserveResponseBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponse.body;
      expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlot: ReserveSlotOutputData_2024_09_04 = reserveResponseBody.data;
      expect(responseReservedSlot.reservationUid).toBeDefined();
      if (!responseReservedSlot.reservationUid) {
        throw new Error("Reserved slot uid is undefined");
      }
      reservedSlot = responseReservedSlot;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== slotStartTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });

      const dbSlot = await selectedSlotsRepositoryFixture.getByUid(reservedSlot.reservationUid);
      expect(dbSlot).toBeDefined();
      if (dbSlot) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlot.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 10 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
      }
      await selectedSlotsRepositoryFixture.deleteByUId(reservedSlot.reservationUid);
      clear();
    });

    it("should reserve a slot as someone who shares team with event type owner with custom duration and it should not appear in available slots", async () => {
      // note(Lauris): mock current date to test slots release time
      const now = "2049-09-05T12:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T10:00:00.000Z";
      const reserveResponse = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${teammateUserApiKeyString}` })
        .send({
          eventTypeId,
          slotStart: slotStartTime,
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(201);

      const reserveResponseBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponse.body;
      expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlot: ReserveSlotOutputData_2024_09_04 = reserveResponseBody.data;
      expect(responseReservedSlot.reservationUid).toBeDefined();
      if (!responseReservedSlot.reservationUid) {
        throw new Error("Reserved slot uid is undefined");
      }
      reservedSlot = responseReservedSlot;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== slotStartTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });

      const dbSlot = await selectedSlotsRepositoryFixture.getByUid(reservedSlot.reservationUid);
      expect(dbSlot).toBeDefined();
      if (dbSlot) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlot.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 10 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
      }
      await selectedSlotsRepositoryFixture.deleteByUId(reservedSlot.reservationUid);
      clear();
    });

    it("should do a booking and slot should not be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
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
        .get(`/v2/slots?eventTypeId=${eventTypeId}&start=2050-09-05&end=2050-09-09`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
        (slot) => slot.start !== startTime
      );
      expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });
      await bookingsRepositoryFixture.deleteById(booking.id);
    });

    it("should do a booking for seated event and slot should show attendees count and bookingUid", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${seatedEventType.id}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: seatedEventType.id,
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

      const attendee = await attendeesRepositoryFixture.create({
        name: "tester",
        email: "tester@example.com",
        timeZone: "Europe/London",
        booking: {
          connect: {
            id: booking.id,
          },
        },
      });

      bookingSeatsRepositoryFixture.create({
        referenceUid: "100",
        data: {},
        booking: {
          connect: {
            id: booking.id,
          },
        },
        attendee: {
          connect: {
            id: attendee.id,
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v2/slots?eventTypeId=${seatedEventType.id}&start=2050-09-05&end=2050-09-10`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC = {
        "2050-09-05": [
          { start: "2050-09-05T07:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-05T08:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-05T09:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-05T10:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          // note(Lauris): this is when booking was made
          {
            start: "2050-09-05T11:00:00.000Z",
            seatsBooked: 1,
            seatsRemaining: 4,
            seatsTotal: 5,
            bookingUid: booking.uid,
          },
          { start: "2050-09-05T12:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-05T13:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-05T14:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
        ],
        "2050-09-06": [
          { start: "2050-09-06T07:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T08:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T09:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T10:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T11:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T12:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T13:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-06T14:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
        ],
        "2050-09-07": [
          { start: "2050-09-07T07:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T08:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T09:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T10:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T11:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T12:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T13:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-07T14:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
        ],
        "2050-09-08": [
          { start: "2050-09-08T07:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T08:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T09:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T10:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T11:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T12:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T13:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-08T14:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
        ],
        "2050-09-09": [
          { start: "2050-09-09T07:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T08:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T09:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T10:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T11:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T12:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T13:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
          { start: "2050-09-09T14:00:00.000Z", seatsBooked: 0, seatsRemaining: 5, seatsTotal: 5 },
        ],
      };

      expect(slots).toEqual(expectedSlotsUTC);

      await bookingsRepositoryFixture.deleteById(booking.id);
    });

    it("should do a booking for seated event and slot should show attendees count and bookingUid and return range format", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${seatedEventType.id}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: seatedEventType.id,
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

      const attendee = await attendeesRepositoryFixture.create({
        name: "tester",
        email: "tester@example.com",
        timeZone: "Europe/London",
        booking: {
          connect: {
            id: booking.id,
          },
        },
      });

      bookingSeatsRepositoryFixture.create({
        referenceUid: "100",
        data: {},
        booking: {
          connect: {
            id: booking.id,
          },
        },
        attendee: {
          connect: {
            id: attendee.id,
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v2/slots?eventTypeId=${seatedEventType.id}&start=2050-09-05&end=2050-09-10&format=range`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      const expectedSlotsUTC = {
        "2050-09-05": [
          {
            start: "2050-09-05T07:00:00.000Z",
            end: "2050-09-05T08:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-05T08:00:00.000Z",
            end: "2050-09-05T09:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-05T09:00:00.000Z",
            end: "2050-09-05T10:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-05T10:00:00.000Z",
            end: "2050-09-05T11:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          // note(Lauris): this is when booking was made
          {
            start: "2050-09-05T11:00:00.000Z",
            end: "2050-09-05T12:00:00.000Z",
            seatsBooked: 1,
            seatsRemaining: 4,
            seatsTotal: 5,
            bookingUid: booking.uid,
          },
          {
            start: "2050-09-05T12:00:00.000Z",
            end: "2050-09-05T13:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-05T13:00:00.000Z",
            end: "2050-09-05T14:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-05T14:00:00.000Z",
            end: "2050-09-05T15:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
        ],
        "2050-09-06": [
          {
            start: "2050-09-06T07:00:00.000Z",
            end: "2050-09-06T08:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T08:00:00.000Z",
            end: "2050-09-06T09:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T09:00:00.000Z",
            end: "2050-09-06T10:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T10:00:00.000Z",
            end: "2050-09-06T11:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T11:00:00.000Z",
            end: "2050-09-06T12:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T12:00:00.000Z",
            end: "2050-09-06T13:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T13:00:00.000Z",
            end: "2050-09-06T14:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-06T14:00:00.000Z",
            end: "2050-09-06T15:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
        ],
        "2050-09-07": [
          {
            start: "2050-09-07T07:00:00.000Z",
            end: "2050-09-07T08:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T08:00:00.000Z",
            end: "2050-09-07T09:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T09:00:00.000Z",
            end: "2050-09-07T10:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T10:00:00.000Z",
            end: "2050-09-07T11:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T11:00:00.000Z",
            end: "2050-09-07T12:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T12:00:00.000Z",
            end: "2050-09-07T13:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T13:00:00.000Z",
            end: "2050-09-07T14:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-07T14:00:00.000Z",
            end: "2050-09-07T15:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
        ],
        "2050-09-08": [
          {
            start: "2050-09-08T07:00:00.000Z",
            end: "2050-09-08T08:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T08:00:00.000Z",
            end: "2050-09-08T09:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T09:00:00.000Z",
            end: "2050-09-08T10:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T10:00:00.000Z",
            end: "2050-09-08T11:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T11:00:00.000Z",
            end: "2050-09-08T12:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T12:00:00.000Z",
            end: "2050-09-08T13:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T13:00:00.000Z",
            end: "2050-09-08T14:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-08T14:00:00.000Z",
            end: "2050-09-08T15:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
        ],
        "2050-09-09": [
          {
            start: "2050-09-09T07:00:00.000Z",
            end: "2050-09-09T08:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T08:00:00.000Z",
            end: "2050-09-09T09:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T09:00:00.000Z",
            end: "2050-09-09T10:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T10:00:00.000Z",
            end: "2050-09-09T11:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T11:00:00.000Z",
            end: "2050-09-09T12:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T12:00:00.000Z",
            end: "2050-09-09T13:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T13:00:00.000Z",
            end: "2050-09-09T14:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
          {
            start: "2050-09-09T14:00:00.000Z",
            end: "2050-09-09T15:00:00.000Z",
            seatsBooked: 0,
            seatsRemaining: 5,
            seatsTotal: 5,
          },
        ],
      };

      expect(slots).toEqual(expectedSlotsUTC);

      await bookingsRepositoryFixture.deleteById(booking.id);
    });

    describe("variable length", () => {
      it("should not be able to reserve a slot for variable length event type with invalid duration", async () => {
        const slotStartTime = "2050-09-05T10:00:00.000Z";
        const reserveResponse = await request(app.getHttpServer())
          .post(`/v2/slots/reservations`)
          .send({
            eventTypeId: variableLengthEventType.id,
            slotStart: slotStartTime,
            slotDuration: 1000,
          })
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);

        expect(reserveResponse.body.error.message).toEqual(
          "Provided 'slotDuration' is not one of the possible lengths for the event type. The possible lengths for this variable length event type are: 15, 30, 45, 60"
        );
      });

      it("should reserve a slot with slot duration for variable event type length", async () => {
        // note(Lauris): mock current date to test slots release time
        const now = "2049-09-05T12:00:00.000Z";
        const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
        advanceTo(newDate);

        const slotDuration = 60;
        const slotStartTime = "2050-09-05T10:00:00.000Z";
        const reserveResponse = await request(app.getHttpServer())
          .post(`/v2/slots/reservations`)
          .send({
            eventTypeId: variableLengthEventType.id,
            slotStart: slotStartTime,
            slotDuration,
          })
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(201);

        const reserveResponseBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponse.body;
        expect(reserveResponseBody.status).toEqual(SUCCESS_STATUS);
        const responseReservedSlot: ReserveSlotOutputData_2024_09_04 = reserveResponseBody.data;
        expect(responseReservedSlot.reservationUid).toBeDefined();
        expect(responseReservedSlot.eventTypeId).toEqual(variableLengthEventType.id);
        expect(responseReservedSlot.slotStart).toEqual(slotStartTime);
        expect(responseReservedSlot.slotDuration).toEqual(slotDuration);
        expect(responseReservedSlot.slotEnd).toEqual(
          DateTime.fromISO(slotStartTime, { zone: "UTC" }).plus({ minutes: slotDuration }).toISO()
        );
        expect(responseReservedSlot.reservationDuration).toEqual(5);

        if (!responseReservedSlot.reservationUid) {
          throw new Error("Reserved slot uid is undefined");
        }

        const response = await request(app.getHttpServer())
          .get(
            `/v2/slots?eventTypeId=${variableLengthEventType.id}&start=2050-09-05&end=2050-09-09&duration=60`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);

        const responseBody: GetSlotsOutput_2024_09_04 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        const slots = responseBody.data;

        expect(slots).toBeDefined();
        const days = Object.keys(slots);
        expect(days.length).toEqual(5);

        const expectedSlotsUTC2050_09_05 = expectedSlotsUTC["2050-09-05"].filter(
          (slot) => slot.start !== slotStartTime
        );
        expect(slots).toEqual({ ...expectedSlotsUTC, "2050-09-05": expectedSlotsUTC2050_09_05 });

        const dbSlot = await selectedSlotsRepositoryFixture.getByUid(reservedSlot.reservationUid);
        expect(dbSlot).toBeDefined();
        if (dbSlot) {
          const dbReleaseAt = DateTime.fromJSDate(dbSlot.releaseAt, { zone: "UTC" }).toISO();
          const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 5 }).toISO();
          expect(dbReleaseAt).toEqual(expectedReleaseAt);
          expect(responseReservedSlot.reservationUntil).toEqual(expectedReleaseAt);
        }
        clear();
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(unrelatedUser.email);
      await selectedSlotsRepositoryFixture.deleteByUId(reservedSlot.reservationUid);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await teamRepositoryFixture.delete(team.id);
      clear();

      await app.close();
    });
  });
});
