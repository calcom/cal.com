import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/schedules.module";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { GetReservedSlotOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-reserved-slot.output";
import { GetSlotsOutput_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/get-slots.output";
import { ReserveSlotOutputResponse_2024_09_04 } from "@/modules/slots/slots-2024-09-04/outputs/reserve-slot.output";
import { SlotsModule_2024_09_04 } from "@/modules/slots/slots-2024-09-04/slots.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { Profile, User } from "@prisma/client";
import { advanceTo, clear } from "jest-date-mock";
import { DateTime } from "luxon";
import * as request from "supertest";
import { AttendeeRepositoryFixture } from "test/fixtures/repository/attendee.repository.fixture";
import { BookingSeatRepositoryFixture } from "test/fixtures/repository/booking-seat.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SelectedSlotsRepositoryFixture } from "test/fixtures/repository/selected-slots.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomNumber } from "test/utils/randomNumber";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import {
  CreateScheduleInput_2024_06_11,
  ReserveSlotOutput_2024_09_04 as ReserveSlotOutputData_2024_09_04,
} from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

const expectedSlotsUTC = {
  "2050-09-05": [
    { start: "2050-09-05T07:00:00.000Z" },
    { start: "2050-09-05T08:00:00.000Z" },
    { start: "2050-09-05T09:00:00.000Z" },
    { start: "2050-09-05T10:00:00.000Z" },
    { start: "2050-09-05T11:00:00.000Z" },
    { start: "2050-09-05T12:00:00.000Z" },
    { start: "2050-09-05T13:00:00.000Z" },
    { start: "2050-09-05T14:00:00.000Z" },
  ],
  "2050-09-06": [
    { start: "2050-09-06T07:00:00.000Z" },
    { start: "2050-09-06T08:00:00.000Z" },
    { start: "2050-09-06T09:00:00.000Z" },
    { start: "2050-09-06T10:00:00.000Z" },
    { start: "2050-09-06T11:00:00.000Z" },
    { start: "2050-09-06T12:00:00.000Z" },
    { start: "2050-09-06T13:00:00.000Z" },
    { start: "2050-09-06T14:00:00.000Z" },
  ],
  "2050-09-07": [
    { start: "2050-09-07T07:00:00.000Z" },
    { start: "2050-09-07T08:00:00.000Z" },
    { start: "2050-09-07T09:00:00.000Z" },
    { start: "2050-09-07T10:00:00.000Z" },
    { start: "2050-09-07T11:00:00.000Z" },
    { start: "2050-09-07T12:00:00.000Z" },
    { start: "2050-09-07T13:00:00.000Z" },
    { start: "2050-09-07T14:00:00.000Z" },
  ],
  "2050-09-08": [
    { start: "2050-09-08T07:00:00.000Z" },
    { start: "2050-09-08T08:00:00.000Z" },
    { start: "2050-09-08T09:00:00.000Z" },
    { start: "2050-09-08T10:00:00.000Z" },
    { start: "2050-09-08T11:00:00.000Z" },
    { start: "2050-09-08T12:00:00.000Z" },
    { start: "2050-09-08T13:00:00.000Z" },
    { start: "2050-09-08T14:00:00.000Z" },
  ],
  "2050-09-09": [
    { start: "2050-09-09T07:00:00.000Z" },
    { start: "2050-09-09T08:00:00.000Z" },
    { start: "2050-09-09T09:00:00.000Z" },
    { start: "2050-09-09T10:00:00.000Z" },
    { start: "2050-09-09T11:00:00.000Z" },
    { start: "2050-09-09T12:00:00.000Z" },
    { start: "2050-09-09T13:00:00.000Z" },
    { start: "2050-09-09T14:00:00.000Z" },
  ],
};

