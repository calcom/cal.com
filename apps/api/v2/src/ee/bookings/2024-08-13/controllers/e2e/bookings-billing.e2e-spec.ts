import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type { BookingOutput_2024_08_13, CreateBookingInput_2024_08_13 } from "@calcom/platform-types";
import type { PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CreateBookingOutput_2024_08_13 } from "@/ee/bookings/2024-08-13/outputs/create-booking.output";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { BillingService } from "@/modules/billing/services/billing.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

const CLIENT_REDIRECT_URI = "http://localhost:4321";

describe("Bookings Billing E2E - 2024-08-13", () => {
  describe("Regular user (non-platform-managed)", () => {
    jest.setTimeout(30000);
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let billingService: BillingService;
    let increaseUsageSpy: jest.SpyInstance;
    let cancelUsageSpy: jest.SpyInstance;

    const userEmail = `billing-regular-user-2024-08-13-${randomString()}@api.com`;
    let user: User;
    let eventTypeId: number;

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
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);
      billingService = moduleRef.get<BillingService>(BillingService);

      // Spy on the billing service methods
      increaseUsageSpy = jest.spyOn(billingService, "increaseUsageByUserId");
      cancelUsageSpy = jest.spyOn(billingService, "cancelUsageByBookingUid");

      // Create a regular user (not platform-managed)
      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        isPlatformManaged: false,
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `billing-test-schedule-2024-08-13-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `billing-test-event-type-2024-08-13-${randomString()}`,
          slug: `billing-test-event-type-2024-08-13-${randomString()}`,
          length: 60,
        },
        user.id
      );
      eventTypeId = event.id;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    afterAll(async () => {
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await userRepositoryFixture.deleteByEmail(user.email);
      await app.close();
    });

    it("should NOT call billing service when creating a booking for a regular user", async () => {
      increaseUsageSpy.mockClear();

      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 4, 21, 9, 30, 0)).toISOString(),
        eventTypeId: eventTypeId,
        attendee: {
          name: "Test Attendee",
          email: "attendee-billing-2024-08-13@example.com",
          timeZone: "Europe/London",
          language: "en",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      const response = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const responseBody: CreateBookingOutput_2024_08_13 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();

      // Verify billing service was NOT called for regular user
      expect(increaseUsageSpy).not.toHaveBeenCalled();
    });

    it("should NOT call billing cancel service when cancelling a booking for a regular user", async () => {
      // First create a booking
      const createBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 4, 22, 9, 30, 0)).toISOString(),
        eventTypeId: eventTypeId,
        attendee: {
          name: "Test Attendee Cancel",
          email: "attendee-cancel-billing-2024-08-13@example.com",
          timeZone: "Europe/London",
          language: "en",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
      const data = createResponseBody.data as BookingOutput_2024_08_13;
      const bookingUid = data.uid;

      // Clear the spy before cancelling
      cancelUsageSpy.mockClear();

      // Cancel the booking
      await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/cancel`)
        .send({})
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      // Verify billing cancel service was NOT called for regular user
      expect(cancelUsageSpy).not.toHaveBeenCalled();
    });
  });

  describe("Platform-managed user", () => {
    jest.setTimeout(30000);
    let app: INestApplication;
    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;
    let billingService: BillingService;
    let increaseUsageSpy: jest.SpyInstance;
    let cancelUsageSpy: jest.SpyInstance;

    const platformAdminEmail = `billing-platform-admin-2024-08-13-${randomString()}@api.com`;
    const managedUserEmail = `billing-managed-user-2024-08-13-${randomString()}@api.com`;
    let platformAdmin: User;
    let managedUser: User;
    let organization: Team;
    let oAuthClient: PlatformOAuthClient;
    let eventTypeId: number;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        managedUserEmail,
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
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);
      billingService = moduleRef.get<BillingService>(BillingService);

      // Spy on the billing service methods
      increaseUsageSpy = jest.spyOn(billingService, "increaseUsageByUserId");
      cancelUsageSpy = jest.spyOn(billingService, "cancelUsageByBookingUid");

      // Create platform admin
      platformAdmin = await userRepositoryFixture.create({ email: platformAdminEmail });

      // Create organization
      organization = await teamRepositoryFixture.create({
        name: `billing-test-organization-2024-08-13-${randomString()}`,
        isPlatform: true,
        isOrganization: true,
      });

      // Create OAuth client
      oAuthClient = await oauthClientRepositoryFixture.create(
        organization.id,
        {
          logo: "logo-url",
          name: "billing-test-oauth-client-2024-08-13",
          redirectUris: [CLIENT_REDIRECT_URI],
          permissions: 1023,
        },
        "secret"
      );

      // Create profile for platform admin
      await profilesRepositoryFixture.create({
        uid: `billing-test-profile-2024-08-13-${randomString()}`,
        username: platformAdminEmail,
        organization: { connect: { id: organization.id } },
        user: { connect: { id: platformAdmin.id } },
      });

      // Create membership for platform admin
      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: platformAdmin.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      // Create a platform-managed user
      managedUser = await userRepositoryFixture.create({
        email: managedUserEmail,
        username: managedUserEmail,
        isPlatformManaged: true,
        platformOAuthClients: {
          connect: { id: oAuthClient.id },
        },
      });

      // Create profile for managed user
      await profilesRepositoryFixture.create({
        uid: `billing-managed-user-profile-2024-08-13-${randomString()}`,
        username: managedUserEmail,
        organization: { connect: { id: organization.id } },
        user: { connect: { id: managedUser.id } },
      });

      // Create membership for managed user
      await membershipsRepositoryFixture.create({
        role: "MEMBER",
        user: { connect: { id: managedUser.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `billing-managed-user-schedule-2024-08-13-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(managedUser.id, userSchedule);

      const event = await eventTypesRepositoryFixture.create(
        {
          title: `billing-managed-user-event-type-2024-08-13-${randomString()}`,
          slug: `billing-managed-user-event-type-2024-08-13-${randomString()}`,
          length: 60,
        },
        managedUser.id
      );
      eventTypeId = event.id;

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);
      await app.init();
    });

    afterAll(async () => {
      await bookingsRepositoryFixture.deleteAllBookings(managedUser.id, managedUser.email);
      await userRepositoryFixture.deleteByEmail(managedUser.email);
      await userRepositoryFixture.deleteByEmail(platformAdmin.email);
      await app.close();
    });

    it("should call billing service when creating a booking for a platform-managed user", async () => {
      increaseUsageSpy.mockClear();

      const body: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 4, 21, 9, 30, 0)).toISOString(),
        eventTypeId: eventTypeId,
        attendee: {
          name: "Test Attendee",
          email: "attendee-billing-managed-2024-08-13@example.com",
          timeZone: "Europe/London",
          language: "en",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      const response = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(body)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const responseBody: CreateBookingOutput_2024_08_13 = response.body;
      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();

      const data = responseBody.data as BookingOutput_2024_08_13;

      // Verify billing service WAS called for platform-managed user
      expect(increaseUsageSpy).toHaveBeenCalledTimes(1);
      expect(increaseUsageSpy).toHaveBeenCalledWith(
        managedUser.id,
        expect.objectContaining({
          uid: data.uid,
          startTime: expect.any(Date),
        })
      );
    });

    it("should call billing cancel service when cancelling a booking for a platform-managed user", async () => {
      // First create a booking
      const createBody: CreateBookingInput_2024_08_13 = {
        start: new Date(Date.UTC(2040, 4, 22, 9, 30, 0)).toISOString(),
        eventTypeId: eventTypeId,
        attendee: {
          name: "Test Attendee Cancel",
          email: "attendee-cancel-managed-2024-08-13@example.com",
          timeZone: "Europe/London",
          language: "en",
        },
        location: "https://meet.google.com/abc-def-ghi",
      };

      const createResponse = await request(app.getHttpServer())
        .post("/v2/bookings")
        .send(createBody)
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(201);

      const createResponseBody: CreateBookingOutput_2024_08_13 = createResponse.body;
      const data = createResponseBody.data as BookingOutput_2024_08_13;
      const bookingUid = data.uid;

      // Clear the spy before cancelling
      cancelUsageSpy.mockClear();

      // Cancel the booking
      await request(app.getHttpServer())
        .post(`/v2/bookings/${bookingUid}/cancel`)
        .send({})
        .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
        .expect(200);

      // Verify billing cancel service WAS called for platform-managed user
      expect(cancelUsageSpy).toHaveBeenCalledTimes(1);
      expect(cancelUsageSpy).toHaveBeenCalledWith(bookingUid);
    });
  });
});
