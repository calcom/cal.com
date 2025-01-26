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
import { createParamDecorator, INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { User } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
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
  OrganizerReassignedEmail,
  AttendeeUpdatedEmail,
} from "@calcom/platform-libraries";
import {
  CreateBookingInput_2024_08_13,
  BookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
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
  .spyOn(OrganizerReassignedEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));
jest
  .spyOn(AttendeeUpdatedEmail.prototype, "getHtml")
  .mockImplementation(() => Promise.resolve("<p>email</p>"));

type EmailSetup = {
  team: Team;
  member1: User;
  member2: User;
  collectiveEventType: {
    id: number;
    createdBookingUid: string;
    rescheduledBookingUid: string;
  };
  roundRobinEventType: {
    id: number;
    createdBookingUid: string;
    rescheduledBookingUid: string;
    currentHostId: number;
  };
};

describe("Bookings Endpoints 2024-08-13 team emails", () => {
  let app: INestApplication;
  let organization: Team;

  let userRepositoryFixture: UserRepositoryFixture;
  let bookingsRepositoryFixture: BookingsRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let hostsRepositoryFixture: HostsRepositoryFixture;

  let emailsEnabledSetup: EmailSetup;
  let emailsDisabledSetup: EmailSetup;

  const authEmail = "admin@example.com";

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
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
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
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  async function setupEnabledEmails() {
    const oAuthClientEmailsEnabled = await createOAuthClient(organization.id, true);

    const team = await teamRepositoryFixture.create({
      name: "team 1",
      isOrganization: false,
      parent: { connect: { id: organization.id } },
      createdByOAuthClient: {
        connect: {
          id: oAuthClientEmailsEnabled.id,
        },
      },
    });

    const member1 = await userRepositoryFixture.create({
      email: "alice@gmail.com",
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsEnabled.id,
        },
      },
    });

    const member2 = await userRepositoryFixture.create({
      email: "bob@gmail.com",
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
    await schedulesService.createUserSchedule(member1.id, userSchedule);
    await schedulesService.createUserSchedule(member2.id, userSchedule);

    await profileRepositoryFixture.create({
      uid: `usr-${member1.id}`,
      username: member1.email,
      organization: {
        connect: {
          id: organization.id,
        },
      },
      user: {
        connect: {
          id: member1.id,
        },
      },
    });

    await profileRepositoryFixture.create({
      uid: `usr-${member2.id}`,
      username: member2.email,
      organization: {
        connect: {
          id: organization.id,
        },
      },
      user: {
        connect: {
          id: member2.id,
        },
      },
    });

    await membershipsRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: member1.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    await membershipsRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: member2.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    const collectiveEvent = await eventTypesRepositoryFixture.createTeamEventType({
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
    });

    await hostsRepositoryFixture.create({
      isFixed: true,
      user: {
        connect: {
          id: member1.id,
        },
      },
      eventType: {
        connect: {
          id: collectiveEvent.id,
        },
      },
    });

    await hostsRepositoryFixture.create({
      isFixed: true,
      user: {
        connect: {
          id: member2.id,
        },
      },
      eventType: {
        connect: {
          id: collectiveEvent.id,
        },
      },
    });

    const roundRobinEvent = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: "ROUND_ROBIN",
      team: {
        connect: { id: team.id },
      },
      title: "Round Robin Event Type",
      slug: "round-robin-event-type",
      length: 60,
      assignAllTeamMembers: false,
      bookingFields: [],
      locations: [],
    });

    await hostsRepositoryFixture.create({
      isFixed: false,
      user: {
        connect: {
          id: member1.id,
        },
      },
      eventType: {
        connect: {
          id: roundRobinEvent.id,
        },
      },
    });

    await hostsRepositoryFixture.create({
      isFixed: false,
      user: {
        connect: {
          id: member2.id,
        },
      },
      eventType: {
        connect: {
          id: roundRobinEvent.id,
        },
      },
    });

    emailsEnabledSetup = {
      team,
      member1: member1,
      member2: member2,
      collectiveEventType: {
        id: collectiveEvent.id,
        createdBookingUid: "",
        rescheduledBookingUid: "",
      },
      roundRobinEventType: {
        id: roundRobinEvent.id,
        createdBookingUid: "",
        rescheduledBookingUid: "",
        currentHostId: 0,
      },
    };
  }

  async function setupDisabledEmails() {
    const oAuthClientEmailsDisabled = await createOAuthClient(organization.id, false);

    const team = await teamRepositoryFixture.create({
      name: "team 2",
      isOrganization: false,
      parent: { connect: { id: organization.id } },
      createdByOAuthClient: {
        connect: {
          id: oAuthClientEmailsDisabled.id,
        },
      },
    });

    const member1 = await userRepositoryFixture.create({
      email: "charlie@gmail.com",
      platformOAuthClients: {
        connect: {
          id: oAuthClientEmailsDisabled.id,
        },
      },
    });

    const member2 = await userRepositoryFixture.create({
      email: "dean@gmail.com",
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
    await schedulesService.createUserSchedule(member1.id, userSchedule);
    await schedulesService.createUserSchedule(member2.id, userSchedule);

    await profileRepositoryFixture.create({
      uid: `usr-${member1.id}`,
      username: member1.email,
      organization: {
        connect: {
          id: organization.id,
        },
      },
      user: {
        connect: {
          id: member1.id,
        },
      },
    });

    await profileRepositoryFixture.create({
      uid: `usr-${member2.id}`,
      username: member2.email,
      organization: {
        connect: {
          id: organization.id,
        },
      },
      user: {
        connect: {
          id: member2.id,
        },
      },
    });

    await membershipsRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: member1.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    await membershipsRepositoryFixture.create({
      role: "MEMBER",
      user: { connect: { id: member2.id } },
      team: { connect: { id: team.id } },
      accepted: true,
    });

    const collectiveEvent = await eventTypesRepositoryFixture.createTeamEventType({
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
    });

    await hostsRepositoryFixture.create({
      isFixed: true,
      user: {
        connect: {
          id: member1.id,
        },
      },
      eventType: {
        connect: {
          id: collectiveEvent.id,
        },
      },
    });

    await hostsRepositoryFixture.create({
      isFixed: true,
      user: {
        connect: {
          id: member2.id,
        },
      },
      eventType: {
        connect: {
          id: collectiveEvent.id,
        },
      },
    });

    const roundRobinEvent = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: "ROUND_ROBIN",
      team: {
        connect: { id: team.id },
      },
      title: "Round Robin Event Type",
      slug: "round-robin-event-type",
      length: 60,
      assignAllTeamMembers: false,
      bookingFields: [],
      locations: [],
    });

    await hostsRepositoryFixture.create({
      isFixed: false,
      user: {
        connect: {
          id: member1.id,
        },
      },
      eventType: {
        connect: {
          id: roundRobinEvent.id,
        },
      },
    });

    await hostsRepositoryFixture.create({
      isFixed: false,
      user: {
        connect: {
          id: member2.id,
        },
      },
      eventType: {
        connect: {
          id: roundRobinEvent.id,
        },
      },
    });

    emailsDisabledSetup = {
      team,
      member1: member1,
      member2: member2,
      collectiveEventType: {
        id: collectiveEvent.id,
        createdBookingUid: "",
        rescheduledBookingUid: "",
      },
      roundRobinEventType: {
        id: roundRobinEvent.id,
        createdBookingUid: "",
        rescheduledBookingUid: "",
        currentHostId: 0,
      },
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

  describe("OAuth client team bookings - emails disabled", () => {
    describe("book", () => {
      it("should not send an email when booking collective event", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
          eventTypeId: emailsDisabledSetup.collectiveEventType.id,
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
              emailsDisabledSetup.collectiveEventType.createdBookingUid = responseBody.data.uid;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
      });

      it("should not send an email when booking round robin event", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
          eventTypeId: emailsDisabledSetup.roundRobinEventType.id,
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
              emailsDisabledSetup.roundRobinEventType.createdBookingUid = responseBody.data.uid;
              emailsDisabledSetup.roundRobinEventType.currentHostId = responseBody.data.hosts[0].id;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
      });
    });

    describe("reschedule", () => {
      it("should not send an email when rescheduling collective booking", async () => {
        const body: RescheduleBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2035, 0, 8, 11, 0, 0)).toISOString(),
          reschedulingReason: "Flying to mars that day",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsDisabledSetup.collectiveEventType.createdBookingUid}/reschedule`)
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
            emailsDisabledSetup.collectiveEventType.rescheduledBookingUid = responseBody.data.uid;
          });
      });

      it("should not send an email when rescheduling round robin booking", async () => {
        const body: RescheduleBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2035, 0, 8, 12, 0, 0)).toISOString(),
          reschedulingReason: "Flying to mars that day",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsDisabledSetup.roundRobinEventType.createdBookingUid}/reschedule`)
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
            emailsDisabledSetup.roundRobinEventType.rescheduledBookingUid = responseBody.data.uid;
            emailsDisabledSetup.roundRobinEventType.currentHostId = responseBody.data.hosts[0].id;
          });
      });
    });

    describe("reassign", () => {
      it("should not send an email when manually reassigning round robin booking", async () => {
        const reassignToId =
          emailsDisabledSetup.roundRobinEventType.currentHostId === emailsDisabledSetup.member1.id
            ? emailsDisabledSetup.member2.id
            : emailsDisabledSetup.member1.id;

        return request(app.getHttpServer())
          .post(
            `/v2/bookings/${emailsDisabledSetup.roundRobinEventType.rescheduledBookingUid}/reassign/${reassignToId}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: CancelBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(AttendeeUpdatedEmail.prototype.getHtml).not.toHaveBeenCalled();
            emailsDisabledSetup.roundRobinEventType.currentHostId = reassignToId;
          });
      });

      it("should not send an email when automatically reassigning round robin booking", async () => {
        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsDisabledSetup.roundRobinEventType.rescheduledBookingUid}/reassign`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: CancelBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerReassignedEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(AttendeeUpdatedEmail.prototype.getHtml).not.toHaveBeenCalled();
          });
      });
    });

    describe("cancel", () => {
      it("should not send an email when cancelling a collective booking", async () => {
        const body: CancelBookingInput_2024_08_13 = {
          cancellationReason: "Going on a vacation",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsDisabledSetup.collectiveEventType.rescheduledBookingUid}/cancel`)
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

    it("should not send an email when cancelling a round robin booking", async () => {
      const body: CancelBookingInput_2024_08_13 = {
        cancellationReason: "Going on a vacation",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${emailsDisabledSetup.roundRobinEventType.rescheduledBookingUid}/cancel`)
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

  describe("OAuth client team bookings - emails enabled", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
    });

    describe("book", () => {
      it("should send an email when booking collective event", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
          eventTypeId: emailsEnabledSetup.collectiveEventType.id,
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
              expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
              expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
              emailsEnabledSetup.collectiveEventType.createdBookingUid = responseBody.data.uid;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
      });

      it("should send an email when booking round robin event", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
          eventTypeId: emailsEnabledSetup.roundRobinEventType.id,
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
              expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
              expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
              emailsEnabledSetup.roundRobinEventType.createdBookingUid = responseBody.data.uid;
              emailsEnabledSetup.roundRobinEventType.currentHostId = responseBody.data.hosts[0].id;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibily recurring bookings"
              );
            }
          });
      });
    });

    describe("reschedule", () => {
      it("should send an email when rescheduling collective booking", async () => {
        const body: RescheduleBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2035, 0, 8, 11, 0, 0)).toISOString(),
          reschedulingReason: "Flying to mars that day",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.collectiveEventType.createdBookingUid}/reschedule`)
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
            emailsEnabledSetup.collectiveEventType.rescheduledBookingUid = responseBody.data.uid;
          });
      });

      it("should send an email when rescheduling round robin booking", async () => {
        const body: RescheduleBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2035, 0, 8, 12, 0, 0)).toISOString(),
          reschedulingReason: "Flying to mars that day",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.roundRobinEventType.createdBookingUid}/reschedule`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(AttendeeRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

            expect(OrganizerRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerCancelledEmail.prototype.getHtml).toHaveBeenCalled();
            emailsEnabledSetup.roundRobinEventType.rescheduledBookingUid = responseBody.data.uid;
            emailsEnabledSetup.roundRobinEventType.currentHostId = responseBody.data.hosts[0].id;
          });
      });
    });

    describe("reassign", () => {
      it("should send an email when manually reassigning round robin booking", async () => {
        const reassignToId =
          emailsEnabledSetup.roundRobinEventType.currentHostId === emailsEnabledSetup.member1.id
            ? emailsEnabledSetup.member2.id
            : emailsEnabledSetup.member1.id;

        return request(app.getHttpServer())
          .post(
            `/v2/bookings/${emailsEnabledSetup.roundRobinEventType.rescheduledBookingUid}/reassign/${reassignToId}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: CancelBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(AttendeeUpdatedEmail.prototype.getHtml).toHaveBeenCalled();
            emailsDisabledSetup.roundRobinEventType.currentHostId = reassignToId;
          });
      });

      it("should send an email when automatically reassigning round robin booking", async () => {
        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.roundRobinEventType.rescheduledBookingUid}/reassign`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: CancelBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
            expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
            expect(OrganizerReassignedEmail.prototype.getHtml).toHaveBeenCalled();
            expect(AttendeeUpdatedEmail.prototype.getHtml).toHaveBeenCalled();
          });
      });
    });

    describe("cancel", () => {
      it("should send an email when cancelling a collective booking", async () => {
        const body: CancelBookingInput_2024_08_13 = {
          cancellationReason: "Going on a vacation",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.collectiveEventType.rescheduledBookingUid}/cancel`)
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

      it("should send an email when cancelling round robin booking", async () => {
        const body: CancelBookingInput_2024_08_13 = {
          cancellationReason: "Going on a vacation",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${emailsEnabledSetup.roundRobinEventType.rescheduledBookingUid}/cancel`)
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
  });
  afterAll(async () => {
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(emailsEnabledSetup.member1.email);
    await userRepositoryFixture.deleteByEmail(emailsDisabledSetup.member1.email);
    await bookingsRepositoryFixture.deleteAllBookings(
      emailsEnabledSetup.member1.id,
      emailsEnabledSetup.member1.email
    );
    await bookingsRepositoryFixture.deleteAllBookings(
      emailsDisabledSetup.member1.id,
      emailsDisabledSetup.member1.email
    );
    await app.close();
  });

  function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
    return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
  }
});
