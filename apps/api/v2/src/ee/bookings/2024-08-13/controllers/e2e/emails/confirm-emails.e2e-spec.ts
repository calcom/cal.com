import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
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
import {
  OrganizerScheduledEmail,
  AttendeeScheduledEmail,
  OrganizerRescheduledEmail,
  AttendeeRescheduledEmail,
  OrganizerCancelledEmail,
  AttendeeCancelledEmail,
  AttendeeRequestEmail,
  OrganizerRequestEmail,
  AttendeeDeclinedEmail,
} from "@calcom/platform-libraries/emails";
import type {
  CreateBookingInput_2024_08_13,
  BookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import type { User, Team, PlatformOAuthClient } from "@calcom/prisma/client";

jest
  .spyOn(AttendeeScheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(OrganizerScheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(AttendeeRescheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(OrganizerRescheduledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(AttendeeCancelledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(OrganizerCancelledEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(AttendeeRequestEmail.prototype, "getHtmlRequestEmail")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(OrganizerRequestEmail.prototype, "getHtmlRequestEmail")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(AttendeeDeclinedEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));

function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
  return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
}

describe("Bookings Endpoints 2024-08-13 confirm emails", () => {
  // Split into two separate describe blocks with their own app instances
  // to ensure each test suite authenticates as the booking owner.
  // This fixes the flaky 401 errors that occurred when authenticating as a different user
  // than the booking owner.

  describe("OAuth client managed user bookings - emails disabled", () => {
    let app: INestApplication;
    let organization: Team;
    let oAuthClient: PlatformOAuthClient;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;

    let user: User;
    let eventTypeId: number;
    let createdBookingUid: string;

    // Generate email upfront so it's known before module compilation
    const userEmail = `confirm-emails-disabled-2024-08-13-user-${randomString()}@api.com`;

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
        name: `confirm-emails-disabled-2024-08-13-organization-${randomString()}`,
      });

      // Create OAuth client with emails disabled
      oAuthClient = await oauthClientRepositoryFixture.create(
        organization.id,
        {
          logo: "logo-url",
          name: "name",
          redirectUris: ["http://localhost:5555"],
          permissions: 32,
          areEmailsEnabled: false,
        },
        "secret"
      );

      // Create user with the same email used for authentication
      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `confirm-emails-disabled-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: "peer coding",
          slug: `confirm-emails-disabled-2024-08-13-event-type-${randomString()}`,
          length: 60,
          requiresConfirmation: true,
        },
        user.id
      );
      eventTypeId = event.id;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("should not send an email when creating a booking that requires confirmation", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: eventTypeId,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        bookingFieldsResponses: {
          customField: "customValue",
        },
        metadata: {
          userId: "100",
        },
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          if (responseDataIsBooking(responseBody.data)) {
            expect(responseBody.data.status).toEqual("pending");
            expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(AttendeeRequestEmail.prototype.getHtmlRequestEmail).not.toHaveBeenCalled();
            expect(OrganizerRequestEmail.prototype.getHtmlRequestEmail).not.toHaveBeenCalled();
            createdBookingUid = responseBody.data.uid;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should not send an email when confirming a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdBookingUid}/confirm`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
        });
    });

    it("should not send an email when creating a second booking that requires confirmation", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
        eventTypeId: eventTypeId,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
        location: "https://meet.google.com/abc-def-ghi",
        bookingFieldsResponses: {
          customField: "customValue",
        },
        metadata: {
          userId: "100",
        },
      };

      return request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: CreateBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          if (responseDataIsBooking(responseBody.data)) {
            expect(responseBody.data.status).toEqual("pending");
            expect(AttendeeRequestEmail.prototype.getHtmlRequestEmail).not.toHaveBeenCalled();
            expect(OrganizerRequestEmail.prototype.getHtmlRequestEmail).not.toHaveBeenCalled();
            createdBookingUid = responseBody.data.uid;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should not send an email when declining a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${createdBookingUid}/decline`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeDeclinedEmail.prototype.getHtml).not.toHaveBeenCalled();
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

  describe("OAuth client managed user bookings - emails enabled", () => {
    let app: INestApplication;
    let unauthenticatedApp: INestApplication;
    let organization: Team;
    let oAuthClient: PlatformOAuthClient;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;

    let user: User;
    let eventTypeId: number;
    let createdBookingUid: string;
    let rescheduledBookingUid: string;

    // Generate email upfront so it's known before module compilation
    const userEmail = `confirm-emails-enabled-2024-08-13-user-${randomString()}@api.com`;

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

      // Create a separate unauthenticated app for attendee reschedule test
      const unauthModuleRef = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
      })
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
        name: `confirm-emails-enabled-2024-08-13-organization-${randomString()}`,
      });

      // Create OAuth client with emails enabled
      oAuthClient = await oauthClientRepositoryFixture.create(
        organization.id,
        {
          logo: "logo-url",
          name: "name",
          redirectUris: ["http://localhost:5555"],
          permissions: 32,
          areEmailsEnabled: true,
        },
        "secret"
      );

      // Create user with the same email used for authentication
      user = await userRepositoryFixture.create({
        email: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `confirm-emails-enabled-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: "peer coding",
          slug: `confirm-emails-enabled-2024-08-13-event-type-${randomString()}`,
          length: 60,
          requiresConfirmation: true,
        },
        user.id
      );
      eventTypeId = event.id;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();

      // Initialize unauthenticated app for attendee reschedule test
      unauthenticatedApp = unauthModuleRef.createNestApplication();
      bootstrap(unauthenticatedApp as NestExpressApplication);
      await unauthenticatedApp.init();
    });

    beforeEach(async () => {
      jest.clearAllMocks();
    });

    describe("confirming booking that requires confirmation and rescheduling it", () => {
      it("should send an email when creating a booking that requires confirmation", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            if (responseDataIsBooking(responseBody.data)) {
              expect(responseBody.data.status).toEqual("pending");
              expect(AttendeeRequestEmail.prototype.getHtmlRequestEmail).toHaveBeenCalled();
              expect(OrganizerRequestEmail.prototype.getHtmlRequestEmail).toHaveBeenCalled();
              createdBookingUid = responseBody.data.uid;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should send an email when confirming a booking", async () => {
        return request(app.getHttpServer())
          .post(`/v2/bookings/${createdBookingUid}/confirm`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
          });
      });

      describe("rescheduling emails", () => {
        it("should send confirmation emails when organizer reschedules a booking that requires confirmation", async () => {
          const body: RescheduleBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 14, 30, 0)).toISOString(),
            rescheduledBy: userEmail,
          };

          return request(app.getHttpServer())
            .post(`/v2/bookings/${createdBookingUid}/reschedule`)
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              if (responseDataIsBooking(responseBody.data)) {
                expect(responseBody.data.status).toEqual("accepted");
                expect(AttendeeRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
                expect(OrganizerRescheduledEmail.prototype.getHtml).toHaveBeenCalled();

                expect(AttendeeRequestEmail.prototype.getHtmlRequestEmail).not.toHaveBeenCalled();
                expect(OrganizerRequestEmail.prototype.getHtmlRequestEmail).not.toHaveBeenCalled();
                rescheduledBookingUid = responseBody.data.uid;
              } else {
                throw new Error(
                  "Invalid response data - expected booking but received array of possibly recurring bookings"
                );
              }
            });
        });

        it("should send requested rescheduling emails when attendee rescheduling a booking that requires confirmation", async () => {
          expect(rescheduledBookingUid).toBeDefined();
          const body: RescheduleBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
          };

          // Use unauthenticated app to simulate attendee reschedule (not authenticated as booking owner)
          return request(unauthenticatedApp.getHttpServer())
            .post(`/v2/bookings/${rescheduledBookingUid}/reschedule`)
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201)
            .then(async (response) => {
              const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              if (responseDataIsBooking(responseBody.data)) {
                expect(responseBody.data.status).toEqual("pending");
                expect(AttendeeRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
                expect(OrganizerRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

                expect(AttendeeRequestEmail.prototype.getHtmlRequestEmail).toHaveBeenCalled();
                expect(OrganizerRequestEmail.prototype.getHtmlRequestEmail).toHaveBeenCalled();
                rescheduledBookingUid = responseBody.data.uid;
              } else {
                throw new Error(
                  "Invalid response data - expected booking but received array of possibly recurring bookings"
                );
              }
            });
        });
      });
    });

    describe("declining booking that requires confirmation", () => {
      it("should send an email when creating a booking that requires confirmation", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
          eventTypeId: eventTypeId,
          attendee: {
            name: "Mr Proper",
            email: "mr_proper@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          location: "https://meet.google.com/abc-def-ghi",
          bookingFieldsResponses: {
            customField: "customValue",
          },
          metadata: {
            userId: "100",
          },
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            if (responseDataIsBooking(responseBody.data)) {
              expect(responseBody.data.status).toEqual("pending");
              expect(AttendeeRequestEmail.prototype.getHtmlRequestEmail).toHaveBeenCalled();
              expect(OrganizerRequestEmail.prototype.getHtmlRequestEmail).toHaveBeenCalled();
              createdBookingUid = responseBody.data.uid;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should send an email when declining a booking", async () => {
        return request(app.getHttpServer())
          .post(`/v2/bookings/${createdBookingUid}/decline`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeDeclinedEmail.prototype.getHtml).toHaveBeenCalled();
          });
      });
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await unauthenticatedApp.close();
      await app.close();
    });
  });
});
