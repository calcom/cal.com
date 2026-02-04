import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
} from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
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
import { withApiAuth } from "test/utils/withApiAuth";
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

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Team bookings", () => {
    let app: INestApplication;
    const organizationSlug = `team-bookings-organization-${randomString()}`;
    let organization: Team;
    const team1Slug = `team-bookings-team1-${randomString()}`;
    const team2Slug = `team-bookings-team2-${randomString()}`;
    let team1: Team;
    let team2: Team;

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

    const teamUserEmail = `team-bookings-user1-${randomString()}@api.com`;
    const teamUserEmail2 = `team-bookings-user2-${randomString()}@api.com`;
    let teamUser: User;
    let teamUser2: User;

    let team1EventTypeId: number;
    let team2EventTypeId: number;
    let team2RREventTypeId: number;
    let phoneOnlyEventTypeId: number;
    let collectiveEventWithoutHostsId: number;
    let roundRobinEventWithoutHostsId: number;

    const team1EventTypeSlug = `team-bookings-event-type-${randomString()}`;
    const team2EventTypeSlug = `team-bookings-event-type-${randomString()}`;
    const team2RREventTypeSlug = `team-bookings-rr-event-type-${randomString()}`;
    const phoneOnlyEventTypeSlug = `team-bookings-event-type-${randomString()}`;

    let phoneBasedBooking: BookingOutput_2024_08_13;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        teamUserEmail,
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
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await organizationsRepositoryFixture.create({
        name: organizationSlug,
        slug: organizationSlug,
        isOrganization: true,
      });
      oAuthClient = await createOAuthClient(organization.id);

      team1 = await teamRepositoryFixture.create({
        name: team1Slug,
        slug: team1Slug,
        isOrganization: false,
        parent: { connect: { id: organization.id } },
        createdByOAuthClient: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      team2 = await teamRepositoryFixture.create({
        name: team2Slug,
        slug: team2Slug,
        isOrganization: false,
        parent: { connect: { id: organization.id } },
        createdByOAuthClient: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      teamUser = await userRepositoryFixture.create({
        email: teamUserEmail,
        locale: "it",
        name: "orgUser1team1",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      teamUser2 = await userRepositoryFixture.create({
        email: teamUserEmail2,
        locale: "es",
        name: "orgUser2team1",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `team-bookings-2024-08-13-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(teamUser.id, userSchedule);
      await schedulesService.createUserSchedule(teamUser2.id, userSchedule);

      await profileRepositoryFixture.create({
        uid: `usr-${teamUser.id}`,
        username: teamUserEmail,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: teamUser.id,
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

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamUser.id } },
        team: { connect: { id: team1.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamUser.id } },
        team: { connect: { id: team2.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamUser2.id } },
        team: { connect: { id: team2.id } },
        accepted: true,
      });

      const team1EventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team1.id },
        },
        title: `team-bookings-2024-08-13-event-type-${randomString()}`,
        slug: team1EventTypeSlug,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      team1EventTypeId = team1EventType.id;

      const team1CollectiveEventTypeWithoutHosts = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team1.id },
        },
        title: `team-bookings-2024-08-13-collective-event-type-without-hosts-${randomString()}`,
        slug: `team-bookings-2024-08-13-collective-event-type-without-hosts-${randomString()}`,
        length: 60,
      });
      collectiveEventWithoutHostsId = team1CollectiveEventTypeWithoutHosts.id;

      const team1RoundRobinEventTypeWithoutHosts = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team1.id },
        },
        title: `team-bookings-2024-08-13-round-robin-event-type-without-hosts-${randomString()}`,
        slug: `team-bookings-2024-08-13-round-robin-event-type-without-hosts-${randomString()}`,
        length: 60,
      });
      roundRobinEventWithoutHostsId = team1RoundRobinEventTypeWithoutHosts.id;

      const phoneOnlyEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team1.id },
        },
        title: `team-bookings-2024-08-13-event-type-${randomString()}`,
        slug: phoneOnlyEventTypeSlug,
        length: 15,
        assignAllTeamMembers: false,
        hosts: {
          connectOrCreate: [
            {
              where: {
                userId_eventTypeId: {
                  userId: teamUser.id,
                  eventTypeId: team1EventTypeId,
                },
              },
              create: {
                userId: teamUser.id,
                isFixed: true,
              },
            },
          ],
        },
        bookingFields: [
          {
            name: "name",
            type: "name",
            label: "your name",
            sources: [{ id: "default", type: "default", label: "Default" }],
            variant: "fullName",
            editable: "system",
            required: true,
            defaultLabel: "your_name",
            variantsConfig: {
              variants: {
                fullName: {
                  fields: [{ name: "fullName", type: "text", label: "your name", required: true }],
                },
              },
            },
          },
          {
            name: "email",
            type: "email",
            label: "your email",
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system",
            required: false,
            defaultLabel: "email_address",
          },
          {
            name: "attendeePhoneNumber",
            type: "phone",
            label: "phone_number",
            sources: [{ id: "user", type: "user", label: "User", fieldRequired: true }],
            editable: "user",
            required: true,
            placeholder: "",
          },
          {
            name: "rescheduleReason",
            type: "textarea",
            views: [{ id: "reschedule", label: "Reschedule View" }],
            sources: [{ id: "default", type: "default", label: "Default" }],
            editable: "system-but-optional",
            required: false,
            defaultLabel: "reason_for_reschedule",
            defaultPlaceholder: "reschedule_placeholder",
          },
        ],
        locations: [],
      });

      phoneOnlyEventTypeId = phoneOnlyEventType.id;

      const team2EventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team2.id },
        },
        title: `team-bookings-2024-08-13-event-type-${randomString()}`,
        slug: team2EventTypeSlug,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      team2EventTypeId = team2EventType.id;

      const team2RREventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team2.id },
        },
        title: `team-bookings-2024-08-13-event-type-rr-${randomString()}`,
        slug: team2RREventTypeSlug,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
        rrHostSubsetEnabled: true,
      });

      team2RREventTypeId = team2RREventType.id;

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamUser2.id,
          },
        },
        eventType: {
          connect: {
            id: team2RREventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamUser.id,
          },
        },
        eventType: {
          connect: {
            id: team2RREventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamUser.id,
          },
        },
        eventType: {
          connect: {
            id: team1EventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamUser.id,
          },
        },
        eventType: {
          connect: {
            id: team2EventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: true,
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

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    describe("cant book event types without hosts", () => {
      it("should fail to book a collective event type without hosts", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: collectiveEventWithoutHostsId,
          attendee: {
            name: "alice",
            timeZone: "Europe/Madrid",
            email: "alice@gmail.com",
          },
        };

        const response = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(response.status).toBe(422);
        expect(response.body.error.message).toBe(
          `Can't book this team event type because it has no hosts. Please, add at least 1 host to event type with id=${collectiveEventWithoutHostsId} belonging to team with id=${team1.id} and try again.`
        );
      });

      it("should fail to book a round robin event type without hosts", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: roundRobinEventWithoutHostsId,
          attendee: {
            name: "alice",
            timeZone: "Europe/Madrid",
            email: "alice@gmail.com",
          },
        };

        const response = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        expect(response.status).toBe(422);
        expect(response.body.error.message).toBe(
          `Can't book this team event type because it has no hosts. Please, add at least 1 host to event type with id=${roundRobinEventWithoutHostsId} belonging to team with id=${team1.id} and try again.`
        );
      });
    });

    describe("create team bookings", () => {
      it("should create a team 1 booking", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: team1EventTypeId,
          attendee: {
            name: "alice",
            email: "alice@gmail.com",
            timeZone: "Europe/Madrid",
            language: "es",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team1EventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a phone based booking", async () => {
        const phoneNumber = "+919876543210";
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString(),
          eventTypeId: phoneOnlyEventTypeId,
          attendee: {
            name: "alice",
            phoneNumber,
            timeZone: "Europe/Madrid",
            language: "es",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 15, 15, 0)).toISOString());
              expect(data.duration).toEqual(15);
              expect(data.eventTypeId).toEqual(phoneOnlyEventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: "919876543210@sms.cal.com",
                displayEmail: "919876543210@sms.cal.com",
                phoneNumber: body.attendee.phoneNumber,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
              expect(data.bookingFieldsResponses.attendeePhoneNumber).toEqual(phoneNumber);
              phoneBasedBooking = data;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a team 2 booking", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)).toISOString(),
          eventTypeId: team2EventTypeId,
          attendee: {
            name: "bob",
            email: "bob@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 11, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team2EventTypeId);
              expect(data.attendees.length).toEqual(2);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.attendees[1]).toEqual({
                name: teamUser2.name,
                email: teamUser2.email,
                displayEmail: teamUser2.email,
                timeZone: teamUser2.timeZone,
                language: teamUser2.locale,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a team 2 RR booking and use rrHostSubsetIds to force teamUser2 as host ", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 12, 0, 0)).toISOString(),
          eventTypeId: team2RREventTypeId,
          attendee: {
            name: "bob2",
            email: "bob2@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
          rrHostSubsetIds: [teamUser2.id],
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser2.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team2RREventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a team 2 RR booking and use rrHostSubsetIds to force teamUser as host ", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 12, 0, 0)).toISOString(),
          eventTypeId: team2RREventTypeId,
          attendee: {
            name: "bob",
            email: "bob@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
          rrHostSubsetIds: [teamUser.id],
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team2RREventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should create a team 2 RR booking and use rrHostSubsetIds to force teamUser and teamUser2 as host ", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 14, 0, 0)).toISOString(),
          eventTypeId: team2RREventTypeId,
          attendee: {
            name: "bob",
            email: "bob@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
          rrHostSubsetIds: [teamUser.id, teamUser2.id],
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 15, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team2RREventTypeId);
              expect(data.attendees.length).toEqual(2);
              expect(data.attendees.find((a) => a.email === body.attendee.email)).toBeDefined();
              expect(data.attendees.find((a) => a.email === teamUser2.email)).toBeDefined();
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("get team bookings", () => {
      it("should get bookings by teamId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?teamId=${team1.id}`)
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
            expect(data[0].eventTypeId).toEqual(team1EventTypeId);
          });
      });

      it("should get bookings by teamId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?teamId=${team2.id}`)
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
            expect(data.length).toEqual(3);
            expect(data[0].eventTypeId).toEqual(team2EventTypeId);
          });
      });

      it("should get bookings by teamId and eventTypeId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?teamId=${team2.id}&eventTypeId=${team2EventTypeId}`)
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
            expect(data[0].eventTypeId).toEqual(team2EventTypeId);
          });
      });

      it("should not get bookings by teamId and non existing eventTypeId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?teamId=${team2.id}&eventTypeId=90909`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should get bookings by teamIds", async () => {
        return request(app.getHttpServer())
          .get(`/v2/bookings?teamIds=${team1.id},${team2.id}`)
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
            expect(data.length).toEqual(5);
            expect(data.find((booking) => booking.eventTypeId === team1EventTypeId)).toBeDefined();
            expect(data.find((booking) => booking.eventTypeId === team2EventTypeId)).toBeDefined();
          });
      });
    });

    describe("reschedule", () => {
      it("should reschedule phone based booking", async () => {
        const body: RescheduleBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2035, 0, 8, 14, 0, 0)).toISOString(),
          reschedulingReason: "Flying to mars that day",
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${phoneBasedBooking.uid}/reschedule`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2035, 0, 8, 14, 15, 0)).toISOString());
              expect(data.duration).toEqual(15);
              expect(data.eventTypeId).toEqual(phoneOnlyEventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: phoneBasedBooking.attendees[0].name,
                email: phoneBasedBooking.attendees[0].email,
                displayEmail: phoneBasedBooking.attendees[0].displayEmail,
                phoneNumber: phoneBasedBooking.attendees[0].phoneNumber,
                timeZone: phoneBasedBooking.attendees[0].timeZone,
                language: phoneBasedBooking.attendees[0].language,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(phoneBasedBooking.meetingUrl);
              expect(data.absentHost).toEqual(false);
              expect(data.bookingFieldsResponses.attendeePhoneNumber).toEqual(
                phoneBasedBooking.bookingFieldsResponses.attendeePhoneNumber
              );
              phoneBasedBooking = data;
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });

      it("should reschedule a team RR booking and use rrHostSubsetIds to force teamUser2 as host", async () => {
        const createBody: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 10, 10, 0, 0)).toISOString(),
          eventTypeId: team2RREventTypeId,
          attendee: {
            name: "reschedule-test",
            email: "reschedule-test@gmail.com",
            timeZone: "Europe/Rome",
            language: "it",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
          rrHostSubsetIds: [teamUser.id],
        };

        const createResponse = await request(app.getHttpServer())
          .post("/v2/bookings")
          .send(createBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201);

        const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
        expect(responseDataIsBooking(createResponseBody.data)).toBe(true);

        if (!responseDataIsBooking(createResponseBody.data)) {
          throw new Error("Invalid response data - expected booking");
        }

        const createdBooking: BookingOutput_2024_08_13 = createResponseBody.data;
        expect(createdBooking.hosts[0].id).toEqual(teamUser.id);

        const rescheduleBody: RescheduleBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 10, 12, 0, 0)).toISOString(),
          reschedulingReason: "Need to change host",
          rrHostSubsetIds: [teamUser2.id],
        };

        return request(app.getHttpServer())
          .post(`/v2/bookings/${createdBooking.uid}/reschedule`)
          .send(rescheduleBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(201)
          .then(async (response) => {
            const responseBody: RescheduleBookingOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser2.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(rescheduleBody.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 10, 13, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team2RREventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0].email).toEqual(createBody.attendee.email);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
    });

    describe("book using teamSlug, eventTypeSlug and organizationSlug", () => {
      it("should not be able to book if missing organizationSlug", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          teamSlug: team1Slug,
          eventTypeSlug: team1EventTypeSlug,
          attendee: {
            name: "alice",
            email: "alice@gmail.com",
            timeZone: "Europe/Madrid",
            language: "es",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
        };

        return request(app.getHttpServer())
          .post("/v2/bookings")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(404);
      });

      it("should book using teamSlug and eventTypeSlug and organizationSlug", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2040, 0, 9, 13, 0, 0)).toISOString(),
          teamSlug: team1Slug,
          eventTypeSlug: team1EventTypeSlug,
          organizationSlug: organizationSlug,
          attendee: {
            name: "alice",
            email: "alice@gmail.com",
            timeZone: "Europe/Madrid",
            language: "es",
          },
          meetingUrl: "https://meet.google.com/abc-def-ghi",
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
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(teamUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2040, 0, 9, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(team1EventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: body.attendee.email,
                displayEmail: body.attendee.email,
                timeZone: body.attendee.timeZone,
                language: body.attendee.language,
                absent: false,
              });
              expect(data.meetingUrl).toEqual(body.meetingUrl);
              expect(data.absentHost).toEqual(false);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received array of possibly recurring bookings"
              );
            }
          });
      });
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

    function responseDataIsBooking(data: unknown): data is BookingOutput_2024_08_13 {
      return !Array.isArray(data) && typeof data === "object" && data !== null && data && "id" in data;
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(teamUser.email);
      await userRepositoryFixture.deleteByEmail(teamUserEmail2);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser.id, teamUser.email);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser2.id, teamUser2.email);
      await app.close();
    });
  });
});
