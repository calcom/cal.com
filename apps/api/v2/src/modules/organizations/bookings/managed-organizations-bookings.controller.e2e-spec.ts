import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { OrganizationsTeamsBookingsModule } from "@/modules/organizations/teams/bookings/organizations-teams-bookings.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { HostsRepositoryFixture } from "test/fixtures/repository/hosts.repository.fixture";
import { ManagedOrganizationsRepositoryFixture } from "test/fixtures/repository/managed-organizations.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { withApiAuth } from "test/utils/withApiAuth";

import { randomString } from "@calcom/lib/random";
import {
  CAL_API_VERSION_HEADER,
  SUCCESS_STATUS,
  VERSION_2024_08_13,
  X_CAL_CLIENT_ID,
  X_CAL_SECRET_KEY,
} from "@calcom/platform-constants";
import type {
  BookingOutput_2024_08_13,
  RecurringBookingOutput_2024_08_13,
  GetBookingsOutput_2024_08_13,
  GetSeatedBookingOutput_2024_08_13,
} from "@calcom/platform-types";
import type { User, PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Organizations Bookings Endpoints 2024-08-13", () => {
  describe("Manager and managed organizations bookings", () => {
    let app: INestApplication;
    let managerOrganization: Team;
    let managedOrganization: Team;

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
    let managedOrganizationsRepositoryFixture: ManagedOrganizationsRepositoryFixture;

    const managerOrgUserEmail = "manager-org-user-1-bookings@api.com";
    const managerOrgUserEmail2 = "manager-org-user-2-bookings@api.com";
    const managedOrgUserEmail = "managed-org-user-1-bookings@api.com";
    const nonOrgUserEmail1 = "non-org-user-1-bookings@api.com";
    let managerOrgUser1: User;
    let managerOrgUser2: User;
    let managedOrgUser: User;
    let nonOrgUser1: User;
    let managerOrgTeam1: Team;
    let managedOrgTeam1: Team;

    let managerOrgEventTypeId: number;
    let managedOrgEventTypeId: number;
    let nonOrgEventTypeId: number;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        managerOrgUserEmail,
        Test.createTestingModule({
          imports: [AppModule, OrganizationsTeamsBookingsModule],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .overrideGuard(PlatformPlanGuard)
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
      managedOrganizationsRepositoryFixture = new ManagedOrganizationsRepositoryFixture(moduleRef);

      await setupManagerOrganization();
      await setupManagedOrganization();

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    async function setupManagerOrganization() {
      managerOrganization = await organizationsRepositoryFixture.create({
        name: "organization bookings",
        isPlatform: true,
      });
      managerOrgTeam1 = await teamRepositoryFixture.create({
        name: "team orgs booking 1",
        isOrganization: false,
        parent: { connect: { id: managerOrganization.id } },
      });
      oAuthClient = await createOAuthClient(managerOrganization.id);

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

      managerOrgUser1 = await userRepositoryFixture.create({
        email: managerOrgUserEmail,
        locale: "it",
        name: "orgUser1Bookings",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      managerOrgUser2 = await userRepositoryFixture.create({
        email: managerOrgUserEmail2,
        locale: "it",
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
      await schedulesService.createUserSchedule(managerOrgUser1.id, userSchedule);
      await schedulesService.createUserSchedule(nonOrgUser1.id, userSchedule);
      await schedulesService.createUserSchedule(managerOrgUser2.id, userSchedule);

      const orgEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: managerOrgTeam1.id },
        },
        title: "Collective Event Type",
        slug: "manager-org-bookings-collective-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      await profileRepositoryFixture.create({
        uid: `usr-${managerOrgUser1.id}`,
        username: managerOrgUserEmail,
        organization: {
          connect: {
            id: managerOrganization.id,
          },
        },
        user: {
          connect: {
            id: managerOrgUser1.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${managerOrgUser2.id}`,
        username: managerOrgUserEmail2,
        organization: {
          connect: {
            id: managerOrganization.id,
          },
        },
        user: {
          connect: {
            id: managerOrgUser2.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: managerOrgUser1.id } },
        team: { connect: { id: managerOrganization.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: managerOrgUser2.id } },
        team: { connect: { id: managerOrganization.id } },
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

      managerOrgEventTypeId = orgEventType.id;
      nonOrgEventTypeId = nonOrgEventType.id;

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: managerOrgUser2.id,
          },
        },
        eventType: {
          connect: {
            id: managerOrgEventTypeId,
          },
        },
      });

      await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: managerOrgUser2.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 0, 9, 13, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 9, 14, 0, 0)),
        title: "Manager Org Collective Booking",
        uid: `manager-org-collective-${randomString()}`,
        eventType: {
          connect: {
            id: managerOrgEventTypeId,
          },
        },
        location: "https://meet.google.com/abc-def-ghi",
        customInputs: {},
        metadata: {},
        responses: {
          name: "alice",
          email: "alice@gmail.com",
        },
        attendees: {
          create: {
            email: "alice@gmail.com",
            name: "alice",
            locale: "es",
            timeZone: "Europe/Madrid",
          },
        },
      });

      await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: nonOrgUser1.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 0, 8, 13, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 8, 14, 0, 0)),
        title: "Non-Org Booking 1",
        uid: `non-org-booking-1-${randomString()}`,
        eventType: {
          connect: {
            id: nonOrgEventTypeId,
          },
        },
        location: "https://meet.google.com/jkl-mno-pqr",
        customInputs: {},
        metadata: {},
        responses: {
          name: managerOrgUser2.name ?? "",
          email: managerOrgUserEmail2,
        },
        attendees: {
          create: {
            email: managerOrgUserEmail2,
            name: managerOrgUser2.name ?? "",
            locale: "en",
            timeZone: managerOrgUser2.timeZone ?? "Europe/Madrid",
          },
        },
      });
    }

    async function setupManagedOrganization() {
      managedOrganization = await organizationsRepositoryFixture.create({
        name: "organization bookings",
        isPlatform: true,
      });
      await managedOrganizationsRepositoryFixture.createManagedOrganization(
        managerOrganization.id,
        managedOrganization.id
      );

      managedOrgTeam1 = await teamRepositoryFixture.create({
        name: "managed org team 1",
        isOrganization: false,
        parent: { connect: { id: managedOrganization.id } },
      });

      managedOrgUser = await userRepositoryFixture.create({
        email: managedOrgUserEmail,
        locale: "it",
        name: "ManagedOrgUser1Bookings",
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${managedOrgUser.id}`,
        username: managedOrgUserEmail,
        organization: {
          connect: {
            id: managedOrganization.id,
          },
        },
        user: {
          connect: {
            id: managedOrgUser.id,
          },
        },
      });

      await profileRepositoryFixture.create({
        uid: `usr-${managerOrgUser1.id}`,
        username: managerOrgUserEmail,
        organization: {
          connect: {
            id: managedOrganization.id,
          },
        },
        user: {
          connect: {
            id: managerOrgUser1.id,
          },
        },
      });

      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: managedOrgUser.id } },
        team: { connect: { id: managedOrganization.id } },
        accepted: true,
      });

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: managerOrgUser1.id } },
        team: { connect: { id: managedOrganization.id } },
        accepted: true,
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(managedOrgUser.id, userSchedule);

      const managedOrgEventType = await eventTypesRepositoryFixture.createTeamEventType({
        schedulingType: "COLLECTIVE",
        team: {
          connect: { id: managedOrgTeam1.id },
        },
        title: "Collective Event Type",
        slug: "managed-org-bookings-collective-event-type",
        length: 60,
        assignAllTeamMembers: true,
        bookingFields: [],
        locations: [],
      });

      managedOrgEventTypeId = managedOrgEventType.id;

      await hostsRepositoryFixture.create({
        isFixed: true,
        user: {
          connect: {
            id: managedOrgUser.id,
          },
        },
        eventType: {
          connect: {
            id: managedOrgEventType.id,
          },
        },
      });

      await bookingsRepositoryFixture.create({
        user: {
          connect: {
            id: managedOrgUser.id,
          },
        },
        startTime: new Date(Date.UTC(2030, 0, 11, 13, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 11, 14, 0, 0)),
        title: "Managed Org Booking",
        uid: `managed-org-booking-${randomString()}`,
        eventType: {
          connect: {
            id: managedOrgEventTypeId,
          },
        },
        location: "https://meet.google.com/ghi-jkl-mno",
        customInputs: {},
        metadata: {},
        responses: {
          name: "charlie",
          email: "charlie@gmail.com",
        },
        attendees: {
          create: {
            email: "charlie@gmail.com",
            name: "charlie",
            locale: "en",
            timeZone: "Europe/Madrid",
          },
        },
      });
    }

    describe("get manager organization bookings", () => {
      it("should get bookings by organizationId for manager organization", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${managerOrganization.id}/bookings`)
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
              [managerOrgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });

      it("should get bookings by organizationId and userId", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${managerOrganization.id}/bookings?userIds=${managerOrgUser2.id}`)
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
              [managerOrgEventTypeId, nonOrgEventTypeId].sort()
            );
          });
      });
    });

    describe("get managed organization bookings", () => {
      it("should get bookings by organizationId for managed organization", async () => {
        return request(app.getHttpServer())
          .get(`/v2/organizations/${managedOrganization.id}/bookings`)
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
            expect(data[0].eventTypeId).toEqual(managedOrgEventTypeId);
          });
      });
    });

    async function createOAuthClient(organizationId: number) {
      const data = {
        logo: "logo-url",
        name: "name",
        redirectUris: ["http://localhost:5555"],
        permissions: 32,
        areCalendarEventsEnabled: false,
        areEmailsEnabled: false,
      };
      const secret = "secret";

      const client = await oauthClientRepositoryFixture.create(organizationId, data, secret);
      return client;
    }

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(managerOrganization.id);
      await userRepositoryFixture.deleteByEmail(managerOrgUser1.email);
      await userRepositoryFixture.deleteByEmail(nonOrgUser1.email);
      await bookingsRepositoryFixture.deleteAllBookings(managerOrgUser1.id, managerOrgUser1.email);
      await bookingsRepositoryFixture.deleteAllBookings(nonOrgUser1.id, nonOrgUser1.email);
      await app.close();
    });
  });
});