const expectedSlotsRome = {
  "2050-09-05": [
    { start: "2050-09-05T09:00:00.000+02:00" },
    { start: "2050-09-05T10:00:00.000+02:00" },
    { start: "2050-09-05T11:00:00.000+02:00" },
    { start: "2050-09-05T12:00:00.000+02:00" },
    { start: "2050-09-05T13:00:00.000+02:00" },
    { start: "2050-09-05T14:00:00.000+02:00" },
    { start: "2050-09-05T15:00:00.000+02:00" },
    { start: "2050-09-05T16:00:00.000+02:00" },
  ],
  "2050-09-06": [
    { start: "2050-09-06T09:00:00.000+02:00" },
    { start: "2050-09-06T10:00:00.000+02:00" },
    { start: "2050-09-06T11:00:00.000+02:00" },
    { start: "2050-09-06T12:00:00.000+02:00" },
    { start: "2050-09-06T13:00:00.000+02:00" },
    { start: "2050-09-06T14:00:00.000+02:00" },
    { start: "2050-09-06T15:00:00.000+02:00" },
    { start: "2050-09-06T16:00:00.000+02:00" },
  ],
  "2050-09-07": [
    { start: "2050-09-07T09:00:00.000+02:00" },
    { start: "2050-09-07T10:00:00.000+02:00" },
    { start: "2050-09-07T11:00:00.000+02:00" },
    { start: "2050-09-07T12:00:00.000+02:00" },
    { start: "2050-09-07T13:00:00.000+02:00" },
    { start: "2050-09-07T14:00:00.000+02:00" },
    { start: "2050-09-07T15:00:00.000+02:00" },
    { start: "2050-09-07T16:00:00.000+02:00" },
  ],
  "2050-09-08": [
    { start: "2050-09-08T09:00:00.000+02:00" },
    { start: "2050-09-08T10:00:00.000+02:00" },
    { start: "2050-09-08T11:00:00.000+02:00" },
    { start: "2050-09-08T12:00:00.000+02:00" },
    { start: "2050-09-08T13:00:00.000+02:00" },
    { start: "2050-09-08T14:00:00.000+02:00" },
    { start: "2050-09-08T15:00:00.000+02:00" },
    { start: "2050-09-08T16:00:00.000+02:00" },
  ],
  "2050-09-09": [
    { start: "2050-09-09T09:00:00.000+02:00" },
    { start: "2050-09-09T10:00:00.000+02:00" },
    { start: "2050-09-09T11:00:00.000+02:00" },
    { start: "2050-09-09T12:00:00.000+02:00" },
    { start: "2050-09-09T13:00:00.000+02:00" },
    { start: "2050-09-09T14:00:00.000+02:00" },
    { start: "2050-09-09T15:00:00.000+02:00" },
    { start: "2050-09-09T16:00:00.000+02:00" },
  ],
};

