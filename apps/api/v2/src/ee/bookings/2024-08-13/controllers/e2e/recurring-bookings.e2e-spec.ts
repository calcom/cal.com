import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { AttendeeCancelledEmail, OrganizerCancelledEmail } from "@calcom/platform-libraries/emails";
import type {
  CreateRecurringBookingInput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  CancelBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { User, PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Creating recurring bookings", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `recurring-bookings-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    const maxRecurrenceCount = 3;
    let recurringEventTypeId: number;
    const recurringEventSlug = `recurring-bookings-2024-08-13-event-type-${randomString()}`;

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
        name: `recurring-bookings-2024-08-13-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `recurring-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const recurringEvent = await eventTypesRepositoryFixture.create(
        // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
        {
          title: `recurring-bookings-2024-08-13-event-type-${randomString()}`,
          slug: recurringEventSlug,
          length: 60,
          recurringEvent: { freq: 2, count: maxRecurrenceCount, interval: 1 },
        },
        user.id
      );
      recurringEventTypeId = recurringEvent.id;

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

    it("should not create recurring booking with recurrenceCount larger than event type recurrence count", async () => {
      const recurrenceCount = 1000;

      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
        eventTypeId: recurringEventTypeId,
        attendee: {
          name: "Mr Proper Recurring",
          email: "mr_proper_recurring@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        recurrenceCount,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(400);
    });

    it("should create a recurring booking with recurrenceCount smaller than event type recurrence count", async () => {
      const recurrenceCount = maxRecurrenceCount - 1;
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
        eventTypeId: recurringEventTypeId,
        attendee: {
          name: "Mr Proper Recurring",
          email: "mr_proper_recurring@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        recurrenceCount,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

          if (responseDataIsRecurringBooking(responseBody.data)) {
            const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(maxRecurrenceCount - 1);

            const firstBooking = data[0];
            expect(firstBooking.id).toBeDefined();
            expect(firstBooking.uid).toBeDefined();
            expect(firstBooking.hosts[0].id).toEqual(user.id);
            expect(firstBooking.status).toEqual("accepted");
            expect(firstBooking.start).toEqual(new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString());
            expect(firstBooking.end).toEqual(new Date(Date.UTC(2030, 1, 4, 14, 0, 0)).toISOString());
            expect(firstBooking.duration).toEqual(60);
            expect(firstBooking.eventTypeId).toEqual(recurringEventTypeId);
            expect(firstBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
            });
            expect(firstBooking.location).toEqual(body.location);
            expect(firstBooking.recurringBookingUid).toBeDefined();
            expect(firstBooking.absentHost).toEqual(false);

            const secondBooking = data[1];
            expect(secondBooking.id).toBeDefined();
            expect(secondBooking.uid).toBeDefined();
            expect(secondBooking.hosts[0].id).toEqual(user.id);
            expect(secondBooking.status).toEqual("accepted");
            expect(secondBooking.start).toEqual(new Date(Date.UTC(2030, 1, 11, 13, 0, 0)).toISOString());
            expect(secondBooking.end).toEqual(new Date(Date.UTC(2030, 1, 11, 14, 0, 0)).toISOString());
            expect(secondBooking.duration).toEqual(60);
            expect(secondBooking.eventTypeId).toEqual(recurringEventTypeId);
            expect(secondBooking.recurringBookingUid).toBeDefined();
            expect(secondBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
            });
            expect(secondBooking.location).toEqual(body.location);
            expect(secondBooking.absentHost).toEqual(false);
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should create a recurring booking with recurrenceCount equal to event type recurrence count", async () => {
      const recurrenceCount = maxRecurrenceCount;
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
        eventTypeId: recurringEventTypeId,
        attendee: {
          name: "Mr Proper Recurring",
          email: "mr_proper_recurring@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        recurrenceCount,
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

          if (responseDataIsRecurringBooking(responseBody.data)) {
            const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(maxRecurrenceCount);

            const firstBooking = data[0];
            expect(firstBooking.id).toBeDefined();
            expect(firstBooking.uid).toBeDefined();
            expect(firstBooking.hosts[0].id).toEqual(user.id);
            expect(firstBooking.status).toEqual("accepted");
            expect(firstBooking.start).toEqual(new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString());
            expect(firstBooking.end).toEqual(new Date(Date.UTC(2030, 1, 4, 14, 0, 0)).toISOString());
            expect(firstBooking.duration).toEqual(60);
            expect(firstBooking.eventTypeId).toEqual(recurringEventTypeId);
            expect(firstBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
            });
            expect(firstBooking.location).toEqual(body.location);
            expect(firstBooking.meetingUrl).toEqual(body.location);
            expect(firstBooking.recurringBookingUid).toBeDefined();
            expect(firstBooking.absentHost).toEqual(false);

            const secondBooking = data[1];
            expect(secondBooking.id).toBeDefined();
            expect(secondBooking.uid).toBeDefined();
            expect(secondBooking.hosts[0].id).toEqual(user.id);
            expect(secondBooking.status).toEqual("accepted");
            expect(secondBooking.start).toEqual(new Date(Date.UTC(2030, 1, 11, 13, 0, 0)).toISOString());
            expect(secondBooking.end).toEqual(new Date(Date.UTC(2030, 1, 11, 14, 0, 0)).toISOString());
            expect(secondBooking.duration).toEqual(60);
            expect(secondBooking.eventTypeId).toEqual(recurringEventTypeId);
            expect(secondBooking.recurringBookingUid).toBeDefined();
            expect(secondBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
            });
            expect(secondBooking.location).toEqual(body.location);
            expect(secondBooking.absentHost).toEqual(false);

            const thirdBooking = data[2];
            expect(thirdBooking.id).toBeDefined();
            expect(thirdBooking.uid).toBeDefined();
            expect(thirdBooking.hosts[0].id).toEqual(user.id);
            expect(thirdBooking.status).toEqual("accepted");
            expect(thirdBooking.start).toEqual(new Date(Date.UTC(2030, 1, 18, 13, 0, 0)).toISOString());
            expect(thirdBooking.end).toEqual(new Date(Date.UTC(2030, 1, 18, 14, 0, 0)).toISOString());
            expect(thirdBooking.duration).toEqual(60);
            expect(thirdBooking.eventTypeId).toEqual(recurringEventTypeId);
            expect(thirdBooking.recurringBookingUid).toBeDefined();
            expect(thirdBooking.attendees[0]).toEqual({
              name: body.attendee.name,
              email: body.attendee.email,
              timeZone: body.attendee.timeZone,
              language: body.attendee.language,
              absent: false,
            });
            expect(thirdBooking.location).toEqual(body.location);
            expect(thirdBooking.absentHost).toEqual(false);
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    afterEach(async () => {
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });

  function responseDataIsRecurringBooking(data: any): data is RecurringBookingOutput_2024_08_13[] {
    return Array.isArray(data);
  }

  describe("Recurring bookings cancel all subsequent bookings", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `recurring-bookings-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    const maxRecurrenceCount = 4;
    let recurringEventTypeId: number;

    let recurringBooking: RecurringBookingOutput_2024_08_13[];

    beforeAll(async () => {
      jest.spyOn(AttendeeCancelledEmail.prototype as any, "getHtml").mockImplementation(async function () {
        return "<html><body>Mocked Email Content</body></html>";
      });

      jest.spyOn(OrganizerCancelledEmail.prototype as any, "getHtml").mockImplementation(async function () {
        return "<html><body>Mocked Email Content</body></html>";
      });

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
        name: `recurring-bookings-2024-08-13-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `recurring-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const recurringEventSlug = `recurring-bookings-2024-08-13-event-type-${randomString()}`;
      const recurringEvent = await eventTypesRepositoryFixture.create(
        // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
        {
          title: `recurring-bookings-2024-08-13-event-type-${randomString()}`,
          slug: recurringEventSlug,
          length: 60,
          recurringEvent: { freq: 2, count: maxRecurrenceCount, interval: 1 },
        },
        user.id
      );
      recurringEventTypeId = recurringEvent.id;

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

    it("should create a recurring booking", async () => {
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 1, 4, 13, 0, 0)).toISOString(),
        eventTypeId: recurringEventTypeId,
        attendee: {
          name: "Mr Proper Recurring",
          email: "mr_proper_recurring@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

          if (responseDataIsRecurringBooking(responseBody.data)) {
            const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(maxRecurrenceCount);
            recurringBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should cancel all recurrences after a specific recurrence", async () => {
      const recurringBookingUid = recurringBooking[2].recurringBookingUid;
      const bookings = await bookingsRepositoryFixture.getByRecurringBookingUid(recurringBookingUid);
      for (const booking of bookings) {
        expect(booking.status).toEqual("ACCEPTED");
      }

      // note(Lauris): cancel all recurrences after and including third recurrence in the series of 4 recurrences
      // aka cancel 3rd and 4th recurrences.
      const thirdRecurrenceUid = recurringBooking[2].uid;
      const fourthRecurringUid = recurringBooking[3].uid;
      const body: CancelBookingInput_2024_08_13 = {
        cancelSubsequentBookings: true,
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${thirdRecurrenceUid}/cancel`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

          if (responseDataIsRecurringBooking(responseBody.data)) {
            const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(4);

            const firstRecurrence = data.find((booking) => booking.uid === recurringBooking[0].uid);
            expect(firstRecurrence).toBeDefined();
            expect(firstRecurrence?.status).toEqual("accepted");

            const secondRecurrence = data.find((booking) => booking.uid === recurringBooking[1].uid);
            expect(secondRecurrence).toBeDefined();
            expect(secondRecurrence?.status).toEqual("accepted");

            const thirdRecurrence = data.find((booking) => booking.uid === thirdRecurrenceUid);
            expect(thirdRecurrence).toBeDefined();
            expect(thirdRecurrence?.status).toEqual("cancelled");

            const fourthRecurrence = data.find((booking) => booking.uid === fourthRecurringUid);
            expect(fourthRecurrence).toBeDefined();
            expect(fourthRecurrence?.status).toEqual("cancelled");

            const bookings = await bookingsRepositoryFixture.getByRecurringBookingUid(recurringBookingUid);

            const bookingFirst = bookings.find((booking) => booking.uid === recurringBooking[0].uid);
            expect(bookingFirst?.status).toEqual("ACCEPTED");
            const bookingSecond = bookings.find((booking) => booking.uid === recurringBooking[1].uid);
            expect(bookingSecond?.status).toEqual("ACCEPTED");
            const bookingThird = bookings.find((booking) => booking.uid === recurringBooking[2].uid);
            expect(bookingThird?.status).toEqual("CANCELLED");
            const bookingFourth = bookings.find((booking) => booking.uid === recurringBooking[3].uid);
            expect(bookingFourth?.status).toEqual("CANCELLED");
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
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

  describe("Recurring bookings cancel all remaining bookings (bookings with start time greater than this moment)", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;

    const userEmail = `recurring-bookings-2024-08-13-user-${randomString()}@api.com`;
    let user: User;

    const maxRecurrenceCount = 4;
    let recurringEventTypeId: number;

    let recurringBooking: RecurringBookingOutput_2024_08_13[];

    beforeAll(async () => {
      jest.spyOn(AttendeeCancelledEmail.prototype as any, "getHtml").mockImplementation(async function () {
        return "<html><body>Mocked Email Content</body></html>";
      });

      jest.spyOn(OrganizerCancelledEmail.prototype as any, "getHtml").mockImplementation(async function () {
        return "<html><body>Mocked Email Content</body></html>";
      });

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
        name: `recurring-bookings-2024-08-13-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `recurring-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const recurringEventSlug = `recurring-bookings-2024-08-13-event-type-${randomString()}`;
      const recurringEvent = await eventTypesRepositoryFixture.create(
        // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
        {
          title: `recurring-bookings-2024-08-13-event-type-${randomString()}`,
          slug: recurringEventSlug,
          length: 60,
          recurringEvent: { freq: 2, count: maxRecurrenceCount, interval: 1 },
        },
        user.id
      );
      recurringEventTypeId = recurringEvent.id;

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

    it("should create a recurring booking", async () => {
      const body: CreateRecurringBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 1, 3, 13, 0, 0)).toISOString(),
        eventTypeId: recurringEventTypeId,
        attendee: {
          name: "Mr Proper Recurring",
          email: "mr_proper_recurring@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

          if (responseDataIsRecurringBooking(responseBody.data)) {
            const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(maxRecurrenceCount);
            recurringBooking = data;
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
        });
    });

    it("should cancel all remaining recurrences", async () => {
      const recurringBookingUid = recurringBooking[0].recurringBookingUid;

      return request(app.getHttpServer())
        .post(`/v2/bookings/${recurringBookingUid}/cancel`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(responseDataIsRecurringBooking(responseBody.data)).toBe(true);

          if (responseDataIsRecurringBooking(responseBody.data)) {
            const data: RecurringBookingOutput_2024_08_13[] = responseBody.data;
            expect(data.length).toEqual(4);
            for (const booking of data) {
              expect(booking.status).toEqual("cancelled");
            }
          } else {
            throw new Error(
              "Invalid response data - expected recurring booking but received non array response"
            );
          }
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
