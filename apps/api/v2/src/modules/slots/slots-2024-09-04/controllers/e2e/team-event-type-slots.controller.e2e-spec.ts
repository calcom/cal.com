import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { expectedSlotsUTC } from "@/modules/slots/slots-2024-09-04/controllers/e2e/expected-slots";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutputResponse_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { advanceTo, clear } from "jest-date-mock";
import { DateTime } from "luxon";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { SelectedSlotRepositoryFixture } from "test/fixtures/repository/selected-slot.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";

import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_09_04,
  ERROR_STATUS,
} from "@calcom/platform-constants";
import type {
  CreateScheduleInput_2024_06_11,
  ReserveSlotOutput_2024_09_04 as ReserveSlotOutputData_2024_09_04,
} from "@calcom/platform-types";
import type { User, Team } from "@calcom/prisma/client";

describe("Slots 2024-09-04 Endpoints", () => {
  describe("Team event type slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let selectedSlotRepositoryFixture: SelectedSlotRepositoryFixture;

    const teammateEmailOne = `slots-2024-09-04-user-1-team-slots-${randomString()}`;
    let teammateApiKeyString: string;
    const teammateEmailTwo = `slots-2024-09-04-user-2-team-slots-${randomString()}`;
    const teammateEmailThree = `slots-2024-09-04-user-3-team-slots-${randomString()}`;
    let teammateTwoApiKeyString: string;

    const outsiderEmail = `slots-2024-09-04-unrelated-team-slots-${randomString()}`;
    let outsider: User;
    let outsiderApiKeyString: string;

    const teamSlug = `slots-2024-09-04-team-${randomString()}`;
    let team: Team;
    let teammateOne: User;
    let teammateTwo: User;
    let teammateThree: User;
    let collectiveEventTypeId: number;
    let collectiveEventTypeSlug: string;
    let collectiveEventTypeWithoutHostsId: number;
    let roundRobinEventTypeId: number;
    let roundRobinEventTypeWithoutFixedHostsId: number;
    let roundRobinEventTypeWithFixedAndNonFixedHostsId: number;
    let collectiveBookingId: number;
    let roundRobinBookingId: number;
    let fullyBookedRoundRobinBookingIdOne: number;
    let fullyBookedRoundRobinBookingIdTwo: number;

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
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      selectedSlotRepositoryFixture = new SelectedSlotRepositoryFixture(moduleRef);

      teammateOne = await userRepositoryFixture.create({
        email: teammateEmailOne,
        name: teammateEmailOne,
        username: teammateEmailOne,
      });

      teammateTwo = await userRepositoryFixture.create({
        email: teammateEmailTwo,
        name: teammateEmailTwo,
        username: teammateEmailTwo,
      });

      teammateThree = await userRepositoryFixture.create({
        email: teammateEmailThree,
        name: teammateEmailThree,
        username: teammateEmailThree,
      });

      outsider = await userRepositoryFixture.create({
        email: outsiderEmail,
        name: outsiderEmail,
        username: outsiderEmail,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(teammateOne.id, null);
      teammateApiKeyString = keyString;

      const { keyString: keyStringForTeammateTwo } = await apiKeysRepositoryFixture.createApiKey(
        teammateTwo.id,
        null
      );
      teammateTwoApiKeyString = keyStringForTeammateTwo;

      const { keyString: unrelatedUserKeyString } = await apiKeysRepositoryFixture.createApiKey(
        outsider.id,
        null
      );
      outsiderApiKeyString = unrelatedUserKeyString;

      team = await teamRepositoryFixture.create({
        name: teamSlug,
        slug: teamSlug,
        isOrganization: false,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammateOne.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammateTwo.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teammateThree.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      const collectiveEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: "Collective Event Type",
        slug: `slots-2024-09-04-collective-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: teammateOne.id }, { id: teammateTwo.id }],
        },
        hosts: {
          create: [
            {
              userId: teammateOne.id,
              isFixed: true,
            },
            {
              userId: teammateTwo.id,
              isFixed: true,
            },
          ],
        },
      });
      collectiveEventTypeId = collectiveEventType.id;
      collectiveEventTypeSlug = collectiveEventType.slug;

      const collectiveEventTypeWithoutHosts = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: "Collective Event Type Without Hosts",
        slug: `slots-2024-09-04-collective-event-type-without-hosts-${randomString()}`,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: teammateOne.id }, { id: teammateTwo.id }],
        },
      });
      collectiveEventTypeWithoutHostsId = collectiveEventTypeWithoutHosts.id;

      const roundRobinEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        title: "RR Event Type",
        slug: `slots-2024-09-04-round-robin-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: teammateOne.id }, { id: teammateTwo.id }],
        },
        hosts: {
          create: [
            {
              userId: teammateOne.id,
              isFixed: true,
            },
            {
              userId: teammateTwo.id,
              isFixed: true,
            },
          ],
        },
      });
      roundRobinEventTypeId = roundRobinEventType.id;

      const roundRobinEventTypeWithoutFixedHosts = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        title: "RR Event Type Without Fixed Hosts",
        slug: `slots-2024-09-04-round-robin-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: teammateOne.id }, { id: teammateTwo.id }, { id: teammateThree.id }],
        },
        hosts: {
          create: [
            {
              userId: teammateOne.id,
              isFixed: false,
            },
            {
              userId: teammateTwo.id,
              isFixed: false,
            },
            {
              userId: teammateThree.id,
              isFixed: false,
            },
          ],
        },
        rrHostSubsetEnabled: true,
      });

      roundRobinEventTypeWithoutFixedHostsId = roundRobinEventTypeWithoutFixedHosts.id;

      const roundRobinEventTypeWithFixedAndNonFixedHosts =
        await eventTypesRepositoryFixture.createTeamEventType({
          schedulingType: "ROUND_ROBIN",
          team: {
            connect: { id: team.id },
          },
          title: "RR Event Type With Fixed and Non-Fixed Hosts",
          slug: `slots-2024-09-04-round-robin-event-type-${randomString()}`,
          length: 60,
          assignAllTeamMembers: true,
          bookingFields: [],
          locations: [],
          users: {
            connect: [{ id: teammateOne.id }, { id: teammateTwo.id }, { id: teammateThree.id }],
          },
          hosts: {
            create: [
              {
                userId: teammateOne.id,
                isFixed: true,
              },
              {
                userId: teammateTwo.id,
                isFixed: false,
              },
              {
                userId: teammateThree.id,
                isFixed: false,
              },
            ],
          },
          rrHostSubsetEnabled: true,
        });

      roundRobinEventTypeWithFixedAndNonFixedHostsId = roundRobinEventTypeWithFixedAndNonFixedHosts.id;

      const userSchedule: CreateScheduleInput_2024_06_11 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      // note(Lauris): this creates default schedule monday to friday from 9AM to 5PM in Europe/Rome timezone
      await schedulesService.createUserSchedule(teammateOne.id, userSchedule);
      await schedulesService.createUserSchedule(teammateTwo.id, userSchedule);

      await schedulesService.createUserSchedule(teammateThree.id, {
        ...userSchedule,
        availability: [
          {
            days: ["Monday", "Friday"],
            startTime: "09:00",
            endTime: "17:00",
          },
        ],
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should get collective team event slots in UTC", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${collectiveEventTypeId}&start=2050-09-05&end=2050-09-09`)
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

    it("should get collective team event slots in UTC using teamSlug and eventTypeSlug", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?teamSlug=${teamSlug}&eventTypeSlug=${collectiveEventTypeSlug}&start=2050-09-05&end=2050-09-09`
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

    it("should get round robin team event slots in UTC", async () => {
      return request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${roundRobinEventTypeId}&start=2050-09-05&end=2050-09-09`)
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

    it("should get round robin team event without fixed hosts slots in UTC with subsetIds for teammateThree who has a smaller schedule", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeId=${roundRobinEventTypeWithoutFixedHostsId}&start=2050-09-05&end=2050-09-09&rrHostSubsetIds[]=${teammateThree.id}`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;
          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(2);
        });
    });

    it("should get round robin team event  without fixed hosts slots in UTC with subsetIds for teammateOne", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeId=${roundRobinEventTypeWithoutFixedHostsId}&start=2050-09-05&end=2050-09-09&rrHostSubsetIds[]=${teammateOne.id}`
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

    it("should get round robin team event with and without fixed hosts slots in UTC with subsetIds for teammateOne(fixed) and teammateThree(not fixed) ", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeId=${roundRobinEventTypeWithFixedAndNonFixedHostsId}&start=2050-09-05&end=2050-09-09&rrHostSubsetIds[]=${teammateOne.id}&rrHostSubsetIds[]=${teammateThree.id}`
        )
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetSlotsOutput_2024_09_04 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          const slots = responseBody.data;

          expect(slots).toBeDefined();
          const days = Object.keys(slots);
          expect(days.length).toEqual(2);
        });
    });

    it("should get round robin team event with and without fixed hosts slots in UTC with subsetIds for teammateOne(fixed) and teammateTwo(not fixed) ", async () => {
      return request(app.getHttpServer())
        .get(
          `/v2/slots?eventTypeId=${roundRobinEventTypeWithFixedAndNonFixedHostsId}&start=2050-09-05&end=2050-09-09&rrHostSubsetIds[]=${teammateOne.id}&rrHostSubsetIds[]=${teammateTwo.id}`
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

    it("should not be able reserve a team event type slot with custom duration if no auth is provided", async () => {
      await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId: collectiveEventTypeId,
          slotStart: "2050-09-05T10:00:00.000Z",
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(401);
    });

    it("should not be able reserve a slot with custom duration if provided auth user is not part of the team that owns the team event type", async () => {
      await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId: collectiveEventTypeId,
          slotStart: "2050-09-05T10:00:00.000Z",
          reservationDuration: 10,
        })
        .set({ Authorization: `Bearer cal_test_${outsiderApiKeyString}` })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(403);
    });

    it("should not be able reserve a slot for team event type without hosts", async () => {
      await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId: collectiveEventTypeWithoutHostsId,
          slotStart: "2050-09-05T10:00:00.000Z",
        })
        .set({ Authorization: `Bearer cal_test_${teammateApiKeyString}` })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(400);
    });

    it("should reserve a slot as team member of the team that owns the team event type", async () => {
      // note(Lauris): mock current date to test slots release time
      const now = "2049-09-05T12:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T10:00:00.000Z";
      const reserveResponse = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${teammateApiKeyString}` })
        .send({
          eventTypeId: collectiveEventTypeId,
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
        .get(`/v2/slots?eventTypeId=${collectiveEventTypeId}&start=2050-09-05&end=2050-09-09`)
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

      const dbSlot = await selectedSlotRepositoryFixture.getByUid(reservedSlot.reservationUid);
      expect(dbSlot).toBeDefined();
      if (dbSlot) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlot.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 10 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
      }
      await selectedSlotRepositoryFixture.deleteByUId(reservedSlot.reservationUid);
      clear();
    });

    it("should book collective event type and slot should not be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${collectiveEventTypeId}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: collectiveEventTypeId,
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
            id: teammateOne.id,
          },
        },
      });
      collectiveBookingId = booking.id;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${collectiveEventTypeId}&start=2050-09-05&end=2050-09-09`)
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
      bookingsRepositoryFixture.deleteById(booking.id);
    });

    it("should book round robin event type and slot should be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const booking = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${roundRobinEventTypeId}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: roundRobinEventTypeId,
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
            id: teammateOne.id,
          },
        },
      });
      roundRobinBookingId = booking.id;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${roundRobinEventTypeId}&start=2050-09-05&end=2050-09-09`)
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
      bookingsRepositoryFixture.deleteById(booking.id);
    });

    it("should fully book round robin event type and slot should not be available at that time", async () => {
      const startTime = "2050-09-05T11:00:00.000Z";
      const bookingOne = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${roundRobinEventTypeId}-1`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: roundRobinEventTypeId,
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
            id: teammateOne.id,
          },
        },
      });
      fullyBookedRoundRobinBookingIdOne = bookingOne.id;

      const bookingTwo = await bookingsRepositoryFixture.create({
        uid: `booking-uid-${roundRobinEventTypeId}-2`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: roundRobinEventTypeId,
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
            id: teammateTwo.id,
          },
        },
      });
      fullyBookedRoundRobinBookingIdTwo = bookingTwo.id;

      const response = await request(app.getHttpServer())
        .get(`/v2/slots?eventTypeId=${roundRobinEventTypeId}&start=2050-09-05&end=2050-09-09`)
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
      bookingsRepositoryFixture.deleteById(bookingOne.id);
      bookingsRepositoryFixture.deleteById(bookingTwo.id);
    });

    it("should reserve all available slots for round robin event type with non-fixed hosts", async () => {
      const now = "2049-09-05T12:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T10:00:00.000Z";

      const reserveResponseOne = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${teammateApiKeyString}` })
        .send({
          eventTypeId: roundRobinEventTypeWithoutFixedHostsId,
          slotStart: slotStartTime,
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(201);

      const reserveResponseOneBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponseOne.body;
      expect(reserveResponseOneBody.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlotOne: ReserveSlotOutputData_2024_09_04 = reserveResponseOneBody.data;
      expect(responseReservedSlotOne.reservationUid).toBeDefined();
      if (!responseReservedSlotOne.reservationUid) {
        throw new Error("Reserved slot one uid is undefined");
      }

      const dbSlotOne = await selectedSlotRepositoryFixture.getByUid(responseReservedSlotOne.reservationUid);
      expect(dbSlotOne).toBeDefined();
      if (dbSlotOne) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlotOne.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 10 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
      }

      const reserveResponseTwo = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${teammateTwoApiKeyString}` })
        .send({
          eventTypeId: roundRobinEventTypeWithoutFixedHostsId,
          slotStart: slotStartTime,
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(201);

      const reserveResponseTwoBody: ReserveSlotOutputResponse_2024_09_04 = reserveResponseTwo.body;
      expect(reserveResponseTwoBody.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlotTwo: ReserveSlotOutputData_2024_09_04 = reserveResponseTwoBody.data;
      expect(responseReservedSlotTwo.reservationUid).toBeDefined();
      if (!responseReservedSlotTwo.reservationUid) {
        throw new Error("Reserved slot two uid is undefined");
      }

      const dbSlotTwo = await selectedSlotRepositoryFixture.getByUid(responseReservedSlotTwo.reservationUid);
      expect(dbSlotTwo).toBeDefined();
      if (dbSlotTwo) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlotTwo.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 10 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
      }

      const reserveResponseThree = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${outsiderApiKeyString}` })
        .send({
          eventTypeId: roundRobinEventTypeWithoutFixedHostsId,
          slotStart: slotStartTime,
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04);

      expect(reserveResponseThree.status).toEqual(403);
      expect(reserveResponseThree.body.status).toEqual(ERROR_STATUS);

      await selectedSlotRepositoryFixture.deleteByUId(responseReservedSlotOne.reservationUid);
      await selectedSlotRepositoryFixture.deleteByUId(responseReservedSlotTwo.reservationUid);
      clear();
    });

    it("should reserve available slot for round robin event type with fixed and non-fixed hosts and should not be able to reserve another slot", async () => {
      const now = "2049-09-05T12:00:00.000Z";
      const newDate = DateTime.fromISO(now, { zone: "UTC" }).toJSDate();
      advanceTo(newDate);

      const slotStartTime = "2050-09-05T10:00:00.000Z";

      const reserveResponseOne = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .set({ Authorization: `Bearer cal_test_${teammateApiKeyString}` })
        .send({
          eventTypeId: roundRobinEventTypeWithFixedAndNonFixedHostsId,
          slotStart: slotStartTime,
          reservationDuration: 10,
        })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(201);

      const reserveResponseBodyOne: ReserveSlotOutputResponse_2024_09_04 = reserveResponseOne.body;
      expect(reserveResponseBodyOne.status).toEqual(SUCCESS_STATUS);
      const responseReservedSlotOne: ReserveSlotOutputData_2024_09_04 = reserveResponseBodyOne.data;
      expect(responseReservedSlotOne.reservationUid).toBeDefined();
      if (!responseReservedSlotOne.reservationUid) {
        throw new Error("Reserved slot uid is undefined");
      }

      const dbSlotOne = await selectedSlotRepositoryFixture.getByUid(responseReservedSlotOne.reservationUid);
      expect(dbSlotOne).toBeDefined();
      if (dbSlotOne) {
        const dbReleaseAt = DateTime.fromJSDate(dbSlotOne.releaseAt, { zone: "UTC" }).toISO();
        const expectedReleaseAt = DateTime.fromISO(now, { zone: "UTC" }).plus({ minutes: 10 }).toISO();
        expect(dbReleaseAt).toEqual(expectedReleaseAt);
      }

      const reserveResponseTwo = await request(app.getHttpServer())
        .post(`/v2/slots/reservations`)
        .send({
          eventTypeId: roundRobinEventTypeWithFixedAndNonFixedHostsId,
          slotStart: slotStartTime,
        })
        .set({ Authorization: `Bearer cal_test_${teammateTwoApiKeyString}` })
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04);

      expect(reserveResponseTwo.status).toEqual(422);
      expect(reserveResponseTwo.body.status).toEqual(ERROR_STATUS);

      await selectedSlotRepositoryFixture.deleteByUId(responseReservedSlotOne.reservationUid);
      clear();
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(teammateOne.email);
      await userRepositoryFixture.deleteByEmail(teammateTwo.email);
      await userRepositoryFixture.deleteByEmail(teammateThree.email);
      await userRepositoryFixture.deleteByEmail(outsiderEmail);
      await teamRepositoryFixture.delete(team.id);
      await bookingsRepositoryFixture.deleteById(collectiveBookingId);
      await bookingsRepositoryFixture.deleteById(roundRobinBookingId);
      await bookingsRepositoryFixture.deleteById(fullyBookedRoundRobinBookingIdOne);
      await bookingsRepositoryFixture.deleteById(fullyBookedRoundRobinBookingIdTwo);
      await app.close();
    });
  });
});
