import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  AttendeeCancelledEmail,
  AttendeeDeclinedEmail,
  AttendeeRequestEmail,
  AttendeeRescheduledEmail,
  AttendeeScheduledEmail,
  OrganizerCancelledEmail,
  OrganizerRequestEmail,
  OrganizerRescheduledEmail,
  OrganizerScheduledEmail,
} from "@calcom/platform-libraries/emails";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { TokensRepositoryFixture } from "test/fixtures/repository/tokens.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

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

type EmailSetup = {
  user: User;
  eventTypeId: number;
  createdBookingUid: string;
  rescheduledBookingUid: string;
  accessToken: string;
};

describe("Bookings Endpoints 2024-08-13 confirm emails", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let tokensRepositoryFixture: TokensRepositoryFixture;

  let emailsEnabledSetup: EmailSetup;
  let emailsDisabledSetup: EmailSetup;

  const authEmail = `confirm-emails-2024-08-13-admin-${randomString()}@api.com`;
  let userEmailsEnabled = "";
  const userEmailsDisabled = `confirm-emails-2024-08-13-user-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
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
    tokensRepositoryFixture = new TokensRepositoryFixture(moduleRef);

    organization = await teamRepositoryFixture.create({
      name: `confirm-emails-2024-08-13-organization-${randomString()}`,
    });

    await setupEnabledEmails();
    await setupDisabledEmails();

    await userRepositoryFixture.create({
      email: authEmail,
      organization: {
        connect: {
          id: organization.id,
        },
      },
      role: "ADMIN",
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupEnabledEmails() {
    const oAuthClientEmailsEnabled = await createOAuthClient(organization.id, true);

    userEmailsEnabled = `confirm-emails-2024-08-13-user-${randomString()}+${
      oAuthClientEmailsEnabled.id
    }@api.com`;

    const user = await userRepositoryFixture.create({
      email: userEmailsEnabled,
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsEnabled.id,
        },
      },
    });

    const tokens = await tokensRepositoryFixture.createTokens(user.id, oAuthClientEmailsEnabled.id);

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `confirm-emails-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(user.id, userSchedule);

    const event = await eventTypesRepositoryFixture.create(
      {
        title: "peer coding",
        slug: `confirm-emails-2024-08-13-event-type-${randomString()}`,
        length: 60,
        requiresConfirmation: true,
      },
      user.id
    );

    emailsEnabledSetup = {
      user,
      eventTypeId: event.id,
      createdBookingUid: "",
      rescheduledBookingUid: "",
      accessToken: tokens.accessToken,
    };
  }

  async function setupDisabledEmails() {
    const oAuthClientEmailsDisabled = await createOAuthClient(organization.id, false);

    const user = await userRepositoryFixture.create({
      email: userEmailsDisabled,
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsDisabled.id,
        },
      },
    });
    const tokens = await tokensRepositoryFixture.createTokens(user.id, oAuthClientEmailsDisabled.id);

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `confirm-emails-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(user.id, userSchedule);
    const event = await eventTypesRepositoryFixture.create(
      {
        title: "peer coding",
        slug: `confirm-emails-2024-08-13-event-type-${randomString()}`,
        length: 60,
        requiresConfirmation: true,
      },
      user.id
    );

    emailsDisabledSetup = {
      user,
      eventTypeId: event.id,
      createdBookingUid: "",
      rescheduledBookingUid: "",
      accessToken: tokens.accessToken,
    };
  }

  async function createOAuthClient(organizationId: number, emailsEnabled: boolean) {
    const data = {
      logo: "logo-url",
      name: "name",
      redirectUris: ["http://localhost:5555"],
      permissions: 32,
      areEmailsEnabled: emailsEnabled,
    };
    const secret = "secret";

    const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
    return client;
  }

  describe("OAuth client managed user bookings - emails disabled", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });

    it("should not send an email when creating a booking that requires confirmation", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: emailsDisabledSetup.eventTypeId,
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
            emailsDisabledSetup.createdBookingUid = responseBody.data.uid;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should not send an email when confirming a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.createdBookingUid}/confirm`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${emailsDisabledSetup.accessToken}`)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
        });
    });

    it("should not send an email when creating a booking that requires confirmation", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
        eventTypeId: emailsDisabledSetup.eventTypeId,
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
            emailsDisabledSetup.createdBookingUid = responseBody.data.uid;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should not send an email when declining a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.createdBookingUid}/decline`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .set("Authorization", `Bearer ${emailsDisabledSetup.accessToken}`)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeDeclinedEmail.prototype.getHtml).not.toHaveBeenCalled();
        });
    });
  });

  describe("OAuth client managed user bookings - emails enabled", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });

    describe("confirming booking that requires confirmation and rescheduling it", () => {
      it("should send an email when creating a booking that requires confirmation", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: emailsEnabledSetup.eventTypeId,
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
              emailsEnabledSetup.createdBookingUid = responseBody.data.uid;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should send an email when confirming a booking", async () => {
        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.createdBookingUid}/confirm`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${emailsEnabledSetup.accessToken}`)
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
            rescheduledBy: userEmailsEnabled,
          };

          return request(app.getHttpServer())
            .post(`/v2/bookings/${emailsEnabledSetup.createdBookingUid}/reschedule`)
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
                emailsEnabledSetup.rescheduledBookingUid = responseBody.data.uid;
              } else {
                throw new Error(
                  "Invalid response data - expected booking but received array of possibly recurring bookings"
                );
              }
            });
        });

        it("should send requested rescheduling emails when attendee rescheduling a booking that requires confirmation", async () => {
          const body: RescheduleBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
          };

          return request(app.getHttpServer())
            .post(`/v2/bookings/${emailsEnabledSetup.rescheduledBookingUid}/reschedule`)
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
                emailsEnabledSetup.rescheduledBookingUid = responseBody.data.uid;
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
          eventTypeId: emailsEnabledSetup.eventTypeId,
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
              emailsEnabledSetup.createdBookingUid = responseBody.data.uid;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should send an email when declining a booking", async () => {
        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.createdBookingUid}/decline`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set("Authorization", `Bearer ${emailsEnabledSetup.accessToken}`)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeDeclinedEmail.prototype.getHtml).toHaveBeenCalled();
          });
      });
    });
  });

  afterAll(async () => {
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(emailsEnabledSetup.user.email);
    await userRepositoryFixture.deleteByEmail(emailsDisabledSetup.user.email);
    await userRepositoryFixture.deleteByEmail(authEmail);
    await bookingsRepositoryFixture.deleteAllBookings(
      emailsEnabledSetup.user.id,
      emailsEnabledSetup.user.email
    );
    await bookingsRepositoryFixture.deleteAllBookings(
      emailsDisabledSetup.user.id,
      emailsDisabledSetup.user.email
    );
    await app.close();
  });

  function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
  }
});
