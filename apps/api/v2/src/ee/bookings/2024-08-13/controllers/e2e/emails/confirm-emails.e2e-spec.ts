import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
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
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
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
} from "@calcom/platform-libraries";
import {
  CreateBookingInput_2024_08_13,
  BookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
  GetBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import { CancelBookingInput_2024_08_13 } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

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

  let emailsEnabledSetup: EmailSetup;
  let emailsDisabledSetup: EmailSetup;

  const authEmail = `admin-${Math.floor(Math.random() * 1000)}@example.com`;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      authEmail,
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

    organization = await teamRepositoryFixture.create({ name: "organization bookings" });

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

    const user = await userRepositoryFixture.create({
      email: `alice-${Math.floor(Math.random() * 1000)}@gmail.com`,
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsEnabled.id,
        },
      },
    });

    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: "working time",
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(user.id, userSchedule);

    const event = await eventTypesRepositoryFixture.create(
      { title: "peer coding", slug: "peer-coding", length: 60, requiresConfirmation: true },
      user.id
    );

    emailsEnabledSetup = {
      user,
      eventTypeId: event.id,
      createdBookingUid: "",
      rescheduledBookingUid: "",
    };
  }

  async function setupDisabledEmails() {
    const oAuthClientEmailsDisabled = await createOAuthClient(organization.id, false);

    const user = await userRepositoryFixture.create({
      email: `bob-${Math.floor(Math.random() * 1000)}@gmail.com`,
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsDisabled.id,
        },
      },
    });
    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: "working time",
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(user.id, userSchedule);
    const event = await eventTypesRepositoryFixture.create(
      { title: "peer coding", slug: "peer-coding", length: 60, requiresConfirmation: true },
      user.id
    );

    emailsDisabledSetup = {
      user,
      eventTypeId: event.id,
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
              "Invalid response data - expected booking but received array of possibily recurring bookings"
            );
          }
        });
    });

    it("should not send an email when confirming a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.createdBookingUid}/confirm`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailsDisabledSetup.rescheduledBookingUid = responseBody.data.uid;
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
              "Invalid response data - expected booking but received array of possibily recurring bookings"
            );
          }
        });
    });

    it("should not send an email when declining a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.createdBookingUid}/decline`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeDeclinedEmail.prototype.getHtml).not.toHaveBeenCalled();

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailsDisabledSetup.rescheduledBookingUid = responseBody.data.uid;
        });
    });
  });

  describe("OAuth client managed user bookings - emails enabled", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });

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
              "Invalid response data - expected booking but received array of possibily recurring bookings"
            );
          }
        });
    });

    it("should send an email when confirming a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsEnabledSetup.createdBookingUid}/confirm`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
          expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailsEnabledSetup.rescheduledBookingUid = responseBody.data.uid;
        });
    });

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
              "Invalid response data - expected booking but received array of possibily recurring bookings"
            );
          }
        });
    });

    it("should send an email when declining a booking", async () => {
      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsEnabledSetup.createdBookingUid}/decline`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: GetBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();
          expect(AttendeeDeclinedEmail.prototype.getHtml).toHaveBeenCalled();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          emailsEnabledSetup.rescheduledBookingUid = responseBody.data.uid;
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
