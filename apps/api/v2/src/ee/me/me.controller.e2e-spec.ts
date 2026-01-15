import { CAL_API_VERSION_HEADER, SUCCESS_STATUS, VERSION_2024_06_14 } from "@calcom/platform-constants";
import type { ApiSuccessResponse, EventTypeOutput_2024_06_14, UserResponse } from "@calcom/platform-types";
import type { EventType, Team, User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { EventTypesRepositoryFixture } from "test/fixtures/repository/event-types.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { SchedulesRepositoryFixture } from "test/fixtures/repository/schedules.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { EventTypesModule_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.module";
import { SchedulesModule_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/schedules.module";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersModule } from "@/modules/users/users.module";

describe("Me Endpoints", () => {
  describe("User Authentication", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let schedulesRepositoryFixture: SchedulesRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    const userEmail = `me-controller-user-${randomString()}@api.com`;
    const name = "Me Controller User";
    let user: User;
    let org: Team;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [AppModule, PrismaModule, UsersModule, TokensModule, SchedulesModule_2024_04_15],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);

      schedulesRepositoryFixture = new SchedulesRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        name,
      });

      org = await organizationsRepositoryFixture.create({
        name: `me-controller-organization-${randomString()}`,
        isOrganization: true,
        isPlatform: true,
      });

      await profilesRepositoryFixture.create({
        uid: "asd-asd",
        username: userEmail,
        user: { connect: { id: user.id } },
        organization: { connect: { id: org.id } },
        movedFromUser: { connect: { id: user.id } },
      });

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
    });

    it("should get user associated with access token", async () => {
      return request(app.getHttpServer())
        .get("/v2/me")
        .expect(200)
        .then((response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.id).toEqual(user.id);
          expect(responseBody.data.email).toEqual(user.email);
          expect(responseBody.data.name).toEqual(user.name);
          expect(responseBody.data.avatarUrl).toEqual(user.avatarUrl);
          expect(responseBody.data.bio).toEqual(user.bio);
          expect(responseBody.data.timeFormat).toEqual(user.timeFormat);
          expect(responseBody.data.defaultScheduleId).toEqual(user.defaultScheduleId);
          expect(responseBody.data.weekStart).toEqual(user.weekStart);
          expect(responseBody.data.timeZone).toEqual(user.timeZone);
          expect(responseBody.data.organization?.isPlatform).toEqual(true);
          expect(responseBody.data.organization?.id).toEqual(org.id);
        });
    });

    it("should update user associated with access token", async () => {
      const body: UpdateManagedUserInput = { timeZone: "Europe/Rome" };

      return request(app.getHttpServer())
        .patch("/v2/me")
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.id).toEqual(user.id);
          expect(responseBody.data.email).toEqual(user.email);
          expect(responseBody.data.avatarUrl).toEqual(user.avatarUrl);
          expect(responseBody.data.bio).toEqual(user.bio);
          expect(responseBody.data.timeFormat).toEqual(user.timeFormat);
          expect(responseBody.data.defaultScheduleId).toEqual(user.defaultScheduleId);
          expect(responseBody.data.weekStart).toEqual(user.weekStart);
          expect(responseBody.data.timeZone).toEqual(body.timeZone);

          if (user.defaultScheduleId) {
            const defaultSchedule = await schedulesRepositoryFixture.getById(user.defaultScheduleId);
            expect(defaultSchedule?.timeZone).toEqual(body.timeZone);
          }
        });
    });

    it("should update user associated with access token given badly formatted timezone", async () => {
      const bodyWithBadlyFormattedTimeZone: UpdateManagedUserInput = { timeZone: "America/New_york" };

      return request(app.getHttpServer())
        .patch("/v2/me")
        .send(bodyWithBadlyFormattedTimeZone)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.timeZone).toEqual("America/New_York");
        });
    });

    it("should not update user associated with access token given invalid timezone", async () => {
      const bodyWithIncorrectTimeZone: UpdateManagedUserInput = { timeZone: "Narnia/Woods" };

      return request(app.getHttpServer()).patch("/v2/me").send(bodyWithIncorrectTimeZone).expect(400);
    });

    it("should not update user associated with access token given invalid time format", async () => {
      const bodyWithIncorrectTimeFormat = { timeFormat: 100 };

      return request(app.getHttpServer()).patch("/v2/me").send(bodyWithIncorrectTimeFormat).expect(400);
    });

    it("should not update user associated with access token given invalid week start", async () => {
      const bodyWithIncorrectWeekStart = { weekStart: "waba luba dub dub" };

      return request(app.getHttpServer()).patch("/v2/me").send(bodyWithIncorrectWeekStart).expect(400);
    });

    it("should not update primary email without verification when email-verification is enabled", async () => {
      const newEmail = `new-email-${randomString()}@api.com`;
      const body: UpdateManagedUserInput = { email: newEmail };

      return request(app.getHttpServer())
        .patch("/v2/me")
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.email).toEqual(user.email);

          const updatedUser = await userRepositoryFixture.get(user.id);
          expect(updatedUser?.email).toEqual(user.email);
          expect(updatedUser?.metadata).toHaveProperty("emailChangeWaitingForVerification", newEmail);
        });
    });

    it("should update primary email immediately when changing to a verified secondary email", async () => {
      const verifiedSecondaryEmail = `verified-secondary-${randomString()}@api.com`;

      await userRepositoryFixture.createSecondaryEmail(user.id, verifiedSecondaryEmail, new Date());

      const body: UpdateManagedUserInput = { email: verifiedSecondaryEmail };

      return request(app.getHttpServer())
        .patch("/v2/me")
        .send(body)
        .expect(200)
        .then(async (response) => {
          const responseBody: ApiSuccessResponse<UserResponse> = response.body;
          expect(responseBody.status).toEqual(SUCCESS_STATUS);

          expect(responseBody.data.email).toEqual(verifiedSecondaryEmail);

          const updatedUser = await userRepositoryFixture.get(user.id);
          expect(updatedUser?.email).toEqual(verifiedSecondaryEmail);
        });
    });

    afterAll(async () => {
      await userRepositoryFixture.delete(user.id);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });

  describe("Event Types", () => {
    let app: INestApplication;

    let userRepositoryFixture: UserRepositoryFixture;
    let eventTypesRepositoryFixture: EventTypesRepositoryFixture;
    let organizationsRepositoryFixture: OrganizationRepositoryFixture;
    let profilesRepositoryFixture: ProfileRepositoryFixture;

    const userEmail = `me-event-types-user-${randomString()}@api.com`;
    const name = "Me Event Types User";
    let user: User;
    let org: Team;
    let eventType1: EventType;
    let eventType2: EventType;
    let hiddenEventType: EventType;

    beforeAll(async () => {
      const moduleRef = await withApiAuth(
        userEmail,
        Test.createTestingModule({
          imports: [
            AppModule,
            PrismaModule,
            UsersModule,
            TokensModule,
            SchedulesModule_2024_04_15,
            EventTypesModule_2024_06_14,
          ],
        })
      )
        .overrideGuard(PermissionsGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

      userRepositoryFixture = new UserRepositoryFixture(moduleRef);
      organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
      profilesRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
      eventTypesRepositoryFixture = new EventTypesRepositoryFixture(moduleRef);

      user = await userRepositoryFixture.create({
        email: userEmail,
        username: userEmail,
        name,
      });

      org = await organizationsRepositoryFixture.create({
        name: `me-event-types-organization-${randomString()}`,
        isOrganization: true,
        isPlatform: true,
      });

      await profilesRepositoryFixture.create({
        uid: `me-event-types-${randomString()}`,
        username: userEmail,
        user: { connect: { id: user.id } },
        organization: { connect: { id: org.id } },
        movedFromUser: { connect: { id: user.id } },
      });

      eventType1 = await eventTypesRepositoryFixture.create(
        {
          title: `me-event-type-1-${randomString()}`,
          slug: `me-event-type-1-${randomString()}`,
          length: 30,
          locations: [],
        },
        user.id
      );

      eventType2 = await eventTypesRepositoryFixture.create(
        {
          title: `me-event-type-2-${randomString()}`,
          slug: `me-event-type-2-${randomString()}`,
          length: 60,
          locations: [],
        },
        user.id
      );

      hiddenEventType = await eventTypesRepositoryFixture.create(
        {
          title: `me-hidden-event-type-${randomString()}`,
          slug: `me-hidden-event-type-${randomString()}`,
          length: 45,
          locations: [],
          hidden: true,
        },
        user.id
      );

      app = moduleRef.createNestApplication();
      bootstrap(app as NestExpressApplication);

      await app.init();
    });

    it("should be defined", () => {
      expect(userRepositoryFixture).toBeDefined();
      expect(eventTypesRepositoryFixture).toBeDefined();
      expect(user).toBeDefined();
      expect(eventType1).toBeDefined();
      expect(eventType2).toBeDefined();
      expect(hiddenEventType).toBeDefined();
    });

    it("should get authenticated user's event types", async () => {
      const response = await request(app.getHttpServer())
        .get("/v2/me/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(3);

      const ids = responseBody.data.map((et) => et.id);
      expect(ids).toContain(eventType1.id);
      expect(ids).toContain(eventType2.id);
      expect(ids).toContain(hiddenEventType.id);
    });

    it("should include hidden event types for the owner", async () => {
      const response = await request(app.getHttpServer())
        .get("/v2/me/event-types")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);

      const hiddenEventTypeResponse = responseBody.data?.find((et) => et.id === hiddenEventType.id);
      expect(hiddenEventTypeResponse).toBeDefined();
      expect(hiddenEventTypeResponse?.hidden).toEqual(true);
    });

    it("should return event types sorted by createdAt ascending", async () => {
      const response = await request(app.getHttpServer())
        .get("/v2/me/event-types?sortCreatedAt=asc")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(3);

      expect(new Date(responseBody.data[0].createdAt).valueOf()).toBeLessThan(
        new Date(responseBody.data[1].createdAt).valueOf()
      );
      expect(new Date(responseBody.data[1].createdAt).valueOf()).toBeLessThan(
        new Date(responseBody.data[2].createdAt).valueOf()
      );
    });

    it("should return event types sorted by createdAt descending", async () => {
      const response = await request(app.getHttpServer())
        .get("/v2/me/event-types?sortCreatedAt=desc")
        .set(CAL_API_VERSION_HEADER, VERSION_2024_06_14)
        .expect(200);

      const responseBody: ApiSuccessResponse<EventTypeOutput_2024_06_14[]> = response.body;

      expect(responseBody.status).toEqual(SUCCESS_STATUS);
      expect(responseBody.data).toBeDefined();
      expect(responseBody.data?.length).toEqual(3);

      expect(new Date(responseBody.data[0].createdAt).valueOf()).toBeGreaterThan(
        new Date(responseBody.data[1].createdAt).valueOf()
      );
      expect(new Date(responseBody.data[1].createdAt).valueOf()).toBeGreaterThan(
        new Date(responseBody.data[2].createdAt).valueOf()
      );
    });

    afterAll(async () => {
      await eventTypesRepositoryFixture.deleteAllUserEventTypes(user.id);
      await userRepositoryFixture.delete(user.id);
      await organizationsRepositoryFixture.delete(org.id);
      await app.close();
    });
  });
});
