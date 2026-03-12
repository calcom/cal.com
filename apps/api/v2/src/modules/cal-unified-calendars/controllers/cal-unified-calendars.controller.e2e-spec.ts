import type { User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { randomString } from "test/utils/randomString";
import { withApiAuth } from "test/utils/withApiAuth";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";

describe("CalUnifiedCalendarsController (e2e)", () => {
  let app: INestApplication;
  let userRepositoryFixture: UserRepositoryFixture;

  let user: User;
  const userEmail = `cal-unified-calendars-controller-e2e-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await withApiAuth(
      userEmail,
      Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      })
    ).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);

    user = await userRepositoryFixture.create({
      email: userEmail,
      username: userEmail,
    });

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  describe("GET /v2/calendars/:calendar/event/:eventUid", () => {
    it("should return 400 for non-Google calendar", () => {
      return request(app.getHttpServer())
        .get("/api/v2/calendars/outlook/event/test-event-uid")
        .expect(400)
        .then((res) => {
          expect(res.body.error.message).toContain("Google Calendar");
        });
    });

    it("should return 404 for non-existent event on Google calendar", () => {
      return request(app.getHttpServer())
        .get("/api/v2/calendars/google/event/non-existent-event-uid")
        .expect(404);
    });
  });

  describe("PATCH /v2/calendars/:calendar/events/:eventUid", () => {
    it("should return 400 for non-Google calendar", () => {
      return request(app.getHttpServer())
        .patch("/api/v2/calendars/outlook/events/test-event-uid")
        .send({ summary: "Updated event" })
        .expect(400)
        .then((res) => {
          expect(res.body.error.message).toContain("Google Calendar");
        });
    });

    it("should return 404 for non-existent event on Google calendar", () => {
      return request(app.getHttpServer())
        .patch("/api/v2/calendars/google/events/non-existent-event-uid")
        .send({ summary: "Updated event" })
        .expect(404);
    });
  });

  describe("Unauthenticated requests", () => {
    it("should return 401 for unauthenticated GET request", async () => {
      const unauthModuleRef = await Test.createTestingModule({
        imports: [AppModule, PrismaModule, UsersModule, TokensModule],
      }).compile();
      const unauthApp = unauthModuleRef.createNestApplication();
      bootstrap(unauthApp as NestExpressApplication);
      await unauthApp.init();

      await request(unauthApp.getHttpServer())
        .get("/api/v2/calendars/google/event/test-event-uid")
        .expect(401);

      await unauthApp.close();
    });
  });

  afterAll(async () => {
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
