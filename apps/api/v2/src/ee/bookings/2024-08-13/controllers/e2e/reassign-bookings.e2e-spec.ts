import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { ReassignBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/reassign-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { Booking, User } from "@prisma/client";
import * as request from "supertest";
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

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { CreateBookingInput_2024_08_13, BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { PlatformOAuthClient, Team } from "@calcom/prisma/client";

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

    const teamUserEmail = "orgUser1team1@api.com";
    const teamUserEmail2 = "orgUser2team1@api.com";
    let teamUser1: User;
    let teamUser2: User;

    let teamRoundRobinEventTypeId: number;

    let roundRobinBooking: Booking;

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

      organization = await organizationsRepositoryFixture.create({ name: "organization team bookings" });
      oAuthClient = await createOAuthClient(organization.id);

      team = await teamRepositoryFixture.create({
        name: "team 1",
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
        locale: "it",
        name: "orgUser1team1",
      });

      teamUser2 = await userRepositoryFixture.create({
        email: teamUserEmail2,
        locale: "it",
        name: "orgUser2team1",
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(teamUser1.id, userSchedule);
      await schedulesService.createUserSchedule(teamUser2.id, userSchedule);

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

      const team1EventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        users: {
          connect: [{ id: teamUser1.id }, { id: teamUser2.id }],
        },
        title: "Round Robin Event Type",
        slug: "round-robin-event-type",
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
            locale: "it",
            timeZone: "Europe/Rome",
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
          });

          const reassigned = await bookingsRepositoryFixture.getByUid(roundRobinBooking.uid);
          expect(reassigned?.userId).toEqual(teamUser1.id);
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

    function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
      return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(teamUser1.email);
      await userRepositoryFixture.deleteByEmail(teamUserEmail2);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser1.id, teamUser1.email);
      await bookingsRepositoryFixture.deleteAllBookings(teamUser2.id, teamUser2.email);
      await app.close();
    });
  });
});