const expectedSlotsUTCRange = {
  "2050-09-05": [
    { start: "2050-09-05T07:00:00.000Z", end: "2050-09-05T08:00:00.000Z" },
    { start: "2050-09-05T08:00:00.000Z", end: "2050-09-05T09:00:00.000Z" },
    { start: "2050-09-05T09:00:00.000Z", end: "2050-09-05T10:00:00.000Z" },
    { start: "2050-09-05T10:00:00.000Z", end: "2050-09-05T11:00:00.000Z" },
    { start: "2050-09-05T11:00:00.000Z", end: "2050-09-05T12:00:00.000Z" },
    { start: "2050-09-05T12:00:00.000Z", end: "2050-09-05T13:00:00.000Z" },
    { start: "2050-09-05T13:00:00.000Z", end: "2050-09-05T14:00:00.000Z" },
    { start: "2050-09-05T14:00:00.000Z", end: "2050-09-05T15:00:00.000Z" },
  ],
  "2050-09-06": [
    { start: "2050-09-06T07:00:00.000Z", end: "2050-09-06T08:00:00.000Z" },
    { start: "2050-09-06T08:00:00.000Z", end: "2050-09-06T09:00:00.000Z" },
    { start: "2050-09-06T09:00:00.000Z", end: "2050-09-06T10:00:00.000Z" },
    { start: "2050-09-06T10:00:00.000Z", end: "2050-09-06T11:00:00.000Z" },
    { start: "2050-09-06T11:00:00.000Z", end: "2050-09-06T12:00:00.000Z" },
    { start: "2050-09-06T12:00:00.000Z", end: "2050-09-06T13:00:00.000Z" },
    { start: "2050-09-06T13:00:00.000Z", end: "2050-09-06T14:00:00.000Z" },
    { start: "2050-09-06T14:00:00.000Z", end: "2050-09-06T15:00:00.000Z" },
  ],
  "2050-09-07": [
    { start: "2050-09-07T07:00:00.000Z", end: "2050-09-07T08:00:00.000Z" },
    { start: "2050-09-07T08:00:00.000Z", end: "2050-09-07T09:00:00.000Z" },
    { start: "2050-09-07T09:00:00.000Z", end: "2050-09-07T10:00:00.000Z" },
    { start: "2050-09-07T10:00:00.000Z", end: "2050-09-07T11:00:00.000Z" },
    { start: "2050-09-07T11:00:00.000Z", end: "2050-09-07T12:00:00.000Z" },
    { start: "2050-09-07T12:00:00.000Z", end: "2050-09-07T13:00:00.000Z" },
    { start: "2050-09-07T13:00:00.000Z", end: "2050-09-07T14:00:00.000Z" },
    { start: "2050-09-07T14:00:00.000Z", end: "2050-09-07T15:00:00.000Z" },
  ],
  "2050-09-08": [
    { start: "2050-09-08T07:00:00.000Z", end: "2050-09-08T08:00:00.000Z" },
    { start: "2050-09-08T08:00:00.000Z", end: "2050-09-08T09:00:00.000Z" },
    { start: "2050-09-08T09:00:00.000Z", end: "2050-09-08T10:00:00.000Z" },
    { start: "2050-09-08T10:00:00.000Z", end: "2050-09-08T11:00:00.000Z" },
    { start: "2050-09-08T11:00:00.000Z", end: "2050-09-08T12:00:00.000Z" },
    { start: "2050-09-08T12:00:00.000Z", end: "2050-09-08T13:00:00.000Z" },
    { start: "2050-09-08T13:00:00.000Z", end: "2050-09-08T14:00:00.000Z" },
    { start: "2050-09-08T14:00:00.000Z", end: "2050-09-08T15:00:00.000Z" },
  ],
  "2050-09-09": [
    { start: "2050-09-09T07:00:00.000Z", end: "2050-09-09T08:00:00.000Z" },
    { start: "2050-09-09T08:00:00.000Z", end: "2050-09-09T09:00:00.000Z" },
    { start: "2050-09-09T09:00:00.000Z", end: "2050-09-09T10:00:00.000Z" },
    { start: "2050-09-09T10:00:00.000Z", end: "2050-09-09T11:00:00.000Z" },
    { start: "2050-09-09T11:00:00.000Z", end: "2050-09-09T12:00:00.000Z" },
    { start: "2050-09-09T12:00:00.000Z", end: "2050-09-09T13:00:00.000Z" },
    { start: "2050-09-09T13:00:00.000Z", end: "2050-09-09T14:00:00.000Z" },
    { start: "2050-09-09T14:00:00.000Z", end: "2050-09-09T15:00:00.000Z" },
  ],
};

