import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_08_13,
  X_CAL_CLIENT_ID,
  X_CAL_SECRET_KEY,
} from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
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
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { OrganizationsTeamsBookingsModule } from "@/modules/organizations/teams/bookings/organizations-teams-bookings.module";

describe("Organizations TeamsBookings Endpoints 2024-08-13", () => {
  describe("Organization Team bookings", () => {
    let app: INestApplication;
    let organization: Team;
    let team1: Team;

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

    const teamUserEmail = "orgUser1team1@api.com";
    const teamUserEmail2 = "orgUser2team1@api.com";
    let teamUser: User;
    let teamUser2: User;

    let team1EventTypeId: number;
    let bookingUid: string;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        teamUserEmail,
        Test.createTestingModule({
          imports: [AppModule, OrganizationsTeamsBookingsModule],
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

      organization = await organizationsRepositoryFixture.create({ name: "organization team bookings" });
      oAuthClient = await createOAuthClient(organization.id);

      team1 = await teamRepositoryFixture.create({
        name: "team 1",
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
        name: "working time",
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
        role: "OWNER",
        user: { connect: { id: teamUser.id } },
        team: { connect: { id: team1.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: teamUser.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      const team1EventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team1.id },
        },
        title: "Collective Event Type",
        slug: "collective-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      team1EventTypeId = team1EventType.id;

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

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
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
              bookingUid = data.uid;
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
    });

    describe("get team bookings", () => {
      it("should get bookings by teamId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/teams/${team1.id}/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .set(X_CAL_SECRET_KEY, oAuthClient.secret)
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
            expect(data[0].eventTypeId).toEqual(team1EventTypeId);
          });
      });

      it("should get bookings by teamId and eventTypeId", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/organizations/${organization.id}/teams/${team1.id}/bookings?eventTypeId=${team1EventTypeId}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .set(X_CAL_SECRET_KEY, oAuthClient.secret)
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
            expect(data[0].eventTypeId).toEqual(team1EventTypeId);
          });
      });

      it("should get bookings by teamId and bookingUid", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/teams/${team1.id}/bookings?bookingUid=${bookingUid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .set(X_CAL_CLIENT_ID, oAuthClient.id)
          .set(X_CAL_SECRET_KEY, oAuthClient.secret)
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
            expect(data[0].uid).toEqual(bookingUid);
          });
      });

      it("should not get bookings by teamId and non existing eventTypeId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/teams/${team1.id}/bookings?eventTypeId=90909`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should not get bookings by non existing teamId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/teams/90909/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(404);
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
      return !Array.isArray(data) && typeof data === "object" && data !== null && "id" in data;
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(teamUser.email);
      await userRepositoryFixture.deleteByEmail(teamUserEmail2);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser.id, teamUser.email);
      await app.close();
    });
  });
});
