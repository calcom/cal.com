import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import {
  UpdateBookingHostsInput_2024_08_13,
  HostAction,
} from "@/ee/bookings/2024-08-13/inputs/update-booking-hosts.input";
import { UpdateBookingHostsOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/update-booking-hosts.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { EventType, User, Team, PlatformOAuthClient } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { Booking } from "@calcom/prisma/client";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Update Booking Hosts", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;

    const userEmail = `update-hosts-user-${randomString()}@api.com`;
    const user2Email = `update-hosts-user2-${randomString()}@api.com`;
    const user3Email = `update-hosts-user3-${randomString()}@api.com`;
    let user: User;
    let user2: User;
    let user3: User;

    let eventTypeId: number;
    let eventType: EventType;
    const eventTypeSlug = `update-hosts-event-type-${randomString()}`;

    let testBooking: Booking;

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: `update-hosts-oauth-client-${randomString()}`,
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
      };
      const secret = `update-hosts-oauth-client-secret-${randomString()}`;
      const oAuthClient = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return oAuthClient;
    }

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
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await teamRepositoryFixture.create({
        name: `update-hosts-organization-${randomString()}`,
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

      user2 = await userRepositoryFixture.create({
        email: user2Email,
        username: user2Email,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      user3 = await userRepositoryFixture.create({
        email: user3Email,
        username: user3Email,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `update-hosts-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      await schedulesService.createUserSchedule(user2.id, userSchedule);
      await schedulesService.createUserSchedule(user3.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `update-hosts-event-type-${randomString()}`,
          slug: eventTypeSlug,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;
      eventType = event;

      testBooking = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: user.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 1, 8, 13, 0, 0)), // Future date
        endTime: new Date(Date.UTC(2030, 1, 8, 14, 0, 0)),
        title: "Test Booking for Host Updates",
        uid: `update-hosts-test-booking-${randomString()}`,
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        location: "integrations:daily",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Test Attendee",
          email: "attendee@example.com",
        },
        attendees: {
          create: {
            email: "attendee@example.com",
            name: "Test Attendee",
            locale: "en",
            timeZone: "Europe/Rome",
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    describe("PATCH /v2/bookings/:bookingUid/hosts", () => {
      it("should successfully add a new host to booking", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.ADD, userId: user2.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();

            const bookingData = responseBody.data as BookingOutput_2024_08_13;
            expect(bookingData.uid).toEqual(testBooking.uid);
            expect(bookingData.hosts.length).toBeGreaterThanOrEqual(2);

            const hostIds = bookingData.hosts.map((host) => host.id);
            expect(hostIds).toContain(user.id); // Original host
            expect(hostIds).toContain(user2.id); // New host
          });
      });

      it("should successfully remove a host from booking", async () => {
        // First add user3 as a host
        const addBody: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.ADD, userId: user3.id }],
        };

        await request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(addBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        // Now remove user3
        const removeBody: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.REMOVE, userId: user3.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(removeBody)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();

            const bookingData = responseBody.data as BookingOutput_2024_08_13;
            const hostIds = bookingData.hosts.map((host) => host.id);
            expect(hostIds).not.toContain(user3.id); // User3 should be removed
            expect(hostIds).toContain(user.id); // Original host should remain
          });
      });

      it("should successfully handle multiple actions in single request", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            { action: HostAction.REMOVE, userId: user2.id }, // Remove user2
            { action: HostAction.ADD, userId: user3.id }, // Add user3
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();

            const bookingData = responseBody.data as BookingOutput_2024_08_13;
            const hostIds = bookingData.hosts.map((host) => host.id);

            expect(hostIds).toContain(user.id); // Original host remains
            expect(hostIds).not.toContain(user2.id); // user2 removed
            expect(hostIds).toContain(user3.id); // user3 added
          });
      });

      it("should fail when trying to remove all hosts", async () => {
        // Create a booking with only one host
        const singleHostBooking = await bookingsRepositoryFixture.create({
          user: {
            connect: {
              id: user.id,
            },
          },
          startTime: new Date(Date.UTC(2030, 2, 8, 13, 0, 0)),
          endTime: new Date(Date.UTC(2030, 2, 8, 14, 0, 0)),
          title: "Single Host Test Booking",
          uid: `single-host-booking-${randomString()}`,
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          location: "integrations:daily",
          customInputs: {},
          metadata: {},
          responses: {
            name: "Test Attendee",
            email: "attendee@example.com",
          },
          attendees: {
            create: {
              email: "attendee@example.com",
              name: "Test Attendee",
              locale: "en",
              timeZone: "Europe/Rome",
            },
          },
        });

        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.REMOVE, userId: user.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${singleHostBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400)
          .then(async (response) => {
            expect(response.body.message).toContain("Cannot remove all hosts");

            // Clean up
            await bookingsRepositoryFixture.deleteById(singleHostBooking.id);
          });
      });

      it("should fail when trying to add non-existent user", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.ADD, userId: 99999 }], // Non-existent user
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(404)
          .then(async (response) => {
            expect(response.body.message).toContain("User with id 99999 not found");
          });
      });

      it("should fail when booking does not exist", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.ADD, userId: user2.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/non-existent-uid/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(404)
          .then(async (response) => {
            expect(response.body.message).toContain("Booking with uid=non-existent-uid was not found");
          });
      });

      it("should fail with invalid action", async () => {
        const body = {
          hosts: [{ action: "invalid", userId: user2.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should fail with empty hosts array", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should fail when trying to add already existing host", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.ADD, userId: user.id }], // User is already a host
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400)
          .then(async (response) => {
            expect(response.body.message).toContain(`User ${user.id} is already a host`);
          });
      });

      it("should fail when trying to remove non-existing host", async () => {
        // Create a new user who is not a host
        const newUser = await userRepositoryFixture.create({
          email: `non-host-user-${randomString()}@api.com`,
          username: `non-host-user-${randomString()}`,
        });

        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.REMOVE, userId: newUser.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${testBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400)
          .then(async (response) => {
            expect(response.body.message).toContain(`User ${newUser.id} is not currently a host`);

            // Clean up
            await userRepositoryFixture.deleteByEmail(newUser.email);
          });
      });

      it("should fail when trying to update hosts for past booking", async () => {
        const pastBooking = await bookingsRepositoryFixture.create({
          user: {
            connect: {
              id: user.id,
            },
          },
          startTime: new Date(Date.UTC(2020, 1, 8, 13, 0, 0)), // Past date
          endTime: new Date(Date.UTC(2020, 1, 8, 14, 0, 0)),
          title: "Past Booking",
          uid: `past-booking-${randomString()}`,
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          location: "integrations:daily",
          customInputs: {},
          metadata: {},
          responses: {
            name: "Test Attendee",
            email: "attendee@example.com",
          },
          attendees: {
            create: {
              email: "attendee@example.com",
              name: "Test Attendee",
              locale: "en",
              timeZone: "Europe/Rome",
            },
          },
        });

        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [{ action: HostAction.ADD, userId: user2.id }],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${pastBooking.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400)
          .then(async (response) => {
            expect(response.body.message).toContain("Cannot update hosts for past bookings");

            // Clean up
            await bookingsRepositoryFixture.deleteById(pastBooking.id);
          });
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(user.email);
      await userRepositoryFixture.deleteByEmail(user2.email);
      await userRepositoryFixture.deleteByEmail(user3.email);
      await bookingsRepositoryFixture.deleteById(testBooking.id);
      await eventTypesRepositoryFixture.delete(eventType.id);
      await teamRepositoryFixture.delete(organization.id);
      await app.close();
    });
  });
});