const expectedSlotsRomeRange = {
  "2050-09-05": [
    { start: "2050-09-05T09:00:00.000+02:00", end: "2050-09-05T10:00:00.000+02:00" },
    { start: "2050-09-05T10:00:00.000+02:00", end: "2050-09-05T11:00:00.000+02:00" },
    { start: "2050-09-05T11:00:00.000+02:00", end: "2050-09-05T12:00:00.000+02:00" },
    { start: "2050-09-05T12:00:00.000+02:00", end: "2050-09-05T13:00:00.000+02:00" },
    { start: "2050-09-05T13:00:00.000+02:00", end: "2050-09-05T14:00:00.000+02:00" },
    { start: "2050-09-05T14:00:00.000+02:00", end: "2050-09-05T15:00:00.000+02:00" },
    { start: "2050-09-05T15:00:00.000+02:00", end: "2050-09-05T16:00:00.000+02:00" },
    { start: "2050-09-05T16:00:00.000+02:00", end: "2050-09-05T17:00:00.000+02:00" },
  ],
  "2050-09-06": [
    { start: "2050-09-06T09:00:00.000+02:00", end: "2050-09-06T10:00:00.000+02:00" },
    { start: "2050-09-06T10:00:00.000+02:00", end: "2050-09-06T11:00:00.000+02:00" },
    { start: "2050-09-06T11:00:00.000+02:00", end: "2050-09-06T12:00:00.000+02:00" },
    { start: "2050-09-06T12:00:00.000+02:00", end: "2050-09-06T13:00:00.000+02:00" },
    { start: "2050-09-06T13:00:00.000+02:00", end: "2050-09-06T14:00:00.000+02:00" },
    { start: "2050-09-06T14:00:00.000+02:00", end: "2050-09-06T15:00:00.000+02:00" },
    { start: "2050-09-06T15:00:00.000+02:00", end: "2050-09-06T16:00:00.000+02:00" },
    { start: "2050-09-06T16:00:00.000+02:00", end: "2050-09-06T17:00:00.000+02:00" },
  ],
  "2050-09-07": [
    { start: "2050-09-07T09:00:00.000+02:00", end: "2050-09-07T10:00:00.000+02:00" },
    { start: "2050-09-07T10:00:00.000+02:00", end: "2050-09-07T11:00:00.000+02:00" },
    { start: "2050-09-07T11:00:00.000+02:00", end: "2050-09-07T12:00:00.000+02:00" },
    { start: "2050-09-07T12:00:00.000+02:00", end: "2050-09-07T13:00:00.000+02:00" },
    { start: "2050-09-07T13:00:00.000+02:00", end: "2050-09-07T14:00:00.000+02:00" },
    { start: "2050-09-07T14:00:00.000+02:00", end: "2050-09-07T15:00:00.000+02:00" },
    { start: "2050-09-07T15:00:00.000+02:00", end: "2050-09-07T16:00:00.000+02:00" },
    { start: "2050-09-07T16:00:00.000+02:00", end: "2050-09-07T17:00:00.000+02:00" },
  ],
  "2050-09-08": [
    { start: "2050-09-08T09:00:00.000+02:00", end: "2050-09-08T10:00:00.000+02:00" },
    { start: "2050-09-08T10:00:00.000+02:00", end: "2050-09-08T11:00:00.000+02:00" },
    { start: "2050-09-08T11:00:00.000+02:00", end: "2050-09-08T12:00:00.000+02:00" },
    { start: "2050-09-08T12:00:00.000+02:00", end: "2050-09-08T13:00:00.000+02:00" },
    { start: "2050-09-08T13:00:00.000+02:00", end: "2050-09-08T14:00:00.000+02:00" },
    { start: "2050-09-08T14:00:00.000+02:00", end: "2050-09-08T15:00:00.000+02:00" },
    { start: "2050-09-08T15:00:00.000+02:00", end: "2050-09-08T16:00:00.000+02:00" },
    { start: "2050-09-08T16:00:00.000+02:00", end: "2050-09-08T17:00:00.000+02:00" },
  ],
  "2050-09-09": [
    { start: "2050-09-09T09:00:00.000+02:00", end: "2050-09-09T10:00:00.000+02:00" },
    { start: "2050-09-09T10:00:00.000+02:00", end: "2050-09-09T11:00:00.000+02:00" },
    { start: "2050-09-09T11:00:00.000+02:00", end: "2050-09-09T12:00:00.000+02:00" },
    { start: "2050-09-09T12:00:00.000+02:00", end: "2050-09-09T13:00:00.000+02:00" },
    { start: "2050-09-09T13:00:00.000+02:00", end: "2050-09-09T14:00:00.000+02:00" },
    { start: "2050-09-09T14:00:00.000+02:00", end: "2050-09-09T15:00:00.000+02:00" },
    { start: "2050-09-09T15:00:00.000+02:00", end: "2050-09-09T16:00:00.000+02:00" },
    { start: "2050-09-09T16:00:00.000+02:00", end: "2050-09-09T17:00:00.000+02:00" },
  ],
};

