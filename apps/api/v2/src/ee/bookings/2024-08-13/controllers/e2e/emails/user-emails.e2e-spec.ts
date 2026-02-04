import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  AttendeeCancelledEmail,
  AttendeeRescheduledEmail,
  AttendeeScheduledEmail,
  OrganizerCancelledEmail,
  OrganizerRescheduledEmail,
  OrganizerScheduledEmail,
} from "@calcom/platform-libraries/emails";
import type {
  BookingOutput_2024_08_13,
  CancelBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
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
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CancelBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/cancel-booking.output";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { RescheduleBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reschedule-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
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

type EmailSetup = {
  user: User;
  eventTypeId: number;
  recurringEventTypeId: number;
  createdBookingUid: string;
  rescheduledBookingUid: string;
};

describe("Bookings Endpoints 2024-08-13 user emails", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;

  let emailsEnabledSetup: EmailSetup;
  let emailsDisabledSetup: EmailSetup;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(ApiAuthGuard)
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
      name: `user-emails-2024-08-13-organization-${randomString()}`,
    });

    await setupEnabledEmails();
    await setupDisabledEmails();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupEnabledEmails() {
    const oAuthClientEmailsEnabled = await createOAuthClient(organization.id, true);

    const user = await userRepositoryFixture.create({
      email: `user-emails-2024-08-13-user-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsEnabled.id,
        },
      },
    });

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `user-emails-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(user.id, userSchedule);

    const event = await eventTypesRepositoryFixture.create(
      {
        title: `user-emails-2024-08-13-event-type-${randomString()}`,
        slug: `user-emails-2024-08-13-event-type-${randomString()}`,
        length: 60,
      },
      user.id
    );

    const recurringEvent = await eventTypesRepositoryFixture.create(
      // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
      {
        title: `user-emails-2024-08-13-recurring-event-type-${randomString()}`,
        slug: `user-emails-2024-08-13-recurring-event-type-${randomString()}`,
        length: 60,
        recurringEvent: { freq: 2, count: 3, interval: 1 },
      },
      user.id
    );

    emailsEnabledSetup = {
      user,
      eventTypeId: event.id,
      recurringEventTypeId: recurringEvent.id,
      createdBookingUid: "",
      rescheduledBookingUid: "",
    };
  }

  async function setupDisabledEmails() {
    const oAuthClientEmailsDisabled = await createOAuthClient(organization.id, false);

    const user = await userRepositoryFixture.create({
      email: `user-emails-2024-08-13-user-${randomString()}@api.com`,
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsDisabled.id,
        },
      },
    });
    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `user-emails-2024-08-13-schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(user.id, userSchedule);
    const event = await eventTypesRepositoryFixture.create(
      {
        title: `user-emails-2024-08-13-event-type-${randomString()}`,
        slug: `user-emails-2024-08-13-event-type-${randomString()}`,
        length: 60,
      },
      user.id
    );

    const recurringEvent = await eventTypesRepositoryFixture.create(
      // note(Lauris): freq 2 means weekly, interval 1 means every week and count 3 means 3 weeks in a row
      {
        title: `user-emails-2024-08-13-recurring-event-type-${randomString()}`,
        slug: `user-emails-2024-08-13-recurring-event-type-${randomString()}`,
        length: 60,
        recurringEvent: { freq: 2, count: 3, interval: 1 },
      },
      user.id
    );

    emailsDisabledSetup = {
      user,
      eventTypeId: event.id,
      recurringEventTypeId: recurringEvent.id,
      createdBookingUid: "",
      rescheduledBookingUid: "",
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

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("OAuth client managed user bookings - emails disabled", () => {
    it("should not send an email when creating a booking", async () => {
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
            expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            emailsDisabledSetup.createdBookingUid = responseBody.data.uid;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should not send an email when creating a recurring booking", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
        eventTypeId: emailsDisabledSetup.recurringEventTypeId,
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
          if (responseDataIsRecurringBooking(responseBody.data)) {
            expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          } else {
            throw new Error("Invalid response data - expected booking array but received single booking");
          }
        });
    });

    it("should not send an email when rescheduling a booking", async () => {
      const body: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 14, 0, 0)).toISOString(),
        reschedulingReason: "Flying to mars that day",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.createdBookingUid}/reschedule`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(AttendeeRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          emailsDisabledSetup.rescheduledBookingUid = responseBody.data.uid;
        });
    });

    it("should not send an email when cancelling a booking", async () => {
      const body: CancelBookingInput_2024_08_13 = {
        cancellationReason: "Going on a vacation",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.rescheduledBookingUid}/cancel`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: CancelBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
        });
    });
  });

  describe("OAuth client managed user bookings - emails enabled", () => {
    it("should send an email when creating a booking", async () => {
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
            const data: BookingOutput_2024_08_13 = responseBody.data;
            expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            emailsEnabledSetup.createdBookingUid = data.uid;
          } else {
            throw new Error(
              "Invalid response data - expected booking but received array of possibly recurring bookings"
            );
          }
        });
    });

    it("should send an email when creating a recurring booking", async () => {
      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
        eventTypeId: emailsEnabledSetup.recurringEventTypeId,
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
          if (responseDataIsRecurringBooking(responseBody.data)) {
            expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
          } else {
            throw new Error("Invalid response data - expected booking array but received single booking");
          }
        });
    });

    it("should send an email when rescheduling a booking", async () => {
      const body: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 14, 0, 0)).toISOString(),
        reschedulingReason: "Flying to mars that day",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsEnabledSetup.createdBookingUid}/reschedule`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201)
        .then(async (response) => {
          const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

          expect(AttendeeRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
          expect(OrganizerRescheduledEmail.prototype.getHtml).toHaveBeenCalled();

          emailsEnabledSetup.rescheduledBookingUid = responseBody.data.uid;
        });
    });

    it("should send an email when cancelling a booking", async () => {
      const body: CancelBookingInput_2024_08_13 = {
        cancellationReason: "Going on a vacation",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsEnabledSetup.rescheduledBookingUid}/cancel`)
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: CancelBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeCancelledEmail.prototype.getHtml).toHaveBeenCalled();
          expect(OrganizerCancelledEmail.prototype.getHtml).toHaveBeenCalled();
        });
    });
  });

  afterAll(async () => {
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(emailsEnabledSetup.user.email);
    await userRepositoryFixture.deleteByEmail(emailsDisabledSetup.user.email);
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

  function responseDataIsRecurringBooking(data: any): data is RecurringBookingOutput_2024_08_13[] {
    return Array.isArray(data);
  }
});
