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

describe("Organizations Bookings Endpoints 2024-08-13", () => {
  describe("Organization bookings", () => {
    let app: INestApplication;
    let organization: Team;

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

    const orgUserEmail = "org-user-1-bookings@api.com";
    const orgUserEmail2 = "org-user-2-bookings@api.com";
    const nonOrgUserEmail1 = "non-org-user-1-bookings@api.com";
    let orgUser: User;
    let orgUser2: User;
    let nonOrgUser1: User;
    let team1: Team;

    let orgEventTypeId: number;
    let orgEventTypeId2: number;
    let nonOrgEventTypeId: number;

    let collectiveOrgBookingUid: string;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        orgUserEmail2,
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

      organization = await organizationsRepositoryFixture.create({ name: "organization bookings" });
      oAuthClient = await createOAuthClient(organization.id);
      team1 = await teamRepositoryFixture.create({
        name: "team orgs booking 1",
        isOrganization: false,
        parent: { connect: { id: organization.id } },
        createdByOAuthClient: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      nonOrgUser1 = await userRepositoryFixture.create({
        email: nonOrgUserEmail1,
        locale: "it",
        name: "NonOrgUser1Bookings",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      orgUser = await userRepositoryFixture.create({
        email: orgUserEmail,
        locale: "it",
        name: "orgUser1Bookings",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      orgUser2 = await userRepositoryFixture.create({
        email: orgUserEmail2,
        locale: "es",
        name: "orgUser2Bookings",
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
      await schedulesService.createUserSchedule(orgUser.id, userSchedule);
      await schedulesService.createUserSchedule(orgUser2.id, userSchedule);
      await schedulesService.createUserSchedule(nonOrgUser1.id, userSchedule);

      const orgEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: team1.id },
        },
        title: "Collective Event Type",
        slug: "org-bookings-collective-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      const orgEventType2 = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "ROUND_ROBIN",
        team: {
          connect: { id: team1.id },
        },
        title: "Collective Event Type",
        slug: "org-bookings-round-robin-event-type",
        length: 60,
        assignAllTeamMembers: false,
        bookingFields: [],
        locations: [],
      });

      orgEventTypeId2 = orgEventType2.id;

      await profileRepositoryFixture.create({
        uid: `usr-${orgUser.id}`,
        username: orgUserEmail,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: orgUser.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${orgUser2.id}`,
        username: orgUserEmail2,
        organization: {
          connect: {
            id: organization.id,
          },
        },
        user: {
          connect: {
            id: orgUser2.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: orgUser.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: orgUser2.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "ADMIN",
        user: { connect: { id: orgUser.id } },
        team: { connect: { id: team1.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: orgUser2.id } },
        team: { connect: { id: team1.id } },
        accepted: true,
      });

      const nonOrgEventType = await eventTypesRepositoryFixture.create(
        {
          title: "Non Org Event Type",
          slug: "non-org-event-type",
          length: 60,
          bookingFields: [],
          locations: [],
        },
        nonOrgUser1.id
      );

      orgEventTypeId = orgEventType.id;
      nonOrgEventTypeId = nonOrgEventType.id;

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: orgUser.id,
          },
        },
        eventType: {
          connect: {
            id: orgEventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: orgUser2.id,
          },
        },
        eventType: {
          connect: {
            id: orgEventType.id,
          },
        },
      });

      await hostsRepositoryFixture.create({
        isFixed: false,
        user: {
          connect: {
            id: orgUser2.id,
          },
        },
        eventType: {
          connect: {
            id: orgEventType2.id,
          },
        },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    describe("create organization bookings", () => {
      it("should create an collective organization booking", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 9, 13, 0, 0)).toISOString(),
          eventTypeId: orgEventTypeId,
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
              collectiveOrgBookingUid = data.uid;
              expect(data.id).toBeDefined();
              expect(data.uid).toBeDefined();
              expect(data.hosts.length).toEqual(1);
              expect(data.hosts[0].id).toEqual(orgUser.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 9, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(orgEventTypeId);
              expect(data.attendees.length).toEqual(2);
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

      it("should create a round robin organization booking", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 10, 13, 0, 0)).toISOString(),
          eventTypeId: orgEventTypeId2,
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
              expect(data.hosts[0].id).toEqual(orgUser2.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 10, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(orgEventTypeId2);
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

      it("should create a non organization booking for org-user-1", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)).toISOString(),
          eventTypeId: nonOrgEventTypeId,
          attendee: {
            name: orgUser.name ?? "",
            email: orgUserEmail,
            timeZone: orgUser.timeZone ?? "Europe/Madrid",
            language: "en",
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
              expect(data.hosts[0].id).toEqual(nonOrgUser1.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 8, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(nonOrgEventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: orgUserEmail,
                displayEmail: orgUserEmail,
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

      it("should create a non organization booking for org-user-2", async () => {
        const body: CreateBookingInput_2024_08_13 = {
          start: new Date(Date.UTC(2030, 0, 11, 13, 0, 0)).toISOString(),
          eventTypeId: nonOrgEventTypeId,
          attendee: {
            name: orgUser2.name ?? "",
            email: orgUserEmail2,
            timeZone: orgUser2.timeZone ?? "Europe/Madrid",
            language: "en",
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
              expect(data.hosts[0].id).toEqual(nonOrgUser1.id);
              expect(data.status).toEqual("accepted");
              expect(data.start).toEqual(body.start);
              expect(data.end).toEqual(new Date(Date.UTC(2030, 0, 11, 14, 0, 0)).toISOString());
              expect(data.duration).toEqual(60);
              expect(data.eventTypeId).toEqual(nonOrgEventTypeId);
              expect(data.attendees.length).toEqual(1);
              expect(data.attendees[0]).toEqual({
                name: body.attendee.name,
                email: orgUserEmail2,
                displayEmail: orgUserEmail2,
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

    describe("get organization bookings", () => {
      it("should get bookings by organizationId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings`)
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
            expect(data.length).toEqual(4);
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual(
              [orgEventTypeId, orgEventTypeId2, nonOrgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });

      it("should get bookings by organizationId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings?userIds=${orgUser.id}`)
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
            expect(data.length).toEqual(2);
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual(
              [orgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });

      it("should get bookings by organizationId and userIds", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/organizations/${organization.id}/bookings?userIds=${orgUser.id},${orgUser2.id}&skip=0&take=250`
          )
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
            expect(data.length).toEqual(4);
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual(
              [orgEventTypeId, orgEventTypeId2, nonOrgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });

      it("should get bookings by organizationId and userId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings?userIds=${orgUser2.id}`)
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
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual(
              [orgEventTypeId, orgEventTypeId2, nonOrgEventTypeId].sort()
            );
          });
      });

      it("should fail to get bookings by organizationId and Id of a user that does not exist", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings?userIds=972930`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(400);
      });

      it("should fail to get bookings by organizationId and Id of a user that does not belong to the org", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings?userIds=${nonOrgUser1.id}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);
      });

      it("should get bookings by organizationId and non org event-type id", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings?eventTypeIds=${nonOrgEventTypeId}`)
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
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual(
              [nonOrgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });

      it("should get bookings by organizationId and org event-type id", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${organization.id}/bookings?eventTypeIds=${orgEventTypeId}`)
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
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual([orgEventTypeId].sort());
          });
      });

      it("should get bookings by organizationId and org + non org event-type ids", async () => {
        return request(app.getHttpServer())
          .get(
            `/v2/organizations/${organization.id}/bookings?eventTypeIds=${orgEventTypeId2},${nonOrgEventTypeId}`
          )
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
            expect(data.map((booking) => booking.eventTypeId).sort()).toEqual(
              [orgEventTypeId2, nonOrgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });

      describe("get by bookingUid param", () => {
        it("should get a specific booking by bookingUid query param", async () => {
          return request(app.getHttpServer())
            .get(`/v2/organizations/${organization.id}/bookings?bookingUid=${collectiveOrgBookingUid}`)
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
              expect(responseDataIsBooking(data[0])).toBe(true);

              if (responseDataIsBooking(data[0])) {
                const booking: BookingOutput_2024_08_13 = data[0];
                expect(booking.uid).toEqual(collectiveOrgBookingUid);
                expect(booking.eventTypeId).toEqual(orgEventTypeId);
                expect(booking.status).toEqual("accepted");
                expect(booking.attendees.length).toEqual(2);
                expect(booking.attendees[0].name).toEqual("alice");
                expect(booking.attendees[0].email).toEqual("alice@gmail.com");
              } else {
                throw new Error("Expected single booking but received different response type");
              }
            });
        });

        it("should return empty array for non-existent booking UID query param", async () => {
          const nonExistentUid = "non-existent-booking-uid";

          return request(app.getHttpServer())
            .get(`/v2/organizations/${organization.id}/bookings?bookingUid=${nonExistentUid}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set(X_CAL_CLIENT_ID, oAuthClient.id)
            .set(X_CAL_SECRET_KEY, oAuthClient.secret)
            .expect(200)
            .then(async (response) => {
              const responseBody: GetBookingsOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(responseBody.data.length).toEqual(0);
            });
        });

        it("should return empty array for booking UID not belonging to the organization", async () => {
          const regularUser = await userRepositoryFixture.create({
            email: `org-bookings-regular-user-${Math.floor(Math.random() * 10000)}@api.com`,
            name: "Regular User",
          });

          const regularUserEventType = await eventTypesRepositoryFixture.create(
            {
              title: `regular-user-event-type-${Math.floor(Math.random() * 10000)}`,
              slug: `regular-user-event-type-${Math.floor(Math.random() * 10000)}`,
              length: 60,
              bookingFields: [],
              locations: [],
            },
            regularUser.id
          );

          const regularUserBooking = await bookingsRepositoryFixture.create({
            user: {
              connect: {
                id: regularUser.id,
              },
            },
            startTime: new Date(Date.UTC(2030, 0, 15, 13, 0, 0)),
            endTime: new Date(Date.UTC(2030, 0, 15, 14, 0, 0)),
            title: "Regular user booking",
            uid: `regular-user-booking-${Math.floor(Math.random() * 10000)}`,
            eventType: {
              connect: {
                id: regularUserEventType.id,
              },
            },
            location: "https://meet.google.com/regular-user",
            customInputs: {},
            metadata: {},
            status: "ACCEPTED",
            responses: {
              name: "Regular Attendee",
              email: "regular@example.com",
            },
            attendees: {
              create: {
                email: "regular@example.com",
                name: "Regular Attendee",
                locale: "en",
                timeZone: "Europe/Rome",
              },
            },
          });

          return request(app.getHttpServer())
            .get(`/v2/organizations/${organization.id}/bookings?bookingUid=${regularUserBooking.uid}`)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set(X_CAL_CLIENT_ID, oAuthClient.id)
            .set(X_CAL_SECRET_KEY, oAuthClient.secret)
            .expect(200)
            .then(async (response) => {
              const responseBody: GetBookingsOutput_2024_08_13 = response.body;
              expect(responseBody.status).toEqual(SUCCESS_STATUS);
              expect(responseBody.data).toBeDefined();
              expect(responseBody.data.length).toEqual(0);

              await userRepositoryFixture.delete(regularUser.id);
            });
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

    function responseDataIsBooking(data: any): data is BookingOutput_2024_08_13 {
      return !Array.isArray(data) && typeof data === "object" && data && "id" in data;
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(orgUser.email);
      await userRepositoryFixture.deleteByEmail(orgUser2.email);
      await userRepositoryFixture.deleteByEmail(nonOrgUser1.email);
      await bookingsRepositoryFixture.deleteAllBookings(orgUser.id, orgUser.email);
      await bookingsRepositoryFixture.deleteAllBookings(orgUser2.id, orgUser2.email);
      await bookingsRepositoryFixture.deleteAllBookings(nonOrgUser1.id, nonOrgUser1.email);
      await app.close();
    });
  });
});
