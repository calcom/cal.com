import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_08_13,
} from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TeamsBookingsModule } from "@/modules/teams/bookings/teams-bookings.module";

describe("Teams Bookings Endpoints 2024-08-13", () => {
  describe("Standalone team bookings", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let hostsRepositoryFixture: HostsRepositoryFixture;

    const teamAdminEmail = "team-admin-bookings@api.com";
    const teamOwnerEmail = "team-owner-bookings@api.com";
    const teamMemberEmail = "team-member-bookings@api.com";
    const nonTeamUserEmail = "non-team-user-bookings@api.com";

    let teamAdmin: User;
    let teamOwner: User;
    let teamMember: User;
    let nonTeamUser: User;
    let standaloneTeam: Team;

    let teamEventTypeId: number;
    let teamEventTypeId2: number;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        teamOwnerEmail,
        Test.createTestingModule({
          imports: [AppModule, TeamsBookingsModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      hostsRepositoryFixture = new HostsRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      // Create a standalone team (not part of any organization)
      standaloneTeam = await teamRepositoryFixture.create({
        name: "Standalone Team Bookings",
        isOrganization: false,
      });

      // Create users
      teamAdmin = await userRepositoryFixture.create({
        email: teamAdminEmail,
        locale: "en",
        name: "TeamAdminBookings",
      });

      teamOwner = await userRepositoryFixture.create({
        email: teamOwnerEmail,
        locale: "en",
        name: "TeamOwnerBookings",
      });

      teamMember = await userRepositoryFixture.create({
        email: teamMemberEmail,
        locale: "en",
        name: "TeamMemberBookings",
      });

      nonTeamUser = await userRepositoryFixture.create({
        email: nonTeamUserEmail,
        locale: "en",
        name: "NonTeamUserBookings",
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/London",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(teamAdmin.id, userSchedule);
      await schedulesService.createUserSchedule(teamOwner.id, userSchedule);
      await schedulesService.createUserSchedule(teamMember.id, userSchedule);
      await schedulesService.createUserSchedule(nonTeamUser.id, userSchedule);

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: teamAdmin.id } },
        team: { connect: { id: standaloneTeam.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: teamOwner.id } },
        team: { connect: { id: standaloneTeam.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: teamMember.id } },
        team: { connect: { id: standaloneTeam.id } },
        accepted: true,
      });

      const teamEventType1 = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: standaloneTeam.id },
        },
        title: "Team Collective Event",
        slug: "team-collective-event",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      const teamEventType2 = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: standaloneTeam.id },
        },
        title: "Team Round Robin Event",
        slug: "team-round-robin-event",
        length: 30,
        assignAllTeamMembers: false,
        bookingFields: [],
        locations: [],
      });

      teamEventTypeId = teamEventType1.id;
      teamEventTypeId2 = teamEventType2.id;

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamAdmin.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventType1.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: teamOwner.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventType1.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: teamMember.id,
          },
        },
        eventType: {
          connect: {
            id: teamEventType2.id,
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    describe("create team bookings", () => {
      it("should create a team booking", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 10, 10, 0, 0)).toISOString(),
          eventTypeId: teamEventTypeId,
          attendee: {
            name: "Test Attendee",
            email: "attendee@example.com",
            timeZone: "Europe/London",
            language: "en",
          },
          meetingUrl: "https://meet.google.com/test-meeting",
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

            const responseData = responseBody.data;
            if (
              !Array.isArray(responseData) &&
              "id" in responseData &&
              !("bookingId" in responseData)
            ) {
              const data = responseData as BookingOutput_2024_08_13;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(teamEventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0].email).toEqual(body.attendee.email);
            } else {
              throw new Error(
                "Invalid response data - expected booking but received unexpected format"
              );
            }
          });
      });

      it("should create another team booking", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 11, 14, 0, 0)).toISOString(),
          eventTypeId: teamEventTypeId2,
          attendee: {
            name: "Another Attendee",
            email: "another@example.com",
            timeZone: "Europe/London",
            language: "en",
          },
          meetingUrl: "https://meet.google.com/another-meeting",
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

            const responseData = responseBody.data;
            if (
              !Array.isArray(responseData) &&
              "id" in responseData &&
              !("bookingId" in responseData)
            ) {
              const data = responseData as BookingOutput_2024_08_13;
              expect(data.eventTypeId).toEqual(teamEventTypeId2);
              expect(data.duration).toEqual(30);
            }
          });
      });
    });

    describe("get team bookings", () => {
      it("should get team bookings as team owner", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings`)
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
            expect(data.length).toBeGreaterThanOrEqual(2);
            expect(data.some((booking) => booking.eventTypeId === teamEventTypeId)).toBe(true);
            expect(data.some((booking) => booking.eventTypeId === teamEventTypeId2)).toBe(true);
          });
      });

      it("should get team bookings with status filter", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?status=upcoming`)
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
            // Verify all bookings are upcoming (in the future)
            data.forEach((booking) => {
              if (!Array.isArray(booking)) {
                expect(new Date(booking.start).getTime()).toBeGreaterThan(Date.now());
              }
            });
          });
      });

      it("should filter by multiple statuses", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?status=upcoming,past`)
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
            // Verify all bookings are either upcoming (future) or past
            const now = Date.now();
            data.forEach((booking) => {
              if (!Array.isArray(booking)) {
                const bookingEnd = new Date(booking.end).getTime();
                // Booking is either upcoming (starts in future) or past (ended in past)
                const isUpcoming = new Date(booking.start).getTime() > now;
                const isPast = bookingEnd < now;
                expect(isUpcoming || isPast).toBe(true);
              }
            });
          });
      });

      it("should get team bookings with eventTypeIds filter", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?eventTypeIds=${teamEventTypeId}`)
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
            expect(data.length).toBeGreaterThanOrEqual(1);
            data.forEach((booking) => {
              expect(booking.eventTypeId).toEqual(teamEventTypeId);
            });
          });
      });

      it("should get team bookings with attendeeEmail filter", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?attendeeEmail=attendee@example.com`)
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
            expect(data.length).toBeGreaterThanOrEqual(1);
            data.forEach((booking) => {
              if (!Array.isArray(booking) && "attendees" in booking) {
                expect(
                  booking.attendees.some((attendee) => attendee.email === "attendee@example.com")
                ).toBe(true);
              }
            });
          });
      });

      it("should get team bookings with pagination", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?take=1&skip=0`)
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
            expect(responseBody.pagination).toBeDefined();
          });
      });

      it("should get team bookings with teamMemberIds filter", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?teamMemberIds=${teamAdmin.id}`)
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
            // Verify bookings have the team admin as a host
            data.forEach((booking) => {
              if (!Array.isArray(booking) && "hosts" in booking) {
                expect(booking.hosts.some((host) => host.id === teamAdmin.id)).toBe(true);
              }
            });
          });
      });

      it("should get team bookings with teamMemberEmails filter", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?teamMemberEmails=${teamAdminEmail}`)
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
            // Verify bookings have a host with the team admin email
            data.forEach((booking) => {
              if (!Array.isArray(booking) && "hosts" in booking) {
                expect(
                  booking.hosts.some((host) => host.email === teamAdminEmail)
                ).toBe(true);
              }
            });
          });
      });

      it("should fail to get team bookings as non-admin/owner team member", async () => {
        const moduleRefForMember = await withApiAuth(
          teamMemberEmail,
          Test.createTestingModule({
            imports: [AppModule, TeamsBookingsModule],
          })
        )
          .overrideGuard(PermissionsGuard)
          .useValue({
            canActivate: () => true,
          })
          .compile();

        const memberApp = moduleRefForMember.createNestApplication();
        bootstrap(memberApp as NestExpressApplication);
        await memberApp.init();

        await request(memberApp.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);

        await memberApp.close();
      });

      it("should fail to get team bookings as non-team user", async () => {
        const moduleRefForNonTeamUser = await withApiAuth(
          nonTeamUserEmail,
          Test.createTestingModule({
            imports: [AppModule, TeamsBookingsModule],
          })
        )
          .overrideGuard(PermissionsGuard)
          .useValue({
            canActivate: () => true,
          })
          .compile();

        const nonTeamUserApp = moduleRefForNonTeamUser.createNestApplication();
        bootstrap(nonTeamUserApp as NestExpressApplication);
        await nonTeamUserApp.init();

        await request(nonTeamUserApp.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);

        await nonTeamUserApp.close();
      });

      it("should fail to get bookings for non-existent team", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/999999/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);
      });
    });

    afterAll(async () => {
      await userRepositoryFixture.deleteByEmail(teamAdminEmail);
      await userRepositoryFixture.deleteByEmail(teamOwnerEmail);
      await userRepositoryFixture.deleteByEmail(teamMemberEmail);
      await userRepositoryFixture.deleteByEmail(nonTeamUserEmail);
      await teamRepositoryFixture.delete(standaloneTeam.id);
      await app.close();
    });
  });
});
