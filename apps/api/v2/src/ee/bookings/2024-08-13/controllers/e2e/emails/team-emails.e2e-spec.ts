import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import {
  AttendeeCancelledEmail,
  AttendeeRescheduledEmail,
  AttendeeScheduledEmail,
  AttendeeUpdatedEmail,
  OrganizerCancelledEmail,
  OrganizerReassignedEmail,
  OrganizerRescheduledEmail,
  OrganizerScheduledEmail,
} from "@calcom/platform-libraries/emails";
import type {
  BookingOutput_2024_08_13,
  CancelBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
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

// Mock all email sending prototypes
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

// Type definitions for test setup data
type EmailSetup = {
  team: Team;
  member1: User;
  member2: User;
  member1ApiKey: string;
  collectiveEventType: { id: number };
  roundRobinEventType: { id: number };
};

describe("Bookings Endpoints 2024-08-13 team emails", () => {
  let app: INestApplication;
  let organization: Team;

  // Fixtures for database interactions
  let userRepositoryFixture: UserRepositoryFixture;
  let schedulesService: SchedulesService_2024_04_15;
  let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
  let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
  let teamRepositoryFixture: TeamRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;
  let hostsRepositoryFixture: HostsRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;

  // Setup data for tests
  let emailsEnabledSetup: EmailSetup;
  let emailsDisabledSetup: EmailSetup;

  // Utility function to check response data type
  const responseDataIsBooking = (data: unknown): data is BookingOutput_2024_08_13 => {
    return !Array.isArray(data) && data !== null && typeof data === "object" && data && "id" in data;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    // Initialize fixtures and services
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
    oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
    teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
    hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

    // Create a base organization for all tests
    organization = await teamRepositoryFixture.create({ name: `team-emails-organization-${randomString()}` });

    // Set up two distinct environments: one with emails enabled, one disabled
    emailsEnabledSetup = await setupTestEnvironment(true);
    emailsDisabledSetup = await setupTestEnvironment(false);

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  // Helper function to create a complete test environment
  async function setupTestEnvironment(emailsEnabled: boolean): Promise<EmailSetup> {
    const oAuthClient = await createOAuthClient(organization.id, emailsEnabled);
    const team = await teamRepositoryFixture.create({
      name: `team-emails-team-${randomString()}`,
      parent: { connect: { id: organization.id } },
      createdByOAuthClient: { connect: { id: oAuthClient.id } },
    });

    const [member1, member2] = await Promise.all([
      createTeamMember(oAuthClient.id),
      createTeamMember(oAuthClient.id),
    ]);

    await Promise.all([
      membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: member1.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      }),
      membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: member2.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      }),
    ]);

    const collectiveEvent = await createEventType("COLLECTIVE", team.id, [member1.id, member2.id]);
    const roundRobinEvent = await createEventType("ROUND_ROBIN", team.id, [member1.id, member2.id]);

    // Create API key for member1 to use in authorized tests
    const { keyString } = await apiKeysRepositoryFixture.createApiKey(member1.id, null);
    const member1ApiKey = `cal_test_${keyString}`;

    return {
      team,
      member1,
      member2,
      member1ApiKey,
      collectiveEventType: { id: collectiveEvent.id },
      roundRobinEventType: { id: roundRobinEvent.id },
    };
  }

  // Helper to create a user and their profile/schedule
  async function createTeamMember(oauthClientId: string) {
    const member = await userRepositoryFixture.create({
      email: `team-emails-member-${randomString()}@api.com`,
      platformOAuthClients: { connect: { id: oauthClientId } },
    });
    const userSchedule: CreateScheduleInput_2024_04_15 = {
      name: `schedule-${randomString()}`,
      timeZone: "Europe/Rome",
      isDefault: true,
    };
    await schedulesService.createUserSchedule(member.id, userSchedule);
    await profileRepositoryFixture.create({
      uid: `usr-${member.id}`,
      username: member.email,
      organization: { connect: { id: organization.id } },
      user: { connect: { id: member.id } },
    });
    return member;
  }

  // Helper to create an event type and assign hosts
  async function createEventType(type: "COLLECTIVE" | "ROUND_ROBIN", teamId: number, hostIds: number[]) {
    const eventType = await eventTypesRepositoryFixture.createTeamEventType({
      schedulingType: type,
      team: { connect: { id: teamId } },
      title: `event-type-${randomString()}`,
      slug: `event-type-${randomString()}`,
      length: 60,
      assignAllTeamMembers: type === "COLLECTIVE",
      locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
    });
    await Promise.all(
      hostIds.map((userId) =>
        hostsRepositoryFixture.create({
          isFixed: type === "COLLECTIVE",
          user: { connect: { id: userId } },
          eventType: { connect: { id: eventType.id } },
        })
      )
    );
    return eventType;
  }

  // Helper to create an OAuth client
  async function createOAuthClient(organizationId: number, emailsEnabled: boolean) {
    return oauthClientRepositoryFixture.create(
      organizationId,
      {
        logo: "logo-url",
        name: "name",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
        areEmailsEnabled: emailsEnabled,
      },
      "secret"
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("OAuth client team bookings - emails disabled", () => {
    it("should handle the full booking lifecycle for a collective event without sending emails", async () => {
      // --- 1. Book Event ---
      const createBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
        eventTypeId: emailsDisabledSetup.collectiveEventType.id,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
      };
      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(createResponse.status).toBe(201);
      const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
      expect(createResponseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseDataIsBooking(createResponseBody.data)).toBe(true);
      const bookingUid = (createResponseBody.data as BookingOutput_2024_08_13).uid;

      expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

      // --- 2. Reschedule Event ---
      const rescheduleBody: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 11, 0, 0)).toISOString(),
        reschedulingReason: "Flying to mars that day",
      };
      const rescheduleResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reschedule`)
        .send(rescheduleBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(rescheduleResponse.status).toBe(201);
      const rescheduleResponseBody: RescheduleBookingOutput_2024_08_13 = rescheduleResponse.body;
      expect(rescheduleResponseBody.status).toEqual(SUCCESS_STATUS);
      const rescheduledBookingUid = rescheduleResponseBody.data.uid;

      expect(AttendeeRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(OrganizerRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

      // --- 3. Cancel Event ---
      const cancelBody: CancelBookingInput_2024_08_13 = { cancellationReason: "Going on a vacation" };
      const cancelResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/cancel`)
        .send(cancelBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.status).toEqual(SUCCESS_STATUS);
      expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(OrganizerCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
    });

    it("should handle the full booking lifecycle for a round-robin event without sending emails", async () => {
      // --- 1. Book Event ---
      const createBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
        eventTypeId: emailsDisabledSetup.roundRobinEventType.id,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
      };
      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(createResponse.status).toBe(201);
      const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
      expect(responseDataIsBooking(createResponseBody.data)).toBe(true);
      const bookingUid = (createResponseBody.data as BookingOutput_2024_08_13).uid;
      let currentHostId = (createResponseBody.data as BookingOutput_2024_08_13).hosts[0].id;
      expect(AttendeeScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(OrganizerScheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

      // --- 2. Reschedule Event ---
      const rescheduleBody: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 12, 0, 0)).toISOString(),
      };
      const rescheduleResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reschedule`)
        .send(rescheduleBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(rescheduleResponse.status).toBe(201);
      const rescheduleResponseBody: RescheduleBookingOutput_2024_08_13 = rescheduleResponse.body;
      const rescheduledBookingUid = rescheduleResponseBody.data.uid;
      currentHostId = rescheduleResponseBody.data.hosts[0].id;
      expect(AttendeeRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(OrganizerRescheduledEmail.prototype.getHtml).not.toHaveBeenCalled();

      // --- 3. Manual Reassign ---
      const reassignToId =
        currentHostId === emailsDisabledSetup.member1.id
          ? emailsDisabledSetup.member2.id
          : emailsDisabledSetup.member1.id;
      const manualReassignResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/reassign/${reassignToId}`)
        .set("Authorization", `Bearer ${emailsDisabledSetup.member1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(manualReassignResponse.status).toBe(200);
      expect(AttendeeUpdatedEmail.prototype.getHtml).not.toHaveBeenCalled();

      // --- 4. Automatic Reassign ---
      const autoReassignResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/reassign`)
        .set("Authorization", `Bearer ${emailsDisabledSetup.member1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(autoReassignResponse.status).toBe(200);
      expect(OrganizerReassignedEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(AttendeeUpdatedEmail.prototype.getHtml).not.toHaveBeenCalled();

      // --- 5. Cancel Event ---
      const cancelBody: CancelBookingInput_2024_08_13 = { cancellationReason: "Vacation" };
      const cancelResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/cancel`)
        .send(cancelBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(cancelResponse.status).toBe(200);
      expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
      expect(OrganizerCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
    });
  });

  describe("OAuth client team bookings - emails enabled", () => {
    it("should handle the full booking lifecycle for a collective event and send emails", async () => {
      // --- 1. Book Event ---
      const createBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
        eventTypeId: emailsEnabledSetup.collectiveEventType.id,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
      };
      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(createResponse.status).toBe(201);
      const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
      expect(responseDataIsBooking(createResponseBody.data)).toBe(true);
      const bookingUid = (createResponseBody.data as BookingOutput_2024_08_13).uid;

      expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();

      // --- 2. Reschedule Event ---
      const rescheduleBody: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 11, 0, 0)).toISOString(),
      };
      const rescheduleResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reschedule`)
        .send(rescheduleBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(rescheduleResponse.status).toBe(201);
      const rescheduledBookingUid = (rescheduleResponse.body as RescheduleBookingOutput_2024_08_13).data.uid;
      expect(AttendeeRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerRescheduledEmail.prototype.getHtml).toHaveBeenCalled();

      // --- 3. Cancel Event ---
      const cancelBody: CancelBookingInput_2024_08_13 = { cancellationReason: "Vacation" };
      const cancelResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/cancel`)
        .send(cancelBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(cancelResponse.status).toBe(200);
      expect(AttendeeCancelledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerCancelledEmail.prototype.getHtml).toHaveBeenCalled();
    });

    it("should handle the full booking lifecycle for a round-robin event and send emails", async () => {
      // --- 1. Book Event ---
      const createBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
        eventTypeId: emailsEnabledSetup.roundRobinEventType.id,
        attendee: {
          name: "Mr Proper",
          email: "mr_proper@gmail.com",
          timeZone: "Europe/Rome",
          language: "it",
        },
      };
      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(createResponse.status).toBe(201);
      const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
      expect(responseDataIsBooking(createResponseBody.data)).toBe(true);
      const bookingUid = (createResponseBody.data as BookingOutput_2024_08_13).uid;
      let currentHostId = (createResponseBody.data as BookingOutput_2024_08_13).hosts[0].id;
      expect(AttendeeScheduledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();

      // --- 2. Reschedule Event ---
      jest.clearAllMocks();
      const rescheduleBody: RescheduleBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2035, 0, 8, 12, 0, 0)).toISOString(),
      };
      const rescheduleResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reschedule`)
        .send(rescheduleBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(rescheduleResponse.status).toBe(201);
      const rescheduleResponseBody: RescheduleBookingOutput_2024_08_13 = rescheduleResponse.body;
      const rescheduledBookingUid = rescheduleResponseBody.data.uid;
      currentHostId = rescheduleResponseBody.data.hosts[0].id;
      expect(AttendeeRescheduledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerCancelledEmail.prototype.getHtml).toHaveBeenCalled(); // Old host gets cancellation
      expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled(); // New host gets scheduled

      // --- 3. Manual Reassign ---
      jest.clearAllMocks();
      const originalHostId = currentHostId;
      const reassignToId =
        currentHostId === emailsEnabledSetup.member1.id
          ? emailsEnabledSetup.member2.id
          : emailsEnabledSetup.member1.id;
      const hasOrganizerChanged = reassignToId !== originalHostId;

      const manualReassignResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/reassign/${reassignToId}`)
        .set("Authorization", `Bearer ${emailsEnabledSetup.member1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(manualReassignResponse.status).toBe(200);
      expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(AttendeeCancelledEmail.prototype.getHtml).not.toHaveBeenCalled();
      if (hasOrganizerChanged) {
        expect(AttendeeUpdatedEmail.prototype.getHtml).toHaveBeenCalled();
      } else {
        expect(AttendeeUpdatedEmail.prototype.getHtml).not.toHaveBeenCalled();
      }

      // --- 4. Automatic Reassign ---
      jest.clearAllMocks();
      const autoReassignResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/reassign`)
        .set("Authorization", `Bearer ${emailsEnabledSetup.member1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(autoReassignResponse.status).toBe(200);
      expect(OrganizerScheduledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerReassignedEmail.prototype.getHtml).toHaveBeenCalled();
      expect(AttendeeUpdatedEmail.prototype.getHtml).toHaveBeenCalled();

      // --- 5. Cancel Event ---
      jest.clearAllMocks();
      const cancelBody: CancelBookingInput_2024_08_13 = { cancellationReason: "Vacation" };
      const cancelResponse = await request(app.getHttpServer())
        .post(`/v2/bookings/${rescheduledBookingUid}/cancel`)
        .send(cancelBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

      expect(cancelResponse.status).toBe(200);
      expect(AttendeeCancelledEmail.prototype.getHtml).toHaveBeenCalled();
      expect(OrganizerCancelledEmail.prototype.getHtml).toHaveBeenCalled();
    });
  });

  afterAll(async () => {
    // Clean up database records
    await teamRepositoryFixture.delete(organization.id);
    await userRepositoryFixture.deleteByEmail(emailsEnabledSetup.member1.email);
    await userRepositoryFixture.deleteByEmail(emailsEnabledSetup.member2.email);
    await userRepositoryFixture.deleteByEmail(emailsDisabledSetup.member1.email);
    await userRepositoryFixture.deleteByEmail(emailsDisabledSetup.member2.email);
    await app.close();
  });
});
