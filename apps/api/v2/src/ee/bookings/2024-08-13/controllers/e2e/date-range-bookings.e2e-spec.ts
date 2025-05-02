import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { EventType, User } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { getWeeklyAvailability9To5, UTC0 } from "test/utils/availability";
import { getDateDaysBeforeNow, getDateDaysFromNow } from "test/utils/days";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { GetBookingsOutput_2024_08_13, GetSeatedBookingOutput_2024_08_13 } from "@calcom/platform-types";
import { BookingOutput_2024_08_13, RecurringBookingOutput_2024_08_13 } from "@calcom/platform-types";
import { Booking, PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Date range bookings", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `user-bookings-user-${randomString()}@api.com`;
    let user: User;

    let eventTypeId: number;
    let eventType: EventType;
    const eventTypeSlug = `user-bookings-event-type-${randomString()}`;

    let bookingWeekAgo: Booking;
    let bookingTwoMonthsAgo: Booking;
    let bookingNextWeek: Booking;
    let bookingTwoMonthsFromNow: Booking;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await teamRepositoryFixture.create({
        name: `user-bookings-organization-${randomString()}`,
        isOrganization: true,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule = getWeeklyAvailability9To5();
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `user-bookings-2024-08-13-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;
      eventType = event;

      bookingWeekAgo = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: getDateDaysBeforeNow({ days: 7, hours: 13, minutes: 0 }),
        endTime: getDateDaysBeforeNow({ days: 7, hours: 14, minutes: 0 }),
        title: "peer coding lets goo",
        uid: `booking-in-the-past-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Oldie",
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie",
            locale: "lv",
            timeZone: UTC0,
          },
        },
        rating: 10,
      });

      bookingTwoMonthsAgo = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: getDateDaysBeforeNow({ days: 60, hours: 13, minutes: 0 }),
        endTime: getDateDaysBeforeNow({ days: 60, hours: 14, minutes: 0 }),
        title: "peer coding lets goo",
        uid: `booking-in-the-past-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Oldie",
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie",
            locale: "lv",
            timeZone: UTC0,
          },
        },
        rating: 10,
      });

      bookingNextWeek = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: getDateDaysFromNow({ days: 7, hours: 13, minutes: 0 }),
        endTime: getDateDaysFromNow({ days: 7, hours: 14, minutes: 0 }),
        title: "peer coding lets goo",
        uid: `booking-in-the-past-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Oldie",
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie",
            locale: "lv",
            timeZone: UTC0,
          },
        },
        rating: 10,
      });

      bookingTwoMonthsFromNow = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: getDateDaysFromNow({ days: 60, hours: 13, minutes: 0 }),
        endTime: getDateDaysFromNow({ days: 60, hours: 14, minutes: 0 }),
        title: "peer coding lets goo",
        uid: `booking-in-the-past-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Oldie",
          email: "oldie@gmail.com",
        },
        attendees: {
          create: {
            email: "oldie@gmail.com",
            name: "Oldie",
            locale: "lv",
            timeZone: UTC0,
          },
        },
        rating: 10,
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    describe("get bookings", () => {
      it("should get bookings within last and next month when not specifying query params", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get upcoming bookings only 1 month in future", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=upcoming`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(1);
          });
      });

      it("should get upcoming bookings N months in future", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=upcoming&beforeEnd=${getDateDaysFromNow({ days: 61 }).toISOString()}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get past bookings only 1 month in past", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=past`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(1);
          });
      });

      it("should get past bookings N months in past", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=past&afterStart=${getDateDaysBeforeNow({ days: 61 }).toISOString()}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get upcoming and past bookings 1 month in future and 1 month in past", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?status=upcoming,past`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(2);
          });
      });

      it("should get bookings within specified time range in past and future", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/bookings?afterStart=${getDateDaysBeforeNow({
              days: 61,
            }).toISOString()}&beforeEnd=${getDateDaysFromNow({ days: 61 }).toISOString()}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(4);
          });
      });

      it("should get bookings within specified time range in past", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/bookings?afterStart=${getDateDaysBeforeNow({
              days: 30,
            }).toISOString()}&beforeEnd=${getDateDaysFromNow({ days: 1 }).toISOString()}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: (
              | BookingOutput_2024_08_13
              | RecurringBookingOutput_2024_08_13
              | GetSeatedBookingOutput_2024_08_13
            )[] = responseBody.data;
            expect(data.length).toEqual(1);
          });
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
