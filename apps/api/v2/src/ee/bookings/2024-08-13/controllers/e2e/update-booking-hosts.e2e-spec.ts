import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { UpdateBookingHostsOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/update-booking-hosts.output";
import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { EventType, User, Team, Host } from "@prisma/client";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import { CreateBookingInput_2024_08_13, BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { Booking } from "@calcom/prisma/client";

import { UpdateBookingHostsInput_2024_08_13, HostAction } from "../../inputs/update-booking-hosts.input";

describe("Update Booking Hosts Endpoints 2024-08-13", () => {
  describe("Team booking host updates", () => {
    let app: INestApplication;
    let team: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    const hostUser1Email = `host-user-1-${randomString()}@api.com`;
    const hostUser2Email = `host-user-2-${randomString()}@api.com`;
    const hostUser3Email = `host-user-3-${randomString()}@api.com`;
    const nonTeamUserEmail = `non-team-user-${randomString()}@api.com`;

    let hostUser1: User;
    let hostUser2: User;
    let hostUser3: User;
    let nonTeamUser: User;

    let teamEventTypeId: number;
    let teamEventType: EventType;
    const teamEventTypeSlug = `team-event-type-${randomString()}`;

    let createdBooking: Booking | null = null;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        hostUser1Email,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15, TokensModule],
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
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();

      // Create team
      team = await teamRepositoryFixture.create({
        name: `update-hosts-team-${randomString()}`,
      });

      // Create users
      hostUser1 = await userRepositoryFixture.create({
        email: hostUser1Email,
        username: hostUser1Email,
      });

      hostUser2 = await userRepositoryFixture.create({
        email: hostUser2Email,
        username: hostUser2Email,
      });

      hostUser3 = await userRepositoryFixture.create({
        email: hostUser3Email,
        username: hostUser3Email,
      });

      nonTeamUser = await userRepositoryFixture.create({
        email: nonTeamUserEmail,
        username: nonTeamUserEmail,
      });

      // Add users to team
      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: hostUser1.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });
      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: hostUser2.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });
      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: hostUser3.id } },
        team: { connect: { id: team.id } },
        accepted: true,
      });

      // Create schedules for users
      const defaultSchedule: CreateScheduleInput_2024_04_15 = {
        name: `schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };

      await schedulesService.createUserSchedule(hostUser1.id, defaultSchedule);
      await schedulesService.createUserSchedule(hostUser2.id, defaultSchedule);
      await schedulesService.createUserSchedule(hostUser3.id, defaultSchedule);

      // Create team event type with round robin scheduling
      teamEventType = await eventTypesRepositoryFixture.createTeamEventType({
        title: `team-round-robin-${randomString()}`,
        slug: teamEventTypeSlug,
        length: 60,
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team.id },
        },
        hosts: {
          create: [
            {
              userId: hostUser1.id,
              isFixed: false,
            },
            {
              userId: hostUser2.id,
              isFixed: false,
            },
          ],
        },
        bookingFields: [],
        locations: [],
      });
      teamEventTypeId = teamEventType.id;

      // Create a team booking for testing
      createdBooking = await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: hostUser1.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 8, 14, 0, 0)),
        title: "Team Meeting",
        uid: `team-booking-${randomString()}`,
        eventType: {
          connect: {
            id: teamEventTypeId,
          },
        },
        location: "https://meet.google.com/abc-def-ghi",
        customInputs: {},
        metadata: {},
        responses: {
          name: "Test Attendee",
          email: "attendee@test.com",
        },
        attendees: {
          create: {
            email: "attendee@test.com",
            name: "Test Attendee",
            locale: "en",
            timeZone: "Europe/Rome",
          },
        },
      });
    }, 60000); // 60 second timeout

    afterAll(async () => {
      try {
        // Clean up users
        await userRepositoryFixture.deleteByEmail(hostUser1Email);
        await userRepositoryFixture.deleteByEmail(hostUser2Email);
        await userRepositoryFixture.deleteByEmail(hostUser3Email);
        await userRepositoryFixture.deleteByEmail(nonTeamUserEmail);

        // Clean up booking
        if (createdBooking?.id) {
          await bookingsRepositoryFixture.deleteById(createdBooking.id);
        }

        // Clean up team
        await teamRepositoryFixture.delete(team.id);

        await app.close();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }, 30000); // 30 second timeout for cleanup

    describe("PATCH /v2/bookings/:bookingUid/hosts", () => {
      it("should add a new host to a booking", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              userId: hostUser3.id,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
        expect(responseBody.status).toEqual(SUCCESS_STATUS);
        expect(responseBody.data).toBeDefined();
        expect(responseDataIsBooking(responseBody.data)).toBe(true);

        if (responseDataIsBooking(responseBody.data)) {
          const data: BookingOutput_2024_08_13 = responseBody.data;
          expect(data.id).toEqual(createdBooking?.id);
          expect(data.uid).toEqual(createdBooking?.uid);

          // Check that the new host was added
          const hostIds = data.hosts.map((h) => h.id).sort();
          expect(hostIds).toContain(hostUser3.id);

          // Should now have 3 hosts (original 2 + newly added 1)
          expect(data.hosts.length).toEqual(3);
        }
      }, 15000);

      it("should remove a host from a booking", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.REMOVE,
              userId: hostUser2.id,
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toEqual(createdBooking?.id);
              expect(data.uid).toEqual(createdBooking?.uid);

              // Check that the host was removed
              const hostIds = data.hosts.map((h) => h.id);
              expect(hostIds).not.toContain(hostUser2.id);

              // Should now have 2 hosts (original 3 - removed 1)
              expect(data.hosts.length).toEqual(2);
            }
          });
      });

      it("should add a host by name/email instead of userId", async () => {
        // First remove hostUser2 if they exist to ensure clean state
        await request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send({
            hosts: [{ action: HostAction.REMOVE, userId: hostUser2.id }],
          })
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13);

        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              name: hostUser2.email, // Using email as name
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseDataIsBooking(responseBody.data)).toBe(true);

            if (responseDataIsBooking(responseBody.data)) {
              const data: BookingOutput_2024_08_13 = responseBody.data;
              expect(data.id).toEqual(createdBooking?.id);

              // Check that hostUser2 was added back
              const hostIds = data.hosts.map((h) => h.id);
              expect(hostIds).toContain(hostUser2.id);
            }
          });
      });

      it("should perform multiple actions in one request", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.REMOVE,
              userId: hostUser3.id,
            },
            {
              action: HostAction.ADD,
              userId: hostUser2.id, // Add back if not already there
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: UpdateBookingHostsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
          });
      });

      it("should return 403 when trying to add a user who is not a team member", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              userId: nonTeamUser.id,
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);
      });

      it("should return 400 when trying to add a user who is already a host", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              userId: hostUser1.id, // hostUser1 should already be a host
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should return 400 when trying to remove a user who is not a host", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.REMOVE,
              userId: hostUser3.id, // Assuming hostUser3 was removed earlier
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should return 400 when trying to provide both userId and name", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              userId: hostUser3.id,
              name: hostUser3.email, // Both userId and name provided
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should return 400 when no hosts are provided", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should return 404 when booking does not exist", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              userId: hostUser3.id,
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/non-existent-booking-uid/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(404);
      });

      it("should return 400 when user not found by name", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              name: "non-existent-user@example.com",
            },
          ],
        };

        return request(app.getHttpServer())
          .patch(`/v2/bookings/${createdBooking?.uid}/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });
    });

    function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
      return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
    }
  });

  describe("Basic functionality", () => {
    let app: INestApplication;

    const userEmail = `user-${randomString()}@example.com`;
    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    }, 30000);

    afterAll(async () => {
      try {
        await userRepositoryFixture.deleteByEmail(userEmail);
        await app.close();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }, 15000);

    describe("PATCH /v2/bookings/:bookingUid/hosts", () => {
      it("should return 404 for non-existent booking", async () => {
        const body: UpdateBookingHostsInput_2024_08_13 = {
          hosts: [
            {
              action: HostAction.ADD,
              userId: 999,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/bookings/non-existent-uid/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(404);

        expect(response.body.status).toEqual("error");
      }, 10000);

      it("should return 400 for invalid input", async () => {
        const body = {
          hosts: [
            {
              action: "INVALID_ACTION",
              userId: 999,
            },
          ],
        };

        const response = await request(app.getHttpServer())
          .patch(`/v2/bookings/some-uid/hosts`)
          .send(body)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);

        expect(response.body.status).toEqual("error");
      }, 10000);
    });
  });
});