describe("Slots Endpoints", () => {
  describe("Individual user slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let selectedSlotsRepositoryFixture: SelectedSlotsRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let bookingSeatsRepositoryFixture: BookingSeatRepositoryFixture;
    let attendeesRepositoryFixture: AttendeeRepositoryFixture;

    const userEmail = "slotss-controller-e2e@api.com";
    let user: User;
    let eventTypeId: number;
    let eventTypeSlug: string;
    let eventTypeLength: number;

    const seatedEventTypeSlug = "peer-coding-seated";
    let seatedEventTypeId: number;

    let reservedSlot: ReserveSlotOutputData_2024_09_04;

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
      selectedSlotsRepositoryFixture = new SelectedSlotsRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      bookingSeatsRepositoryFixture = new BookingSeatRepositoryFixture(moduleRef);
      attendeesRepositoryFixture = new AttendeeRepositoryFixture(moduleRef);

      const id = randomNumber();
      user = await userRepositoryFixture.create({
        email: userEmail,
        name: `slots controller e2e - ${id}`,
        username: `slots-controller-e2e-${id}`,
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
      seatedEventTypeId = seatedEvent.id;

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

    it("should reserve a slot with custom duration and it should not appear in available slots", async () => {
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
        uid: `booking-uid-${seatedEventTypeId}`,
        title: "booking title",
        startTime,
        endTime: "2050-09-05T12:00:00.000Z",
        eventType: {
          connect: {
            id: seatedEventTypeId,
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
        .get(`/api/v2/slots?eventTypeId=${seatedEventTypeId}&start=2050-09-05&end=2050-09-10`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
        .expect(200);

      const responseBody: GetSlotsOutput_2024_09_04 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      const slots = responseBody.data;

      expect(slots).toBeDefined();
      const days = Object.keys(slots);
      expect(days.length).toEqual(5);

      expect(slots).toEqual({
        ...expectedSlotsUTC,
        "2050-09-05": [
          { start: "2050-09-05T07:00:00.000Z" },
          { start: "2050-09-05T08:00:00.000Z" },
          { start: "2050-09-05T09:00:00.000Z" },
          { start: "2050-09-05T10:00:00.000Z" },
          { start: "2050-09-05T11:00:00.000Z", attendeesCount: 1, bookingUid: booking.uid },
          { start: "2050-09-05T12:00:00.000Z" },
          { start: "2050-09-05T13:00:00.000Z" },
          { start: "2050-09-05T14:00:00.000Z" },
        ],
      });

      await bookingsRepositoryFixture.deleteById(booking.id);
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await selectedSlotsRepositoryFixture.deleteByUId(reservedSlot.reservationUid);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      clear();

      await app.close();
    });
  });

  describe("Team event slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    const userEmailOne = "slot-owner-one-e2e@api.com";
    const userEmailTwo = "slot-owner-two-e2e@api.com";

    let organization: Team;
    let team: Team;
    let userOne: User;
    let userTwo: User;
    let collectiveEventTypeId: number;
    let roundRobinEventTypeId: number;
    let collectiveBookingId: number;
    let roundRobinBookingId: number;
    let fullyBookedRoundRobinBookingIdOne: number;
    let fullyBookedRoundRobinBookingIdTwo: number;

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
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      userOne = await userRepositoryFixture.create({
        email: userEmailOne,
        name: "teammate one",
        username: "teammate-one",
      });

      userTwo = await userRepositoryFixture.create({
        email: userEmailTwo,
        name: "teammate two",
        username: "teammate-two",
      });

      organization = await organizationsRepositoryFixture.create({
        name: "Testy Organization",
        isOrganization: true,
      });

      await profileRepositoryFixture.create({
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

      team = await teamRepositoryFixture.create({
        name: "Testy org team",
        isOrganization: false,
        parent: { connect: { id: organization.id } },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: userOne.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: userTwo.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      const collectiveEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: "Collective Event Type",
        slug: "collective-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: userOne.id }, { id: userTwo.id }],
        },
      });
      collectiveEventTypeId = collectiveEventType.id;

      const roundRobinEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        title: "RR Event Type",
        slug: "rr-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        users: {
          connect: [{ id: userOne.id }, { id: userTwo.id }],
        },
      });
      roundRobinEventTypeId = roundRobinEventType.id;

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
            id: userOne.id,
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
            id: userOne.id,
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

      expect(slots).toEqual(expectedSlotsUTC);
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
            id: userOne.id,
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
            id: userTwo.id,
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

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(userOne.email);
      await userRepositoryFixture.deleteByEmail(userTwo.email);
      await teamRepositoryFixture.delete(team.id);
      await organizationsRepositoryFixture.delete(organization.id);
      await bookingsRepositoryFixture.deleteById(collectiveBookingId);
      await bookingsRepositoryFixture.deleteById(roundRobinBookingId);
      await bookingsRepositoryFixture.deleteById(fullyBookedRoundRobinBookingIdOne);
      await bookingsRepositoryFixture.deleteById(fullyBookedRoundRobinBookingIdTwo);
      await app.close();
    });
  });

  describe("Dynamic users slots", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_06_11;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    const userEmailOne = "slot-owner-one-e2e@api.com";
    const userEmailTwo = "slot-owner-two-e2e@api.com";

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

      organization = await organizationsRepositoryFixture.create({
        name: "Testy Organization",
        isOrganization: true,
        slug: "testy-org-0120122",
      });

      userOne = await userRepositoryFixture.create({
        email: userEmailOne,
        name: "slots owner one",
        username: "slots-owner-one",
      });

      userTwo = await userRepositoryFixture.create({
        email: userEmailTwo,
        name: "slots owner two",
        username: "slots-owner-two",
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
