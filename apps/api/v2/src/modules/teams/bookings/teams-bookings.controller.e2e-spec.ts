import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  CreateBookingInput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import type { Team, User } from "@calcom/prisma/client";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { TestingModule } from "@nestjs/testing";
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
import type { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import type { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { TeamsBookingsModule } from "@/modules/teams/bookings/teams-bookings.module";

type BookingData =
  | BookingOutput_2024_08_13
  | RecurringBookingOutput_2024_08_13
  | GetSeatedBookingOutput_2024_08_13;

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

    // Store created booking data for filter tests
    let createdBookingUid: string;
    const attendeeEmail1 = "attendee@example.com";
    const attendeeName1 = "Test Attendee";
    const attendeeEmail2 = "another@example.com";
    const attendeeName2 = "Another Attendee";
    const bookingStart1 = new Date(Date.UTC(2030, 0, 10, 10, 0, 0));
    const bookingStart2 = new Date(Date.UTC(2030, 0, 11, 14, 0, 0));

    async function createBookingViaApi(
      eventTypeId: number,
      start: Date,
      attendee: { name: string; email: string }
    ): Promise<BookingOutput_2024_08_13> {
      const body: CreateBookingInput_2024_08_13 = {
        start: start.toISOString(),
        eventTypeId,
        attendee: {
          name: attendee.name,
          email: attendee.email,
          timeZone: "Europe/London",
          language: "en",
        },
        meetingUrl: "https://meet.google.com/test-meeting",
      };

      const response = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const responseBody: CreateBookingOutput_2024_08_13 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();

      const responseData = responseBody.data;
      if (!Array.isArray(responseData) && "id" in responseData && !("bookingId" in responseData)) {
        return responseData as BookingOutput_2024_08_13;
      }
      throw new Error("Invalid response data - expected booking but received unexpected format");
    }

    beforeAll(async () => {
      const moduleRef: TestingModule = await withApiAuth(
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

      // Create bookings for filter tests
      const booking1 = await createBookingViaApi(teamEventTypeId, bookingStart1, {
        name: attendeeName1,
        email: attendeeEmail1,
      });
      createdBookingUid = booking1.uid;

      await createBookingViaApi(teamEventTypeId2, bookingStart2, {
        name: attendeeName2,
        email: attendeeEmail2,
      });
    });

    describe("filters", () => {
      it("should filter by single status", async () => {
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
              if ("start" in booking) {
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

      it("should filter by multiple eventTypeIds", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?eventTypeIds=${teamEventTypeId},${teamEventTypeId2}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const data: BookingData[] = responseBody.data;
            expect(data.length).toBeGreaterThanOrEqual(2);
            data.forEach((booking) => {
              expect([teamEventTypeId, teamEventTypeId2]).toContain(booking.eventTypeId);
            });
          });
      });

      it("should filter by attendeeEmail", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?attendeeEmail=${attendeeEmail1}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: BookingData[] = responseBody.data;
            expect(data.length).toBeGreaterThanOrEqual(1);
            data.forEach((booking) => {
              if ("attendees" in booking) {
                expect(booking.attendees.some((attendee) => attendee.email === attendeeEmail1)).toBe(true);
              }
            });
          });
      });

      it("should filter by attendeeName", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?attendeeName=${encodeURIComponent(attendeeName1)}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: BookingData[] = responseBody.data;
            expect(data.length).toBeGreaterThanOrEqual(1);
            data.forEach((booking) => {
              if ("attendees" in booking) {
                expect(booking.attendees.some((attendee) => attendee.name === attendeeName1)).toBe(true);
              }
            });
          });
      });

      it("should filter by bookingUid", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?bookingUid=${createdBookingUid}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            const data: BookingData[] = responseBody.data;
            expect(data.length).toEqual(1);
            expect(data[0].uid).toEqual(createdBookingUid);
          });
      });

      it("should filter by date range (afterStart and beforeEnd)", async () => {
        const afterStartDate = new Date(Date.UTC(2030, 0, 9, 0, 0, 0)).toISOString();
        const beforeEndDate = new Date(Date.UTC(2030, 0, 12, 0, 0, 0)).toISOString();
        return request(app.getHttpServer())
          .get(
            `/v2/teams/${standaloneTeam.id}/bookings?afterStart=${afterStartDate}&beforeEnd=${beforeEndDate}`
          )
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.length).toBeGreaterThanOrEqual(2);
          });
      });
    });

    describe("sorting", () => {
      it("should sort by start ascending", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?sortStart=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const data: BookingData[] = responseBody.data;
            for (let i = 1; i < data.length; i++) {
              const prevBooking = data[i - 1];
              const currBooking = data[i];
              if ("start" in prevBooking && "start" in currBooking) {
                expect(new Date(prevBooking.start).getTime()).toBeLessThanOrEqual(
                  new Date(currBooking.start).getTime()
                );
              }
            }
          });
      });

      it("should sort by start descending", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?sortStart=desc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const data: BookingData[] = responseBody.data;
            for (let i = 1; i < data.length; i++) {
              const prevBooking = data[i - 1];
              const currBooking = data[i];
              if ("start" in prevBooking && "start" in currBooking) {
                expect(new Date(prevBooking.start).getTime()).toBeGreaterThanOrEqual(
                  new Date(currBooking.start).getTime()
                );
              }
            }
          });
      });

      it("should sort by end ascending", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?sortEnd=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const data: BookingData[] = responseBody.data;
            for (let i = 1; i < data.length; i++) {
              const prevBooking = data[i - 1];
              const currBooking = data[i];
              if ("end" in prevBooking && "end" in currBooking) {
                expect(new Date(prevBooking.end).getTime()).toBeLessThanOrEqual(
                  new Date(currBooking.end).getTime()
                );
              }
            }
          });
      });

      it("should sort by created ascending", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?sortCreated=asc`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            const data: BookingData[] = responseBody.data;
            for (let i = 1; i < data.length; i++) {
              const prevBooking = data[i - 1];
              const currBooking = data[i];
              if ("createdAt" in prevBooking && "createdAt" in currBooking) {
                expect(new Date(prevBooking.createdAt).getTime()).toBeLessThanOrEqual(
                  new Date(currBooking.createdAt).getTime()
                );
              }
            }
          });
      });
    });

    describe("pagination", () => {
      it("should return paginated results with take parameter", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?take=1`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.length).toEqual(1);
            expect(responseBody.pagination).toBeDefined();
          });
      });

      it("should return paginated results with skip parameter", async () => {
        // First get all bookings to know total
        const allBookingsResponse = await request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        const allBookings: BookingData[] = allBookingsResponse.body.data;
        const totalCount = allBookings.length;

        // Skip first booking
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?skip=1`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.length).toEqual(totalCount - 1);
          });
      });

      it("should return paginated results with take and skip parameters", async () => {
        return request(app.getHttpServer())
          .get(`/v2/teams/${standaloneTeam.id}/bookings?take=1&skip=1`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200)
          .then(async (response) => {
            const responseBody: GetBookingsOutput_2024_08_13 = response.body;
            expect(responseBody.status).toEqual(SUCCESS_STATUS);
            expect(responseBody.data).toBeDefined();
            expect(responseBody.data.length).toEqual(1);
            expect(responseBody.pagination).toBeDefined();
          });
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
