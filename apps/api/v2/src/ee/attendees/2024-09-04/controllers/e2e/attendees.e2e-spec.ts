import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import type { CreateAttendeeInput_2024_09_04 } from "@/ee/attendees/2024-09-04/inputs/create-attendee.input";
import type { UpdateAttendeeInput_2024_09_04 } from "@/ee/attendees/2024-09-04/inputs/update-attendee.input";
import {
  CreateAttendeeOutput_2024_09_04,
  GetAttendeeOutput_2024_09_04,
  UpdateAttendeeOutput_2024_09_04,
  DeleteAttendeeOutput_2024_09_04,
  AttendeeOutput_2024_09_04,
} from "@/ee/attendees/2024-09-04/outputs/attendee.output";
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
import { AttendeeRepositoryFixture } from "test/fixtures/repository/attendee.repository.fixture";
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

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_09_04 } from "@calcom/platform-constants";
import type { User, PlatformOAuthClient, Team, Booking, Attendee } from "@calcom/prisma/client";

describe("Attendees Endpoints 2024-09-04", () => {
  describe("User attendees", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let attendeeRepositoryFixture: AttendeeRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;

    const userEmail = `attendees-user-${randomString()}@api.com`;
    let user: User;

    let eventTypeId: number;
    const eventTypeSlug = `attendees-event-type-${randomString()}`;

    let createdBooking: Booking;
    let createdAttendee: AttendeeOutput_2024_09_04;

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
      attendeeRepositoryFixture = new AttendeeRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await organizationsRepositoryFixture.create({
        name: `attendees-organization-${randomString()}`,
        slug: `attendees-org-${randomString()}`,
        isOrganization: true,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `attendees-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `attendees-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;

      // Create initial booking for testing
      createdBooking = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 8, 14, 0, 0)),
        title: "Test booking for attendees",
        uid: `attendees-booking-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "Jammu, India",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Booking Owner",
          email: userEmail,
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
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

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(createdBooking).toBeDefined();
    });

    describe("create attendee", () => {
      it("should create an attendee for user booking", async () => {
        const body: CreateAttendeeInput_2024_09_04 = {
          bookingId: createdBooking.id,
          email: "new-attendee@example.com",
          name: "New Attendee",
          timeZone: "America/New_York",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();

            const data: AttendeeOutput_2024_09_04 = responseBody.data;
            expect(data.id).toBeDefined();
            expect(data.bookingId).toEqual(body.bookingId);
            expect(data.email).toEqual(body.email);
            expect(data.name).toEqual(body.name);
            expect(data.timeZone).toEqual(body.timeZone);

            createdAttendee = data;
          });
      });

      it("should create multiple attendees for same booking", async () => {
        const body: CreateAttendeeInput_2024_09_04 = {
          bookingId: createdBooking.id,
          email: "second-attendee@example.com",
          name: "Second Attendee",
          timeZone: "Europe/London",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.bookingId).toEqual(createdBooking.id);
          });
      });

      it("should create attendee with special characters in name", async () => {
        const body: CreateAttendeeInput_2024_09_04 = {
          bookingId: createdBooking.id,
          email: "unicode-attendee@example.com",
          name: "Test 你好 🎉",
          timeZone: "Asia/Tokyo",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(201)
          .then(async (response) => {
            const responseBody: CreateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.data.name).toEqual(body.name);
          });
      });

      it("should fail with invalid bookingId", async () => {
        const body: CreateAttendeeInput_2024_09_04 = {
          bookingId: 999999,
          email: "test@example.com",
          name: "Test",
          timeZone: "UTC",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(404);
      });

      it("should fail with invalid email format", async () => {
        const body = {
          bookingId: createdBooking.id,
          email: "invalid-email",
          name: "Test",
          timeZone: "UTC",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);
      });

      it("should fail with invalid timezone", async () => {
        const body = {
          bookingId: createdBooking.id,
          email: "test@example.com",
          name: "Test",
          timeZone: "Invalid/Timezone",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);
      });

      it("should fail with missing required fields", async () => {
        const body = {
          bookingId: createdBooking.id,
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);
      });
    });

    describe("get attendee", () => {
      it("should get an attendee by ID", async () => {
        return request(app.getHttpServer())
          .get(`/v2/attendees/${createdAttendee.id}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();

            const data: AttendeeOutput_2024_09_04 = responseBody.data;
            expect(data.id).toEqual(createdAttendee.id);
            expect(data.bookingId).toEqual(createdAttendee.bookingId);
            expect(data.email).toEqual(createdAttendee.email);
            expect(data.name).toEqual(createdAttendee.name);
            expect(data.timeZone).toEqual(createdAttendee.timeZone);
          });
      });

      it("should fail with invalid attendeeId format", async () => {
        return request(app.getHttpServer())
          .get(`/v2/attendees/invalid-id`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);
      });

      it("should fail when attendee doesn't exist", async () => {
        return request(app.getHttpServer())
          .get(`/v2/attendees/999999`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(404);
      });
    });

    describe("update attendee", () => {
      it("should update only email", async () => {
        const originalName = createdAttendee.name;
        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          email: "updated-email@example.com",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.email).toEqual(updateBody.email);
            expect(responseBody.data.name).toEqual(originalName);

            // Update createdAttendee for next tests
            createdAttendee = responseBody.data;
          });
      });

      it("should update only name", async () => {
        const originalEmail = createdAttendee.email;
        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          name: "Updated Name",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.data.name).toEqual(updateBody.name);
            expect(responseBody.data.email).toEqual(originalEmail);

            createdAttendee = responseBody.data;
          });
      });

      it("should update only timezone", async () => {
        const originalEmail = createdAttendee.email;
        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          timeZone: "Europe/Paris",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.data.timeZone).toEqual(updateBody.timeZone);
            expect(responseBody.data.email).toEqual(originalEmail);

            createdAttendee = responseBody.data;
          });
      });

      it("should update all fields", async () => {
        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          email: "all-updated@example.com",
          name: "All Updated Name",
          timeZone: "America/Los_Angeles",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.data.email).toEqual(updateBody.email);
            expect(responseBody.data.name).toEqual(updateBody.name);
            expect(responseBody.data.timeZone).toEqual(updateBody.timeZone);

            createdAttendee = responseBody.data;
          });
      });

      it("should update with same data (no-op)", async () => {
        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          email: createdAttendee.email,
          name: createdAttendee.name,
          timeZone: createdAttendee.timeZone,
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.data).toMatchObject({
              email: createdAttendee.email,
              name: createdAttendee.name,
              timeZone: createdAttendee.timeZone,
            });
          });
      });

      it("should fail with invalid email format", async () => {
        const updateBody = {
          email: "invalid-email",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);
      });

      it("should fail with invalid timezone", async () => {
        const updateBody = {
          timeZone: "Invalid/Timezone",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${createdAttendee.id}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(400);
      });

      it("should fail when attendee doesn't exist", async () => {
        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          name: "Updated",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/999999`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(404);
      });
    });

    describe("delete attendee", () => {
      let attendeeToDelete: Attendee;

      beforeAll(async () => {
        // Create a fresh attendee to delete
        attendeeToDelete = await attendeeRepositoryFixture.create({
          booking: {
            connect: {
              id: createdBooking.id,
            },
          },
          email: "to-delete@example.com",
          name: "To Delete",
          timeZone: "UTC",
        });
      });

      it("should delete an attendee", async () => {
        return request(app.getHttpServer())
          .delete(`/v2/attendees/${attendeeToDelete.id}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then(async (response) => {
            const responseBody: DeleteAttendeeOutput_2024_09_04 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data.id).toEqual(attendeeToDelete.id);
          });
      });

      it("should fail to get deleted attendee", async () => {
        return request(app.getHttpServer())
          .get(`/v2/attendees/${attendeeToDelete.id}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(404);
      });

      it("should fail to delete already deleted attendee", async () => {
        return request(app.getHttpServer())
          .delete(`/v2/attendees/${attendeeToDelete.id}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(404);
      });

      it("should fail when attendee doesn't exist", async () => {
        return request(app.getHttpServer())
          .delete(`/v2/attendees/999999`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(404);
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.delete(user.id);
      await app.close();
    });
  });

  describe("Team attendees", () => {
    let app: INestApplication;
    const organizationSlug = `team-attendees-org-${randomString()}`;
    let organization: Team;
    const teamSlug = `team-attendees-team-${randomString()}`;
    let team: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let attendeeRepositoryFixture: AttendeeRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let hostsRepositoryFixture: HostsRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let profileRepositoryFixture: ProfileRepositoryFixture;

    const teamUserEmail = `team-attendees-user1-${randomString()}@api.com`;
    const teamUser2Email = `team-attendees-user2-${randomString()}@api.com`;
    const teamAdminEmail = `team-attendees-admin-${randomString()}@api.com`;
    const nonTeamUserEmail = `team-attendees-nonteam-${randomString()}@api.com`;
    let teamUser: User;
    let teamUser2: User;
    let teamAdmin: User;
    let nonTeamUser: User;

    let teamEventTypeId: number;
    const teamEventTypeSlug = `team-attendees-event-type-${randomString()}`;
    let teamBooking: Booking;

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
      attendeeRepositoryFixture = new AttendeeRepositoryFixture(moduleRef);
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

      team = await teamRepositoryFixture.create({
        name: teamSlug,
        slug: teamSlug,
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
        locale: "en",
        name: "Team User 1",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      teamUser2 = await userRepositoryFixture.create({
        email: teamUser2Email,
        locale: "en",
        name: "Team User 2",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      teamAdmin = await userRepositoryFixture.create({
        email: teamAdminEmail,
        locale: "en",
        name: "Team Admin",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      nonTeamUser = await userRepositoryFixture.create({
        email: nonTeamUserEmail,
        locale: "en",
        name: "Non Team User",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `team-attendees-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(teamUser.id, userSchedule);
      await schedulesService.createUserSchedule(teamUser2.id, userSchedule);
      await schedulesService.createUserSchedule(teamAdmin.id, userSchedule);
      await schedulesService.createUserSchedule(nonTeamUser.id, userSchedule);

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
        username: teamUser2Email,
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
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamUser2.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: teamAdmin.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      const teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team.id },
        },
        title: `team-attendees-event-type-${randomString()}`,
        slug: teamEventTypeSlug,
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      teamEventTypeId = teamEventType.id;

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamUser.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventType.id,
          },
        },
      });

      // Create team booking
      teamBooking = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: teamUser.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 0, 10, 13, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 10, 14, 0, 0)),
        title: "Team booking for attendees",
        uid: `team-attendees-booking-${randomString()}`,
        eventType: {
          connect: {
            id: teamEventTypeId,
          },
        },
        location: "https://meet.google.com/team-meeting",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Team User 1",
          email: teamUserEmail,
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
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

    it("should be defined", () => {
      expect(teamRepositoryFixture).toBeDefined();
      expect(team).toBeDefined();
      expect(teamBooking).toBeDefined();
    });

    describe("team member permissions", () => {
      it("team member (host) can create attendee", async () => {
        const body: CreateAttendeeInput_2024_09_04 = {
          bookingId: teamBooking.id,
          email: "team-member-attendee@example.com",
          name: "Team Member Attendee",
          timeZone: "UTC",
        };

        return request(app.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(201);
      });

      it("team member can get attendee", async () => {
        // First create an attendee
        const createBody: CreateAttendeeInput_2024_09_04 = {
          bookingId: teamBooking.id,
          email: "team-get-attendee@example.com",
          name: "Team Get Attendee",
          timeZone: "UTC",
        };

        const createResponse = await request(app.getHttpServer())
          .post("/v2/attendees")
          .send(createBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04);

        const attendeeId = createResponse.body.data.id;

        return request(app.getHttpServer())
          .get(`/v2/attendees/${attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);
      });

      it("team member can update attendee", async () => {
        // First create an attendee
        const createBody: CreateAttendeeInput_2024_09_04 = {
          bookingId: teamBooking.id,
          email: "team-update-attendee@example.com",
          name: "Team Update Attendee",
          timeZone: "UTC",
        };

        const createResponse = await request(app.getHttpServer())
          .post("/v2/attendees")
          .send(createBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04);

        const attendeeId = createResponse.body.data.id;

        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          name: "Updated by Team Member",
        };

        return request(app.getHttpServer())
          .patch(`/v2/attendees/${attendeeId}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200)
          .then((response) => {
            expect(response.body.data.name).toEqual(updateBody.name);
          });
      });

      it("team member can delete attendee", async () => {
        // First create an attendee
        const createBody: CreateAttendeeInput_2024_09_04 = {
          bookingId: teamBooking.id,
          email: "team-delete-attendee@example.com",
          name: "Team Delete Attendee",
          timeZone: "UTC",
        };

        const createResponse = await request(app.getHttpServer())
          .post("/v2/attendees")
          .send(createBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04);

        const attendeeId = createResponse.body.data.id;

        return request(app.getHttpServer())
          .delete(`/v2/attendees/${attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);
      });
    });

    describe("team admin permissions (not host)", () => {
      let adminModuleRef;
      let adminApp: INestApplication;

      beforeAll(async () => {
        adminModuleRef = await withApiAuth(
          teamAdminEmail,
          Test.createTestingModule({
            imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
          })
        )
          .overrideGuard(PermissionsGuard)
          .useValue({
            canActivate: () => true,
          })
          .compile();

        adminApp = adminModuleRef.createNestApplication();
        bootstrap(adminApp as NestExpressApplication);
        await adminApp.init();
      });

      it("team admin can create attendee", async () => {
        const body: CreateAttendeeInput_2024_09_04 = {
          bookingId: teamBooking.id,
          email: "admin-attendee@example.com",
          name: "Admin Attendee",
          timeZone: "UTC",
        };

        return request(adminApp.getHttpServer())
          .post("/v2/attendees")
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(201);
      });

      it("team admin can get attendee", async () => {
        // Create an attendee first
        const createdAttendee = await attendeeRepositoryFixture.create({
          booking: {
            connect: {
              id: teamBooking.id,
            },
          },
          email: "admin-get-attendee@example.com",
          name: "Admin Get Attendee",
          timeZone: "UTC",
        });

        const attendeeId = createdAttendee.id;

        return request(adminApp.getHttpServer())
          .get(`/v2/attendees/${attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);
      });

      it("team admin can update attendee", async () => {
        // Create an attendee first
        const createdAttendee = await attendeeRepositoryFixture.create({
          booking: {
            connect: {
              id: teamBooking.id,
            },
          },
          email: "admin-update-attendee@example.com",
          name: "Admin Update Attendee",
          timeZone: "UTC",
        });

        const attendeeId = createdAttendee.id;

        const updateBody: UpdateAttendeeInput_2024_09_04 = {
          name: "Updated by Admin",
        };

        return request(adminApp.getHttpServer())
          .patch(`/v2/attendees/${attendeeId}`)
          .send(updateBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);
      });

      it("team admin can delete attendee", async () => {
        // Create an attendee first
        const createdAttendee = await attendeeRepositoryFixture.create({
          booking: {
            connect: {
              id: teamBooking.id,
            },
          },
          email: "admin-delete-attendee@example.com",
          name: "Admin Delete Attendee",
          timeZone: "UTC",
        });

        const attendeeId = createdAttendee.id;

        return request(adminApp.getHttpServer())
          .delete(`/v2/attendees/${attendeeId}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_09_04)
          .expect(200);
      });
      afterAll(async () => {
        await adminApp.close();
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.delete(teamUser.id);
      await userRepositoryFixture.delete(teamUser2.id);
      await userRepositoryFixture.delete(teamAdmin.id);
      await userRepositoryFixture.delete(nonTeamUser.id);
      await bookingsRepositoryFixture.deleteById(teamBooking.id);
      await app.close();
    });
  });
});
