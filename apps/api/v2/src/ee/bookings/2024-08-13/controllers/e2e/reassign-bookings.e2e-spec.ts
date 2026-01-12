import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type { CreateBookingInput_2024_08_13 } from "@calcom/platform-types";
import type { Booking, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { ReassignBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reassign-booking.output";
import { BOOKING_REASSIGN_PERMISSION_ERROR } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Reassign bookings", () => {
    let app: INestApplication;
    let organization: Team;
    let team: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let hostsRepositoryFixture: HostsRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;

    const teamUserEmail = `reassign-bookings-2024-08-13-user1-${randomString()}@api.com`;
    const teamUserEmail2 = `reassign-bookings-2024-08-13-user2-${randomString()}@api.com`;
    const teamUserEmail3 = `reassign-bookings-2024-08-13-user3-${randomString()}@api.com`;
    let teamUser1: User;
    let teamUser2: User;
    let teamUser3: User;
    let teamUser1ApiKey: string;
    let teamUser2ApiKey: string;

    let teamRoundRobinEventTypeId: number;
    let teamRoundRobinFixedHostEventTypeId: number;
    let teamRoundRobinNonFixedEventTypeId: number;
    let teamRoundRobinWithRescheduleReasonEventTypeId: number;

    let teamRoundRobinNonFixedEventTypeTitle: string;
    let teamRoundRobinFixedHostEventTypeTitle: string;
    let teamRoundRobinWithRescheduleReasonEventTypeTitle: string;

    let roundRobinBooking: Booking;
    let rescheduleReasonBookingUid: string;
    let rescheduleReasonBookingInitialHostId: number;

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
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await organizationsRepositoryFixture.create({
        name: `reassign-bookings-2024-08-13-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);

      team = await teamRepositoryFixture.create({
        name: `reassign-bookings-2024-08-13-team-${randomString()}`,
        isOrganization: false,
        parent: { connect: { id: organization.id } },
        createdByOAuthClient: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      teamUser1 = await userRepositoryFixture.create({
        email: teamUserEmail,
        locale: "en",
        name: `reassign-bookings-2024-08-13-user1-${randomString()}`,
      });

      teamUser2 = await userRepositoryFixture.create({
        email: teamUserEmail2,
        locale: "en",
        name: `reassign-bookings-2024-08-13-user2-${randomString()}`,
      });

      teamUser3 = await userRepositoryFixture.create({
        email: teamUserEmail3,
        locale: "en",
        name: `reassign-bookings-2024-08-13-user3-${randomString()}`,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(teamUser1.id, null);
      teamUser1ApiKey = `cal_test_${keyString}`;

      const { keyString: keyString2 } = await apiKeysRepositoryFixture.createApiKey(teamUser2.id, null);
      teamUser2ApiKey = `cal_test_${keyString2}`;

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `reassign-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
        availabilities: [
          {
            days: [0, 1, 2, 3, 4, 5, 6], // All days of the week
            startTime: new Date(Date.UTC(2024, 0, 1, 0, 0, 0)), // 00:00 UTC
            endTime: new Date(Date.UTC(2024, 0, 1, 23, 59, 0)), // 23:59 UTC
          },
        ],
      };
      await schedulesService.createUserSchedule(teamUser1.id, userSchedule);
      await schedulesService.createUserSchedule(teamUser2.id, userSchedule);
      await schedulesService.createUserSchedule(teamUser3.id, userSchedule);

      await profileRepositoryFixture.create({
        uid: `usr-${teamUser1.id}`,
        username: teamUserEmail,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: teamUser1.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teamUser2.id}`,
        username: teamUserEmail2,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: teamUser2.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${teamUser3.id}`,
        username: teamUserEmail3,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: teamUser3.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        team: { connect: { id: team.id } },
        user: { connect: { id: teamUser1.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        team: { connect: { id: team.id } },
        user: { connect: { id: teamUser2.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        team: { connect: { id: team.id } },
        user: { connect: { id: teamUser3.id } },
        accepted: true,
      });

      const team1EventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        users: {
          connect: [{ id: teamUser1.id }, { id: teamUser2.id }],
        },
        title: `reassign-bookings-2024-08-13-event-type-${randomString()}`,
        slug: `reassign-bookings-2024-08-13-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: false,
        bookingFields: [],
        locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
      });

      teamRoundRobinEventTypeId = team1EventType.id;

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser1.id,
          },
        },
        eventType: {
          connect: {
            id: team1EventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser2.id,
          },
        },
        eventType: {
          connect: {
            id: team1EventType.id,
          },
        },
      });

      roundRobinBooking = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: teamUser1.id,
          },
        },
        startTime: new Date(Date.UTC(2050, 0, 7, 13, 0, 0)),
        endTime: new Date(Date.UTC(2050, 0, 7, 14, 0, 0)),
        title: "round robin coding lets goo",
        uid: "round-robin-coding",
        eventType: {
          connect: {
            id: teamRoundRobinEventTypeId,
          },
        },
        location: "via 10, rome, italy",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Bob",
          email: "bob@gmail.com",
        },
        attendees: {
          create: {
            email: "bob@gmail.com",
            name: "Bob",
            locale: "en",
            timeZone: "Europe/Rome",
          },
        },
      });

      const teamNonFixedEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        users: {
          connect: [{ id: teamUser2.id }, { id: teamUser3.id }],
        },
        title: `reassign-bookings-2024-08-13-non-fixed-event-type-${randomString()}`,
        slug: `reassign-bookings-2024-08-13-non-fixed-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: false,
        bookingFields: [],
        locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
      });

      teamRoundRobinNonFixedEventTypeId = teamNonFixedEventType.id;
      teamRoundRobinNonFixedEventTypeTitle = teamNonFixedEventType.title;

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser2.id,
          },
        },
        eventType: {
          connect: {
            id: teamNonFixedEventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser3.id,
          },
        },
        eventType: {
          connect: {
            id: teamNonFixedEventType.id,
          },
        },
      });
      const team2EventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        users: {
          connect: [{ id: teamUser1.id }, { id: teamUser2.id }, { id: teamUser3.id }],
        },
        title: `reassign-bookings-2024-08-13-fixed-event-type-${randomString()}`,
        slug: `reassign-bookings-2024-08-13-fixed-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: false,
        bookingFields: [],
        locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
      });

      teamRoundRobinFixedHostEventTypeId = team2EventType.id;
      teamRoundRobinFixedHostEventTypeTitle = team2EventType.title;

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamUser1.id,
          },
        },
        eventType: {
          connect: {
            id: team2EventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser2.id,
          },
        },
        eventType: {
          connect: {
            id: team2EventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser3.id,
          },
        },
        eventType: {
          connect: {
            id: team2EventType.id,
          },
        },
      });

      const teamEventTypeWithRescheduleReason = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        users: {
          connect: [{ id: teamUser1.id }, { id: teamUser2.id }],
        },
        title: `reassign-bookings-2024-08-13-reschedule-reason-event-type-${randomString()}`,
        slug: `reassign-bookings-2024-08-13-reschedule-reason-event-type-${randomString()}`,
        length: 60,
        assignAllTeamMembers: false,
        bookingFields: [
          {
            name: "rescheduleReason",
            type: "textarea",
            defaultLabel: "Reason for rescheduling",
            required: true,
            sources: [
              {
                id: "default",
                type: "default",
                label: "Default",
              },
            ],
            editable: "system",
            views: [
              {
                id: "reschedule",
                label: "Reschedule View",
              },
            ],
          },
        ],
        locations: [{ type: "inPerson", address: "via 10, rome, italy" }],
      });

      teamRoundRobinWithRescheduleReasonEventTypeId = teamEventTypeWithRescheduleReason.id;
      teamRoundRobinWithRescheduleReasonEventTypeTitle = teamEventTypeWithRescheduleReason.title;

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser1.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventTypeWithRescheduleReason.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser2.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventTypeWithRescheduleReason.id,
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should reassign round robin booking", async () => {
      const booking = await bookingsRepositoryFixture.getByUid(roundRobinBooking.uid);
      expect(booking?.userId).toEqual(teamUser1.id);

      return request(app.getHttpServer())
        .post(`/v2/bookings/${roundRobinBooking.uid}/reassign`)
        .set("Authorization", `Bearer ${teamUser1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: ReassignBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: ReassignBookingOutput_2024_08_13["data"] = responseBody.data;
          expect(data.bookingUid).toEqual(roundRobinBooking.uid);
          expect(data.reassignedTo).toEqual({
            id: teamUser2.id,
            name: teamUser2.name,
            email: teamUser2.email,
            displayEmail: teamUser2.email,
          });

          const reassigned = await bookingsRepositoryFixture.getByUid(roundRobinBooking.uid);
          expect(reassigned?.userId).toEqual(teamUser2.id);
        });
    });

    it("should reassign round robin booking to a specific user", async () => {
      const booking = await bookingsRepositoryFixture.getByUid(roundRobinBooking.uid);
      expect(booking?.userId).toEqual(teamUser2.id);

      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: teamRoundRobinEventTypeId,
        attendee: {
          name: "alice",
          email: "alice@gmail.com",
          timeZone: "Europe/Madrid",
          language: "es",
        },
        meetingUrl: "https://meet.google.com/abc-def-ghi",
      };

      return request(app.getHttpServer())
        .post(`/v2/bookings/${roundRobinBooking.uid}/reassign/${teamUser1.id}`)
        .send(body)
        .set("Authorization", `Bearer ${teamUser1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: ReassignBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: ReassignBookingOutput_2024_08_13["data"] = responseBody.data;
          expect(data.bookingUid).toEqual(roundRobinBooking.uid);
          expect(data.reassignedTo).toEqual({
            id: teamUser1.id,
            name: teamUser1.name,
            email: teamUser1.email,
            displayEmail: teamUser1.email,
          });

          const reassigned = await bookingsRepositoryFixture.getByUid(roundRobinBooking.uid);
          expect(reassigned?.userId).toEqual(teamUser1.id);
        });
    });

    it("should have correct title when reassigning round robin booking with non-fixed host", async () => {
      const nonFixedHostBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2050, 0, 9, 13, 0, 0)).toISOString(),
        eventTypeId: teamRoundRobinNonFixedEventTypeId,
        attendee: {
          name: "Charlie",
          email: "charlie@gmail.com",
          timeZone: "Europe/Rome",
          language: "en",
        },
        meetingUrl: "https://meet.google.com/abc-def-ghi",
      };

      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(nonFixedHostBookingBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const bookingUid = createResponse.body.data.uid;
      const booking = await bookingsRepositoryFixture.getByUid(bookingUid);

      expect(booking).toBeDefined();
      expect(booking?.userId).toEqual(teamUser2.id);

      const expectedInitialTitle = `${teamRoundRobinNonFixedEventTypeTitle} between ${teamUser2.name} and Charlie`;
      expect(booking?.title).toEqual(expectedInitialTitle);

      return request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reassign`)
        .set("Authorization", `Bearer ${teamUser2ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: ReassignBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: ReassignBookingOutput_2024_08_13["data"] = responseBody.data;
          expect(data.bookingUid).toEqual(bookingUid);
          expect(data.reassignedTo.id).toEqual(teamUser3.id);

          const reassigned = await bookingsRepositoryFixture.getByUid(bookingUid);
          expect(reassigned?.userId).toEqual(teamUser3.id);

          const expectedReassignedTitle = `${teamRoundRobinNonFixedEventTypeTitle} between ${teamUser3.name} and Charlie`;
          expect(reassigned?.title).toEqual(expectedReassignedTitle);
        });
    });

    it("should have correct title when reassigning round robin booking with fixed host", async () => {
      const fixedHostBookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2050, 0, 8, 13, 0, 0)).toISOString(),
        eventTypeId: teamRoundRobinFixedHostEventTypeId,
        attendee: {
          name: "Alice",
          email: "alice@gmail.com",
          timeZone: "Europe/Rome",
          language: "en",
        },
        meetingUrl: "https://meet.google.com/abc-def-ghi",
      };

      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(fixedHostBookingBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const bookingUid = createResponse.body.data.uid;
      const booking = await bookingsRepositoryFixture.getByUid(bookingUid);

      expect(booking).toBeDefined();
      expect(booking?.userId).toEqual(teamUser1.id);

      const expectedInitialTitle = `${teamRoundRobinFixedHostEventTypeTitle} between ${team.name} and Alice`;
      expect(booking?.title).toEqual(expectedInitialTitle);

      return request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reassign/${teamUser3.id}`)
        .set("Authorization", `Bearer ${teamUser1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: ReassignBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: ReassignBookingOutput_2024_08_13["data"] = responseBody.data;
          expect(data.bookingUid).toEqual(bookingUid);
          expect(data.reassignedTo.id).toEqual(teamUser1.id);

          const reassigned = await bookingsRepositoryFixture.getByUid(bookingUid);
          expect(reassigned?.userId).toEqual(teamUser1.id);

          const expectedReassignedTitle = `${teamRoundRobinFixedHostEventTypeTitle} between ${team.name} and Alice`;
          expect(reassigned?.title).toEqual(expectedReassignedTitle);
        });
    });

    it("should preserve attendee name when reassigning round robin host manually with rescheduleReason required", async () => {
      const bookingBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2050, 0, 10, 13, 0, 0)).toISOString(),
        eventTypeId: teamRoundRobinWithRescheduleReasonEventTypeId,
        attendee: {
          name: "David",
          email: "david@gmail.com",
          timeZone: "Europe/Rome",
          language: "en",
        },
        meetingUrl: "https://meet.google.com/abc-def-ghi",
      };

      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(bookingBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const bookingUid = createResponse.body.data.uid;
      rescheduleReasonBookingUid = bookingUid;
      const booking = await bookingsRepositoryFixture.getByUid(bookingUid);

      expect(booking).toBeDefined();
      expect(booking?.userId).toBeDefined();
      const initialHostId = booking?.userId!;
      rescheduleReasonBookingInitialHostId = initialHostId;

      const expectedInitialTitle = `${teamRoundRobinWithRescheduleReasonEventTypeTitle} between ${
        booking?.userId === teamUser1.id ? teamUser1.name : teamUser2.name
      } and David`;
      expect(booking?.title).toEqual(expectedInitialTitle);
      expect(booking?.title).not.toContain("Nameless");

      const reassignToHostId = initialHostId === teamUser1.id ? teamUser2.id : teamUser1.id;
      const reassignToHostName = reassignToHostId === teamUser1.id ? teamUser1.name : teamUser2.name;

      return request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reassign/${reassignToHostId}`)
        .set("Authorization", `Bearer ${teamUser1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: ReassignBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: ReassignBookingOutput_2024_08_13["data"] = responseBody.data;
          expect(data.bookingUid).toEqual(bookingUid);
          expect(data.reassignedTo.id).toEqual(reassignToHostId);

          const reassigned = await bookingsRepositoryFixture.getByUid(bookingUid);
          expect(reassigned?.userId).toEqual(reassignToHostId);

          const expectedReassignedTitle = `${teamRoundRobinWithRescheduleReasonEventTypeTitle} between ${reassignToHostName} and David`;
          expect(reassigned?.title).toEqual(expectedReassignedTitle);
          expect(reassigned?.title).not.toContain("Nameless");
        });
    });

    it("should preserve attendee name when reassigning round robin host automatically with rescheduleReason required", async () => {
      const bookingUid = rescheduleReasonBookingUid;
      const booking = await bookingsRepositoryFixture.getByUid(bookingUid);

      expect(booking).toBeDefined();
      expect(booking?.userId).toBeDefined();

      const currentHostId = booking?.userId!;
      const initialHostId = rescheduleReasonBookingInitialHostId;
      const initialHostName = initialHostId === teamUser1.id ? teamUser1.name : teamUser2.name;

      expect(currentHostId).not.toEqual(initialHostId);

      return request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/reassign`)
        .set("Authorization", `Bearer ${teamUser1ApiKey}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200)
        .then(async (response) => {
          const responseBody: ReassignBookingOutput_2024_08_13 = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);
          expect(responseBody.data).toBeDefined();

          const data: ReassignBookingOutput_2024_08_13["data"] = responseBody.data;
          expect(data.bookingUid).toEqual(bookingUid);
          expect(data.reassignedTo.id).toEqual(initialHostId);

          const autoReassigned = await bookingsRepositoryFixture.getByUid(bookingUid);
          expect(autoReassigned?.userId).toEqual(initialHostId);

          const expectedAutoReassignedTitle = `${teamRoundRobinWithRescheduleReasonEventTypeTitle} between ${initialHostName} and David`;
          expect(autoReassigned?.title).toEqual(expectedAutoReassignedTitle);
          expect(autoReassigned?.title).not.toContain("Nameless");
        });
    });

    it("should return 403 when unauthorized user tries to reassign booking", async () => {
      const unauthorizedUserEmail = `fake-user-${randomString()}@api.com`;
      const unauthorizedUser = await userRepositoryFixture.create({
        email: unauthorizedUserEmail,
        locale: "en",
        name: `fake-user-${randomString()}`,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(unauthorizedUser.id, null);
      const unauthorizedApiKeyString = `cal_test_${keyString}`;

      const response = await request(app.getHttpServer())
        .post(`/v2/bookings/${roundRobinBooking.uid}/reassign`)
        .set("Authorization", `Bearer ${unauthorizedApiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(403);

      expect(response.body.error.message).toBe(BOOKING_REASSIGN_PERMISSION_ERROR);

      await userRepositoryFixture.deleteByEmail(unauthorizedUserEmail);
    });

    it("should return 403 when unauthorized user tries to reassign booking to specific user", async () => {
      const unauthorizedUserEmail = `fake-user-${randomString()}@api.com`;
      const unauthorizedUser = await userRepositoryFixture.create({
        email: unauthorizedUserEmail,
        locale: "en",
        name: `fake-user-${randomString()}`,
      });

      const { keyString } = await apiKeysRepositoryFixture.createApiKey(unauthorizedUser.id, null);
      const unauthorizedApiKeyString = `cal_test_${keyString}`;

      const response = await request(app.getHttpServer())
        .post(`/v2/bookings/${roundRobinBooking.uid}/reassign/${teamUser2.id}`)
        .send({ reason: "Testing unauthorized access" })
        .set("Authorization", `Bearer ${unauthorizedApiKeyString}`)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(403);

      expect(response.body.error.message).toBe(BOOKING_REASSIGN_PERMISSION_ERROR);

      await userRepositoryFixture.deleteByEmail(unauthorizedUserEmail);
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

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(teamUser1.email);
      await userRepositoryFixture.deleteByEmail(teamUserEmail2);
      await userRepositoryFixture.deleteByEmail(teamUserEmail3);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser1.id, teamUser1.email);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser2.id, teamUser2.email);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser3.id, teamUser3.email);
      await app.close();
    });
  });
});
