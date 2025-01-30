import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { CreateScheduleInput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/inputs/create-schedule.input";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { CustomThrottlerGuard } from "@/lib/throttler/throttler-guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { CreateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { RateLimit, User } from "@prisma/client";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { BookingsRepositoryFixture } from "test/fixtures/repository/bookings.repository.fixture";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OAuthClientRepositoryFixture } from "test/fixtures/repository/oauth-client.repository.fixture";
import { RateLimitRepositoryFixture } from "test/fixtures/repository/rate-limit.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomNumber } from "test/utils/randomNumber";
import { withApiAuth } from "test/utils/withApiAuth";

import { CAL_API_VERSION_HEADER, VERSION_2024_08_13, X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { CreateBookingInput_2024_08_13, BookingOutput_2024_08_13 } from "@calcom/platform-types";
import { PlatformOAuthClient, Team } from "@calcom/prisma/client";

describe("Custom throttler", () => {
  describe("Bookings throttler", () => {
    let app: INestApplication;
    let organization: Team;

    let userRepositoryFixture: UserRepositoryFixture;
    let bookingsRepositoryFixture: BookingsRepositoryFixture;
    let schedulesService: SchedulesService_2024_04_15;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let oauthClientRepositoryFixture: OAuthClientRepositoryFixture;
    let oAuthClient: PlatformOAuthClient;
    let teamRepositoryFixture: TeamRepositoryFixture;
    let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
    let rateLimitRepositoryFixture: RateLimitRepositoryFixture;
    let membershipsRepositoryFixture: MembershipRepositoryFixture;

    const userEmail = "bookings-controller-e2e@api.com";
    let user: User;

    let eventTypeId: number;
    const eventTypeSlug = "peer-coding";

    let apiKeyString: string;

    let managedUserId: number;
    let managedUserEmail: string;

    let rateLimit: RateLimit;
    let apiKeyStringWithRateLimit: string;

    let apiKeyStringWithMultipleLimits: string;
    let firstRateLimitWithMultipleLimits: RateLimit;
    let secondRateLimitWithMultipleLimits: RateLimit;

    const mockDefaultLimitByTracker = 10;
    const mockDefaultLimit = 5;
    const mockDefaultTtl = 2500;
    const mockDefaultBlockDuration = 5000;

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

      jest
        .spyOn(CustomThrottlerGuard.prototype, "getDefaultLimitByTracker")
        .mockReturnValue(mockDefaultLimitByTracker);
      jest.spyOn(CustomThrottlerGuard.prototype, "getDefaultLimit").mockReturnValue(mockDefaultLimit);
      jest.spyOn(CustomThrottlerGuard.prototype, "getDefaultTtl").mockReturnValue(mockDefaultTtl);
      jest
        .spyOn(CustomThrottlerGuard.prototype, "getDefaultBlockDuration")
        .mockReturnValue(mockDefaultBlockDuration);

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      bookingsRepositoryFixture = new BookingsRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);
      oauthClientRepositoryFixture = new OAuthClientRepositoryFixture(moduleRef);
      teamRepositoryFixture = new TeamRepositoryFixture(moduleRef);
      schedulesService = moduleRef.get<SchedulesService_2024_04_15>(SchedulesService_2024_04_15);

      organization = await teamRepositoryFixture.create({
        name: "organization bookings",
        isOrganization: true,
        isPlatform: true,
      });
      oAuthClient = await createOAuthClient(organization.id);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: `bob-${Math.floor(Math.random() * 1000)}@gmail.com`,
        platformOAuthClients: {
          connect: {
            id: oAuthClient.id,
          },
        },
        organization: { connect: { id: organization.id } },
      });

      const userSchedule: CreateScheduleInput_2024_04_15 = {
        name: "working time",
        timeZone: "Europe/Rome",
        isDefault: true,
      };
      await schedulesService.createUserSchedule(user.id, userSchedule);
      const event = await eventTypesRepositoryFixture.create(
        { title: "peer coding", slug: eventTypeSlug, length: 10 },
        user.id
      );
      eventTypeId = event.id;

      apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
      const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
      apiKeyString = `cal_test_${keyString}`;

      rateLimitRepositoryFixture = new RateLimitRepositoryFixture(moduleRef);
      const { apiKey, keyString: keyStringWithRateLimit } = await apiKeysRepositoryFixture.createApiKey(
        user.id,
        null
      );
      apiKeyStringWithRateLimit = `cal_test_${keyStringWithRateLimit}`;
      rateLimit = await rateLimitRepositoryFixture.createRateLimit("long", apiKey.id, 2000, 3, 4000);

      const { apiKey: apiKeyWithMultipleLimits, keyString: keyStringWithMultipleLimits } =
        await apiKeysRepositoryFixture.createApiKey(user.id, null);
      apiKeyStringWithMultipleLimits = `cal_test_${keyStringWithMultipleLimits}`;
      firstRateLimitWithMultipleLimits = await rateLimitRepositoryFixture.createRateLimit(
        "short",
        apiKeyWithMultipleLimits.id,
        1000,
        2,
        2000
      );
      secondRateLimitWithMultipleLimits = await rateLimitRepositoryFixture.createRateLimit(
        "long",
        apiKeyWithMultipleLimits.id,
        2000,
        3,
        4000
      );

      membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

      await membershipsRepositoryFixture.create({
        role: "OWNER",
        user: { connect: { id: user.id } },
        team: { connect: { id: organization.id } },
        accepted: true,
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

    beforeEach(async () => {
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      if (managedUserId) {
        await bookingsRepositoryFixture.deleteAllBookings(managedUserId, managedUserEmail);
      }
    });

    afterEach(async () => {
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      if (managedUserId) {
        await bookingsRepositoryFixture.deleteAllBookings(managedUserId, managedUserEmail);
      }
    });

    describe("api key", () => {
      it(
        "api key with default rate limit - should enforce rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimitByTracker;
          const blockDuration = mockDefaultBlockDuration;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set("Authorization", `Bearer ${apiKeyString}`)
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Authorization", `Bearer ${apiKeyString}`)
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );

      it(
        "api key with custom rate limit - should enforce rate limits and reset after block duration",
        async () => {
          const limit = rateLimit.limit;
          const blockDuration = rateLimit.blockDuration;
          const name = rateLimit.name;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set({ Authorization: `Bearer ${apiKeyStringWithRateLimit}` })
              .expect(201);

            expect(response.headers[`x-ratelimit-limit-${name}`]).toBe(limit.toString());
            expect(response.headers[`x-ratelimit-remaining-${name}`]).toBe((limit - i).toString());
            expect(Number(response.headers[`x-ratelimit-reset-${name}`])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Authorization", `Bearer ${apiKeyStringWithRateLimit}`)
            .expect(429);

          expect(blockedResponse.headers[`x-ratelimit-limit-${name}`]).toBe(limit.toString());
          expect(blockedResponse.headers[`x-ratelimit-remaining-${name}`]).toBe("0");
          expect(Number(blockedResponse.headers[`x-ratelimit-reset-${name}`])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set("Authorization", `Bearer ${apiKeyStringWithRateLimit}`)
            .expect(201);

          expect(afterBlockResponse.headers[`x-ratelimit-limit-${name}`]).toBe(limit.toString());
          expect(afterBlockResponse.headers[`x-ratelimit-remaining-${name}`]).toBe((limit - 1).toString());
          expect(Number(afterBlockResponse.headers[`x-ratelimit-reset-${name}`])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );

      it(
        "api key with multiple rate limits - should enforce both short and long rate limits",
        async () => {
          const shortLimit = firstRateLimitWithMultipleLimits.limit;
          const longLimit = secondRateLimitWithMultipleLimits.limit;
          const shortName = firstRateLimitWithMultipleLimits.name;
          const longName = secondRateLimitWithMultipleLimits.name;
          const shortBlock = firstRateLimitWithMultipleLimits.blockDuration;
          const longBlock = secondRateLimitWithMultipleLimits.blockDuration;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          let requestsMade = 0;
          // note(Lauris): exhaust short limit to have remaining 0 for it
          for (let i = 1; i <= shortLimit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
              .expect(201);

            requestsMade++;

            expect(response.headers[`x-ratelimit-limit-${shortName}`]).toBe(shortLimit.toString());
            expect(response.headers[`x-ratelimit-remaining-${shortName}`]).toBe((shortLimit - i).toString());
            expect(Number(response.headers[`x-ratelimit-reset-${shortName}`])).toBeGreaterThan(0);

            expect(response.headers[`x-ratelimit-limit-${longName}`]).toBe(longLimit.toString());
            expect(response.headers[`x-ratelimit-remaining-${longName}`]).toBe((longLimit - i).toString());
            expect(Number(response.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          // note(Lauris): short limit exhausted, now exhaust long limit to have remaining 0 for it
          for (let i = requestsMade; i < longLimit; i++) {
            const responseAfterShortLimit = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
              .expect(201);

            requestsMade++;

            expect(responseAfterShortLimit.headers[`x-ratelimit-limit-${shortName}`]).toBe(
              shortLimit.toString()
            );
            expect(responseAfterShortLimit.headers[`x-ratelimit-remaining-${shortName}`]).toBe("0");
            expect(Number(responseAfterShortLimit.headers[`x-ratelimit-reset-${shortName}`])).toBeGreaterThan(
              0
            );

            expect(responseAfterShortLimit.headers[`x-ratelimit-limit-${longName}`]).toBe(
              longLimit.toString()
            );
            expect(responseAfterShortLimit.headers[`x-ratelimit-remaining-${longName}`]).toBe(
              (longLimit - requestsMade).toString()
            );
            expect(Number(responseAfterShortLimit.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThan(
              0
            );
            await bookingsRepositoryFixture.deleteById(responseAfterShortLimit.body.data.id);
          }

          // note(Lauris): both have remaining 0 so now exceed both
          const blockedResponseLong = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
            .expect(429);

          expect(blockedResponseLong.headers[`x-ratelimit-limit-${shortName}`]).toBe(shortLimit.toString());
          expect(blockedResponseLong.headers[`x-ratelimit-remaining-${shortName}`]).toBe("0");
          expect(
            Number(blockedResponseLong.headers[`x-ratelimit-reset-${shortName}`])
          ).toBeGreaterThanOrEqual(firstRateLimitWithMultipleLimits.blockDuration / 1000);

          expect(blockedResponseLong.headers[`x-ratelimit-limit-${longName}`]).toBe(longLimit.toString());
          expect(blockedResponseLong.headers[`x-ratelimit-remaining-${longName}`]).toBe("0");
          expect(Number(blockedResponseLong.headers[`x-ratelimit-reset-${longName}`])).toBeGreaterThanOrEqual(
            secondRateLimitWithMultipleLimits.blockDuration / 1000
          );

          // note(Lauris): wait for short limit to reset
          await new Promise((resolve) => setTimeout(resolve, shortBlock));
          const responseAfterShortLimitReload = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
            .expect(201);

          expect(responseAfterShortLimitReload.headers[`x-ratelimit-limit-${shortName}`]).toBe(
            shortLimit.toString()
          );
          expect(responseAfterShortLimitReload.headers[`x-ratelimit-remaining-${shortName}`]).toBe(
            (shortLimit - 1).toString()
          );
          expect(
            Number(responseAfterShortLimitReload.headers[`x-ratelimit-reset-${shortName}`])
          ).toBeGreaterThan(0);
          expect(responseAfterShortLimitReload.headers[`x-ratelimit-limit-${longName}`]).toBe(
            longLimit.toString()
          );
          expect(responseAfterShortLimitReload.headers[`x-ratelimit-remaining-${longName}`]).toBe(
            (longLimit - requestsMade).toString()
          );
          expect(
            Number(responseAfterShortLimitReload.headers[`x-ratelimit-reset-${longName}`])
          ).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(responseAfterShortLimitReload.body.data.id);

          // note(Lauris): wait for long limit to reset
          await new Promise((resolve) => setTimeout(resolve, longBlock));
          const responseAfterLongLimitReload = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${apiKeyStringWithMultipleLimits}` })
            .expect(201);

          expect(responseAfterLongLimitReload.headers[`x-ratelimit-limit-${shortName}`]).toBe(
            shortLimit.toString()
          );
          expect(responseAfterLongLimitReload.headers[`x-ratelimit-remaining-${shortName}`]).toBe(
            (shortLimit - 1).toString()
          );
          expect(
            Number(responseAfterLongLimitReload.headers[`x-ratelimit-reset-${shortName}`])
          ).toBeGreaterThan(0);
          expect(responseAfterLongLimitReload.headers[`x-ratelimit-limit-${longName}`]).toBe(
            longLimit.toString()
          );
          expect(responseAfterLongLimitReload.headers[`x-ratelimit-remaining-${longName}`]).toBe(
            (longLimit - 1).toString()
          );
          expect(
            Number(responseAfterLongLimitReload.headers[`x-ratelimit-reset-${longName}`])
          ).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(responseAfterLongLimitReload.body.data.id);
        },
        30 * 1000
      );

      it(
        "invalid api key - should enforce default rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimit;
          const blockDuration = mockDefaultBlockDuration;

          const invalidApiKey = `cal_test_invalid_key-${randomNumber()}`;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set({ Authorization: `Bearer ${invalidApiKey}` })
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${invalidApiKey}` })
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${invalidApiKey}` })
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );
    });

    describe("OAuth client", () => {
      it(
        "valid OAuth client - should enforce OAuth client rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimitByTracker;
          const blockDuration = mockDefaultBlockDuration;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set(X_CAL_CLIENT_ID, oAuthClient.id)
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set(X_CAL_CLIENT_ID, oAuthClient.id)
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set(X_CAL_CLIENT_ID, oAuthClient.id)
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );

      it(
        "invalid OAuth client - should enforce default rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimit;
          const blockDuration = mockDefaultBlockDuration;
          const invalidOAuthClientId = `invalidOAuthClientId-${randomNumber()}`;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set(X_CAL_CLIENT_ID, invalidOAuthClientId)
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set(X_CAL_CLIENT_ID, invalidOAuthClientId)
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set(X_CAL_CLIENT_ID, invalidOAuthClientId)
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );
    });

    describe("Access token", () => {
      it(
        "valid access token - should enforce access token rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimitByTracker;
          const blockDuration = mockDefaultBlockDuration;

          console.log("asap oAuthClient 111", oAuthClient);

          const requestBody: CreateManagedUserInput = {
            email: `alice+${randomNumber()}@example.com`,
            timeZone: "Europe/Rome",
            weekStart: "Monday",
            timeFormat: 24,
            name: "Alice Smith",
          };

          const response = await request(app.getHttpServer())
            .post(`/api/v2/oauth-clients/${oAuthClient.id}/users`)
            .set("x-cal-secret-key", oAuthClient.secret)
            .send(requestBody)
            .expect(201);

          const responseBody: CreateManagedUserOutput = response.body;

          const validAccessToken = responseBody.data.accessToken;
          const responseManagedUserId = responseBody.data.user.id;
          expect(validAccessToken).toBeDefined();
          expect(responseManagedUserId).toBeDefined();
          managedUserId = responseManagedUserId;
          managedUserEmail = responseBody.data.user.email;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set({ Authorization: `Bearer ${validAccessToken}` })
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${validAccessToken}` })
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${validAccessToken}` })
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );

      it(
        "invalid access token - should enforce default rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimit;
          const blockDuration = mockDefaultBlockDuration;
          const invalidAccessToken = `invalidAccessToken-${randomNumber()}`;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .set({ Authorization: `Bearer ${invalidAccessToken}` })
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${invalidAccessToken}` })
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .set({ Authorization: `Bearer ${invalidAccessToken}` })
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );
    });

    describe("No auth", () => {
      it(
        "no auth - should enforce default rate limits and reset after block duration",
        async () => {
          const limit = mockDefaultLimit;
          const blockDuration = mockDefaultBlockDuration;

          const body: CreateBookingInput_2024_08_13 = {
            start: new Date(Date.UTC(2030, 0, 8, 9, 0, 0)).toISOString(),
            eventTypeId,
            attendee: {
              name: "Mr Proper",
              email: "mr_proper@gmail.com",
              timeZone: "Europe/Rome",
              language: "it",
            },
            location: "https://meet.google.com/abc-def-ghi",
            bookingFieldsResponses: {
              customField: "customValue",
            },
            metadata: {
              userId: "100",
            },
            guests: ["bob@gmail.com"],
          };

          for (let i = 1; i <= limit; i++) {
            const response = await request(app.getHttpServer())
              .post("/v2/bookings")
              .send(body)
              .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
              .expect(201);

            expect(response.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
            expect(response.headers["x-ratelimit-remaining-create-booking"]).toBe((limit - i).toString());
            expect(Number(response.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
            await bookingsRepositoryFixture.deleteById(response.body.data.id);
          }

          const blockedResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(429);

          expect(blockedResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(blockedResponse.headers["x-ratelimit-remaining-create-booking"]).toBe("0");
          expect(Number(blockedResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThanOrEqual(
            blockDuration / 1000
          );

          await new Promise((resolve) => setTimeout(resolve, blockDuration));

          const afterBlockResponse = await request(app.getHttpServer())
            .post("/v2/bookings")
            .send(body)
            .set(CAL_API_VERSION_HEADER, VERSION_2024_08_13)
            .expect(201);

          expect(afterBlockResponse.headers["x-ratelimit-limit-create-booking"]).toBe(limit.toString());
          expect(afterBlockResponse.headers["x-ratelimit-remaining-create-booking"]).toBe(
            (limit - 1).toString()
          );
          expect(Number(afterBlockResponse.headers["x-ratelimit-reset-create-booking"])).toBeGreaterThan(0);
          await bookingsRepositoryFixture.deleteById(afterBlockResponse.body.data.id);
        },
        15 * 1000
      );
    });

    afterAll(async () => {
      await oauthClientRepositoryFixture.delete(oAuthClient.id);
      await teamRepositoryFixture.delete(organization.id);
      await userRepositoryFixture.deleteByEmail(user.email);
      if (managedUserId) {
        await userRepositoryFixture.delete(managedUserId);
      }
      await bookingsRepositoryFixture.deleteAllBookings(user.id, user.email);
      await app.close();
    });
  });
});
