import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_08_13 } from "@calcom/platform-constants";
import type { Booking, PlatformOAuthClient, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { CalVideoService } from "@/ee/bookings/2024-08-13/services/cal-video.service";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { UsersModule } from "@/modules/users/users.module";

describe("Bookings Endpoints 2024-08-13", () => {
  describe("Booking access authorization", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let oAuthClient: PlatformOAuthClient;

    const ownerEmail = `booking-access-auth-owner-${randomString()}@api.com`;
    const unauthorizedEmail = `booking-access-auth-unauthorized-${randomString()}@api.com`;
    let ownerUser: User;
    let unauthorizedUser: User;
    let ownerApiKey: string;
    let unauthorizedApiKey: string;

    let eventTypeId: number;
    let testBooking: Booking;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, SchedulesModule_2024_04_15],
      })
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await organizationsRepositoryFixture.create({
        name: `booking-access-auth-organization-${randomString()}`,
      });
      oAuthClient = await createOAuthClient(organization.id);

      ownerUser = await userRepositoryFixture.create({
        email: ownerEmail,
        locale: "en",
        name: `booking-access-auth-owner-${randomString()}`,
      });

      unauthorizedUser = await userRepositoryFixture.create({
        email: unauthorizedEmail,
        locale: "en",
        name: `booking-access-auth-unauthorized-${randomString()}`,
      });

      const { keyString: ownerKeyString } = await apiKeysRepositoryFixture.createApiKey(ownerUser.id, null);
      ownerApiKey = `cal_test_${ownerKeyString}`;

      const { keyString: unauthorizedKeyString } = await apiKeysRepositoryFixture.createApiKey(
        unauthorizedUser.id,
        null
      );
      unauthorizedApiKey = `cal_test_${unauthorizedKeyString}`;

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: `booking-access-auth-schedule-${randomString()}`,
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(ownerUser.id, userSchedule);

      const eventType = await eventTypesRepositoryFixture.create(
        {
          title: `booking-access-auth-event-type-${randomString()}`,
          slug: `booking-access-auth-event-type-${randomString()}`,
          length: 60,
        },
        ownerUser.id
      );
      eventTypeId = eventType.id;

      testBooking = await bookingsRepositoryFixture.create({
        uid: `booking-access-auth-booking-${randomString()}`,
        title: "Test Booking for Access Auth",
        description: "",
        startTime: new Date(Date.UTC(2030, 0, 8, 10, 0, 0)),
        endTime: new Date(Date.UTC(2030, 0, 8, 11, 0, 0)),
        eventType: {
          connect: {
            id: eventTypeId,
          },
        },
        user: {
          connect: {
            id: ownerUser.id,
          },
        },
        metadata: {},
        responses: {
          name: "Test Attendee",
          email: "attendee@example.com",
        },
        references: {
          create: [
            {
              type: "daily_video",
              uid: `daily-room-${randomString()}`,
              meetingId: `daily-room-${randomString()}`,
              meetingPassword: "test-password",
              meetingUrl: `https://daily.co/test-room-${randomString()}`,
            },
          ],
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

    describe("GET /v2/bookings/:bookingUid/conferencing-sessions - Authorization", () => {
      it("should allow booking organizer to access conferencing sessions", async () => {
        const calVideoService = app.get(CalVideoService);
        jest.spyOn(calVideoService, "getVideoSessions").mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get(`/v2/bookings/${testBooking.uid}/conferencing-sessions`)
          .set("Authorization", `Bearer ${ownerApiKey}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        expect(response.body.status).toEqual(SUCCESS_STATUS);
      });

      it("should return 403 when unauthorized user tries to access conferencing sessions", async () => {
        await request(app.getHttpServer())
          .get(`/v2/bookings/${testBooking.uid}/conferencing-sessions`)
          .set("Authorization", `Bearer ${unauthorizedApiKey}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);
      });
    });

    describe("GET /v2/bookings/:bookingUid/recordings - Authorization", () => {
      it("should allow booking organizer to access recordings", async () => {
        const calVideoService = app.get(CalVideoService);
        jest.spyOn(calVideoService, "getRecordings").mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get(`/v2/bookings/${testBooking.uid}/recordings`)
          .set("Authorization", `Bearer ${ownerApiKey}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        expect(response.body.status).toEqual(SUCCESS_STATUS);
      });

      it("should return 403 when unauthorized user tries to access recordings", async () => {
        await request(app.getHttpServer())
          .get(`/v2/bookings/${testBooking.uid}/recordings`)
          .set("Authorization", `Bearer ${unauthorizedApiKey}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);
      });
    });

    describe("GET /v2/bookings/:bookingUid/transcripts - Authorization", () => {
      it("should allow booking organizer to access transcripts", async () => {
        const calVideoService = app.get(CalVideoService);
        jest.spyOn(calVideoService, "getTranscripts").mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get(`/v2/bookings/${testBooking.uid}/transcripts`)
          .set("Authorization", `Bearer ${ownerApiKey}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(200);

        expect(response.body.status).toEqual(SUCCESS_STATUS);
      });

      it("should return 403 when unauthorized user tries to access transcripts", async () => {
        await request(app.getHttpServer())
          .get(`/v2/bookings/${testBooking.uid}/transcripts`)
          .set("Authorization", `Bearer ${unauthorizedApiKey}`)
          .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
          .expect(403);
      });
    });

    afterAll(async () => {
      await bookingsRepositoryFixture.deleteById(testBooking.id);
      await eventTypesRepositoryFixture.delete(eventTypeId);
      await userRepositoryFixture.deleteByEmail(ownerEmail);
      await userRepositoryFixture.deleteByEmail(unauthorizedEmail);
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await app.close();
    });
  });
});
